package managed

import (
	"context"
	"encoding/json"
	"errors"
	"os"
	"path/filepath"
	"reflect"
	"runtime"
	"strings"
	"testing"
	"time"

	cliappadapters "github.com/open-console/console-platform/internal/app/cliapp/adapters"
	appconfig "github.com/open-console/console-platform/internal/config"
)

type ProcessInfo = cliappadapters.ProcessInfo
type ProcessStartRequest = cliappadapters.ProcessStartRequest
type ControlRequest = cliappadapters.ControlRequest

const (
	RuntimeDirEnvName        = cliappadapters.RuntimeDirEnvName
	ManagedServiceEnvName    = cliappadapters.ManagedServiceEnvName
	ManagedServiceNameEnvKey = cliappadapters.ManagedServiceNameEnvKey
	controlActionStop        = cliappadapters.ControlActionStop
)

var coreSecretPaths = []string{
	"auth.signing_key",
	"auth.refresh_token_pepper",
	"auth.mfa_secret_key",
}

// TestManagerStartServerPersistsStateAndLaunchesManagedProcess 固定后台启动写入运行态并派生 server 子进程。
func TestManagerStartServerPersistsStateAndLaunchesManagedProcess(t *testing.T) {
	runner := &fakeProcessRunner{
		startInfos:     []ProcessInfo{{PID: 321, ProcessStartTime: 12345}},
		runningResults: []bool{true, true},
	}
	manager := testManager(t, runner)
	configPath := copyExampleConfig(t)

	state, err := manager.StartServer(context.Background(), configPath)
	if err != nil {
		t.Fatalf("StartServer() error = %v", err)
	}

	if state.Status != StatusRunning {
		t.Fatalf("status = %q, want %q", state.Status, StatusRunning)
	}
	if state.PID != 321 || state.ProcessStartTime != 12345 {
		t.Fatalf("process info = pid %d start %d", state.PID, state.ProcessStartTime)
	}
	if state.ConfigPath != filepath.Clean(configPath) {
		t.Fatalf("config path = %q, want %q", state.ConfigPath, filepath.Clean(configPath))
	}
	if !strings.HasSuffix(filepath.ToSlash(state.StdoutLogPath), "/server/stdout.log") {
		t.Fatalf("stdout log path = %q", state.StdoutLogPath)
	}
	if !strings.HasSuffix(filepath.ToSlash(state.StderrLogPath), "/server/stderr.log") {
		t.Fatalf("stderr log path = %q", state.StderrLogPath)
	}

	if len(runner.starts) != 1 {
		t.Fatalf("StartProcess calls = %d, want 1", len(runner.starts))
	}
	start := runner.starts[0]
	if start.Executable != manager.Executable {
		t.Fatalf("executable = %q, want %q", start.Executable, manager.Executable)
	}
	if state.ExecutablePath != manager.Executable {
		t.Fatalf("executable path = %q, want %q", state.ExecutablePath, manager.Executable)
	}
	wantArgs := []string{"server", "--config", filepath.Clean(configPath)}
	if !reflect.DeepEqual(start.Args, wantArgs) {
		t.Fatalf("args = %#v, want %#v", start.Args, wantArgs)
	}
	for _, want := range []string{ManagedServiceEnvName + "=1", ManagedServiceNameEnvKey + "=" + ServiceServer, RuntimeDirEnvName + "="} {
		if !envContainsPrefix(start.Env, want) {
			t.Fatalf("env missing prefix %q: %#v", want, start.Env)
		}
	}

	persisted, err := manager.readState(ServiceServer)
	if err != nil {
		t.Fatalf("readState() error = %v", err)
	}
	if persisted.Status != StatusRunning || persisted.PID != 321 {
		t.Fatalf("persisted state = %#v", persisted)
	}
	if persisted.ExecutablePath != manager.Executable {
		t.Fatalf("persisted executable path = %q, want %q", persisted.ExecutablePath, manager.Executable)
	}

	refreshed, err := manager.Status(context.Background(), ServiceServer)
	if err != nil {
		t.Fatalf("Status() error = %v", err)
	}
	if refreshed.Status != StatusRunning {
		t.Fatalf("refreshed status = %q", refreshed.Status)
	}
}

func TestManagerStartServerCopiesGoRunTemporaryExecutable(t *testing.T) {
	exeName := "main"
	if runtime.GOOS == "windows" {
		exeName += ".exe"
	}
	source := filepath.Join(t.TempDir(), "go-build123456789", "b001", "exe", exeName)
	if err := os.MkdirAll(filepath.Dir(source), 0o755); err != nil {
		t.Fatalf("create temp exe dir: %v", err)
	}
	if err := os.WriteFile(source, []byte("managed executable"), 0o755); err != nil {
		t.Fatalf("write temp exe: %v", err)
	}

	runner := &fakeProcessRunner{
		startInfos:     []ProcessInfo{{PID: 654, ProcessStartTime: 98765}},
		runningResults: []bool{true, true},
	}
	manager := testManager(t, runner)
	manager.Executable = source
	configPath := copyExampleConfig(t)

	state, err := manager.StartServer(context.Background(), configPath)
	if err != nil {
		t.Fatalf("StartServer() error = %v", err)
	}

	wantExecutable := filepath.Join(manager.RuntimeDir, "bin", managedExecutableFileName(source))
	if len(runner.starts) != 1 {
		t.Fatalf("StartProcess calls = %d, want 1", len(runner.starts))
	}
	if runner.starts[0].Executable != wantExecutable {
		t.Fatalf("managed executable = %q, want %q", runner.starts[0].Executable, wantExecutable)
	}
	if state.ExecutablePath != wantExecutable {
		t.Fatalf("state executable path = %q, want %q", state.ExecutablePath, wantExecutable)
	}
	raw, err := os.ReadFile(wantExecutable)
	if err != nil {
		t.Fatalf("read managed executable: %v", err)
	}
	if string(raw) != "managed executable" {
		t.Fatalf("managed executable content = %q", raw)
	}

	persisted, err := manager.readState(ServiceServer)
	if err != nil {
		t.Fatalf("readState() error = %v", err)
	}
	if persisted.ExecutablePath != wantExecutable {
		t.Fatalf("persisted executable path = %q, want %q", persisted.ExecutablePath, wantExecutable)
	}
}

func TestManagerStartServerReturnsControlRemoveErrorBeforeLaunch(t *testing.T) {
	runner := &fakeProcessRunner{}
	manager := testManager(t, runner)
	configPath := copyExampleConfig(t)
	controlPath := manager.controlPath(ServiceServer)
	if err := os.MkdirAll(controlPath, 0o755); err != nil {
		t.Fatalf("create control dir: %v", err)
	}
	if err := os.WriteFile(filepath.Join(controlPath, "child.json"), []byte("{}"), 0o644); err != nil {
		t.Fatalf("write child control marker: %v", err)
	}

	state, err := manager.StartServer(context.Background(), configPath)
	if err == nil {
		t.Fatal("StartServer() error = nil, want control removal error")
	}
	if !strings.Contains(err.Error(), "remove managed service control file") {
		t.Fatalf("StartServer() error missing control removal context: %v", err)
	}
	if state.Status != StatusFailed || state.LastError == "" {
		t.Fatalf("state = %#v, want failed state with last error", state)
	}
	if state.StartedAt != nil {
		t.Fatalf("StartedAt = %v, want nil before process launch", state.StartedAt)
	}
	if len(runner.starts) != 0 {
		t.Fatalf("StartProcess calls = %d, want 0", len(runner.starts))
	}
	persisted, err := manager.readState(ServiceServer)
	if err != nil {
		t.Fatalf("readState() error = %v", err)
	}
	if persisted.Status != StatusFailed || persisted.LastError == "" {
		t.Fatalf("persisted state = %#v, want failed state", persisted)
	}
}

func TestManagerStartServerReturnsStartupProcessCheckError(t *testing.T) {
	checkErr := errors.New("process table unavailable")
	runner := &fakeProcessRunner{
		startInfos:    []ProcessInfo{{PID: 432, ProcessStartTime: 54321}},
		runningErrors: []error{checkErr},
	}
	manager := testManager(t, runner)
	configPath := copyExampleConfig(t)

	state, err := manager.StartServer(context.Background(), configPath)

	if err == nil {
		t.Fatal("StartServer() error = nil, want process check error")
	}
	if !errors.Is(err, checkErr) {
		t.Fatalf("StartServer() error should preserve process check error, got %v", err)
	}
	if !strings.Contains(err.Error(), "verify managed service process after startup") {
		t.Fatalf("StartServer() error missing process check context: %v", err)
	}
	if state.Status != StatusFailed || !strings.Contains(state.LastError, "verify managed service process after startup") {
		t.Fatalf("state = %#v, want failed state with process check error", state)
	}
	if state.PID != 432 || state.ProcessStartTime != 54321 {
		t.Fatalf("state process info = pid %d start %d", state.PID, state.ProcessStartTime)
	}
	if len(runner.checks) != 1 || runner.checks[0].PID != 432 {
		t.Fatalf("process checks = %#v, want one check for started process", runner.checks)
	}
	persisted, err := manager.readState(ServiceServer)
	if err != nil {
		t.Fatalf("readState() error = %v", err)
	}
	if persisted.Status != StatusFailed || !strings.Contains(persisted.LastError, "verify managed service process after startup") {
		t.Fatalf("persisted state = %#v, want failed state with process check error", persisted)
	}
}

// TestManagerStatusMarksDeadActiveProcessFailed 固定 PID 创建时间校验失败时不误判为运行中。
func TestManagerStatusMarksDeadActiveProcessFailed(t *testing.T) {
	runner := &fakeProcessRunner{runningResults: []bool{false}}
	manager := testManager(t, runner)
	startedAt := time.Date(2026, 6, 13, 1, 2, 3, 0, time.UTC)
	if err := manager.writeState(ServiceState{
		Service:          ServiceServer,
		Status:           StatusRunning,
		PID:              88,
		ProcessStartTime: 9900,
		StartedAt:        &startedAt,
	}); err != nil {
		t.Fatalf("writeState() error = %v", err)
	}

	state, err := manager.Status(context.Background(), ServiceServer)
	if err != nil {
		t.Fatalf("Status() error = %v", err)
	}
	if state.Status != StatusFailed {
		t.Fatalf("status = %q, want %q", state.Status, StatusFailed)
	}
	if state.PID != 0 || state.ProcessStartTime != 0 {
		t.Fatalf("expected process info cleared, got pid=%d start=%d", state.PID, state.ProcessStartTime)
	}
	if state.LastError != "process is not running" {
		t.Fatalf("lastError = %q", state.LastError)
	}
	if len(runner.checks) != 1 || runner.checks[0].ProcessStartTime != 9900 {
		t.Fatalf("process checks = %#v", runner.checks)
	}
}

func TestManagerStatusReturnsWriteErrorWhenRefreshingRunningStateFails(t *testing.T) {
	runner := &fakeProcessRunner{runningResults: []bool{true}}
	manager := testManager(t, runner)
	if err := manager.writeState(ServiceState{
		Service:          ServiceServer,
		Status:           StatusStarting,
		PID:              88,
		ProcessStartTime: 9900,
	}); err != nil {
		t.Fatalf("writeState() error = %v", err)
	}
	runner.onCheck = func(ProcessInfo, int) {
		if err := os.Remove(manager.statePath(ServiceServer)); err != nil {
			t.Fatalf("remove state file: %v", err)
		}
		if err := os.Remove(manager.serviceDir(ServiceServer)); err != nil {
			t.Fatalf("remove service dir: %v", err)
		}
		if err := os.WriteFile(manager.serviceDir(ServiceServer), []byte("not a directory"), 0o644); err != nil {
			t.Fatalf("replace service dir with file: %v", err)
		}
	}

	state, err := manager.Status(context.Background(), ServiceServer)
	if err == nil {
		t.Fatal("Status() error = nil, want state persistence error")
	}
	if !strings.Contains(err.Error(), "persist managed service state") {
		t.Fatalf("Status() error missing persistence context: %v", err)
	}
	if state.Status != StatusRunning {
		t.Fatalf("state status = %q, want %q", state.Status, StatusRunning)
	}
}

func TestManagerWriteStateReturnsExistingStateRemoveError(t *testing.T) {
	manager := testManager(t, &fakeProcessRunner{})
	if err := manager.writeState(ServiceState{Service: ServiceServer, Status: StatusStopped}); err != nil {
		t.Fatalf("writeState() error = %v", err)
	}
	statePath := manager.statePath(ServiceServer)
	if err := os.Remove(statePath); err != nil {
		t.Fatalf("remove initial state file: %v", err)
	}
	if err := os.MkdirAll(statePath, 0o755); err != nil {
		t.Fatalf("create blocking state dir: %v", err)
	}
	if err := os.WriteFile(filepath.Join(statePath, "child.json"), []byte("{}"), 0o644); err != nil {
		t.Fatalf("write blocking state child: %v", err)
	}

	err := manager.writeState(ServiceState{Service: ServiceServer, Status: StatusRunning})

	if err == nil {
		t.Fatal("writeState() error = nil, want state removal error")
	}
	if !strings.Contains(err.Error(), "remove managed service state file") {
		t.Fatalf("writeState() error missing state removal context: %v", err)
	}
	if _, statErr := os.Stat(statePath + ".tmp"); !errors.Is(statErr, os.ErrNotExist) {
		t.Fatalf("state temp file should be cleaned, stat error = %v", statErr)
	}
}

func TestManagedStateTempCleanupErrorJoinsCleanupFailure(t *testing.T) {
	primary := errors.New("replace failed")
	tmp := filepath.Join(t.TempDir(), "state.json.tmp")
	if err := os.MkdirAll(tmp, 0o755); err != nil {
		t.Fatalf("create temp dir: %v", err)
	}
	if err := os.WriteFile(filepath.Join(tmp, "child.json"), []byte("{}"), 0o644); err != nil {
		t.Fatalf("write temp child: %v", err)
	}

	err := withManagedStateTempCleanup(primary, tmp)

	if !errors.Is(err, primary) {
		t.Fatalf("expected primary error in result, got %v", err)
	}
	if !strings.Contains(err.Error(), "remove managed service state temp file") {
		t.Fatalf("expected temp cleanup context, got %v", err)
	}
}

// TestManagerStopServerWritesControlAndClearsStateWhenProcessExits 固定停止流程先写 control，再等待进程退出。
func TestManagerStopServerWritesControlAndClearsStateWhenProcessExits(t *testing.T) {
	runner := &fakeProcessRunner{runningResults: []bool{true, false}}
	manager := testManager(t, runner)
	var captured ControlRequest
	runner.onCheck = func(_ ProcessInfo, call int) {
		if call != 2 {
			return
		}
		raw, err := os.ReadFile(manager.controlPath(ServiceServer))
		if err != nil {
			t.Fatalf("read control file: %v", err)
		}
		if err := json.Unmarshal(raw, &captured); err != nil {
			t.Fatalf("decode control file: %v", err)
		}
	}

	startedAt := time.Date(2026, 6, 13, 1, 2, 3, 0, time.UTC)
	if err := manager.writeState(ServiceState{
		Service:          ServiceServer,
		Status:           StatusRunning,
		PID:              98,
		ProcessStartTime: 123456,
		StartedAt:        &startedAt,
		ConfigPath:       "configs/config.yaml",
	}); err != nil {
		t.Fatalf("writeState() error = %v", err)
	}

	state, err := manager.StopServer(context.Background())
	if err != nil {
		t.Fatalf("StopServer() error = %v", err)
	}
	if state.Status != StatusStopped {
		t.Fatalf("status = %q, want %q", state.Status, StatusStopped)
	}
	if state.PID != 0 || state.ProcessStartTime != 0 {
		t.Fatalf("expected process info cleared, got pid=%d start=%d", state.PID, state.ProcessStartTime)
	}
	if len(runner.kills) != 0 {
		t.Fatalf("KillProcess calls = %#v", runner.kills)
	}
	if captured.Service != ServiceServer || captured.Action != controlActionStop || captured.PID != 98 || captured.ProcessStartTime != 123456 {
		t.Fatalf("control request = %#v", captured)
	}
	if _, err := os.Stat(manager.controlPath(ServiceServer)); !errors.Is(err, os.ErrNotExist) {
		t.Fatalf("control file should be removed after stop, err=%v", err)
	}
}

func TestManagerStatusDetectsUnmanagedConsoleServerListener(t *testing.T) {
	runner := &fakeProcessRunner{
		listener: &cliappadapters.ProcessDetails{
			ProcessInfo: cliappadapters.ProcessInfo{PID: 777, ProcessStartTime: 888},
			Executable:  filepath.Join("tmp", "console.exe"),
			CommandLine: "console.exe server --config configs/config.local.yaml",
		},
	}
	manager := testManager(t, runner)
	if err := manager.writeState(ServiceState{
		Service:    ServiceServer,
		Status:     StatusStopped,
		ConfigPath: "configs/config.local.yaml",
		ListenAddr: "127.0.0.1:9999",
	}); err != nil {
		t.Fatalf("writeState() error = %v", err)
	}

	state, err := manager.Status(context.Background(), ServiceServer)
	if err != nil {
		t.Fatalf("Status() error = %v", err)
	}
	if state.Status != StatusUnmanaged || !state.Unmanaged {
		t.Fatalf("status = %q unmanaged=%v, want %q true", state.Status, state.Unmanaged, StatusUnmanaged)
	}
	if state.PID != 777 || state.ProcessStartTime != 888 {
		t.Fatalf("process info = pid %d start %d", state.PID, state.ProcessStartTime)
	}
	if len(runner.listenerChecks) != 1 || runner.listenerChecks[0] != "127.0.0.1:9999" {
		t.Fatalf("listener checks = %#v", runner.listenerChecks)
	}
}

func TestManagerStatusReturnsUnmanagedListenerProbeError(t *testing.T) {
	listenerErr := errors.New("tcp listener probe unavailable")
	runner := &fakeProcessRunner{listenerErr: listenerErr}
	manager := testManager(t, runner)
	if err := manager.writeState(ServiceState{
		Service:    ServiceServer,
		Status:     StatusStopped,
		ConfigPath: "configs/config.local.yaml",
		ListenAddr: "127.0.0.1:9999",
	}); err != nil {
		t.Fatalf("writeState() error = %v", err)
	}

	state, err := manager.Status(context.Background(), ServiceServer)

	if !errors.Is(err, listenerErr) {
		t.Fatalf("Status() error = %v, want %v", err, listenerErr)
	}
	if !strings.Contains(err.Error(), "detect unmanaged server listener on 127.0.0.1:9999") {
		t.Fatalf("Status() error missing listener context: %v", err)
	}
	if state.Status != StatusStopped {
		t.Fatalf("state status = %q, want %q", state.Status, StatusStopped)
	}
	if len(runner.listenerChecks) != 1 || runner.listenerChecks[0] != "127.0.0.1:9999" {
		t.Fatalf("listener checks = %#v", runner.listenerChecks)
	}
}

func TestManagerStopServerStopsUnmanagedConsoleServerListener(t *testing.T) {
	runner := &fakeProcessRunner{
		listener: &cliappadapters.ProcessDetails{
			ProcessInfo: cliappadapters.ProcessInfo{PID: 778, ProcessStartTime: 889},
			Executable:  filepath.Join("tmp", "console.exe"),
			CommandLine: "console.exe server --config configs/config.local.yaml",
		},
		runningResults: []bool{false},
	}
	manager := testManager(t, runner)
	if err := manager.writeState(ServiceState{
		Service:    ServiceServer,
		Status:     StatusStopped,
		ConfigPath: "configs/config.local.yaml",
		ListenAddr: "127.0.0.1:9999",
	}); err != nil {
		t.Fatalf("writeState() error = %v", err)
	}

	state, err := manager.StopServer(context.Background())
	if err != nil {
		t.Fatalf("StopServer() error = %v", err)
	}
	if state.Status != StatusStopped || state.PID != 0 || state.Unmanaged {
		t.Fatalf("state = %#v, want stopped managed state without pid", state)
	}
	if len(runner.kills) != 1 || runner.kills[0].PID != 778 || runner.kills[0].ProcessStartTime != 889 {
		t.Fatalf("process kills = %#v", runner.kills)
	}
	if len(runner.checks) != 0 {
		t.Fatalf("process checks = %#v, want none for unmanaged fast stop", runner.checks)
	}
	if state.LastError != "" {
		t.Fatalf("lastError = %q, want empty after successful unmanaged stop", state.LastError)
	}
	if _, err := os.Stat(manager.controlPath(ServiceServer)); !errors.Is(err, os.ErrNotExist) {
		t.Fatalf("control file should be removed after unmanaged stop, err=%v", err)
	}
	persisted, err := manager.readState(ServiceServer)
	if err != nil {
		t.Fatalf("readState() error = %v", err)
	}
	if persisted.Status != StatusStopped || persisted.PID != 0 || persisted.Unmanaged {
		t.Fatalf("persisted state = %#v, want stopped without unmanaged marker", persisted)
	}
}

func TestManagerStopServerReturnsControlRemoveErrorAfterUnmanagedStop(t *testing.T) {
	runner := &fakeProcessRunner{
		listener: &cliappadapters.ProcessDetails{
			ProcessInfo: cliappadapters.ProcessInfo{PID: 779, ProcessStartTime: 890},
			Executable:  filepath.Join("tmp", "console.exe"),
			CommandLine: "console.exe server --config configs/config.local.yaml",
		},
	}
	manager := testManager(t, runner)
	if err := manager.writeState(ServiceState{
		Service:    ServiceServer,
		Status:     StatusStopped,
		ConfigPath: "configs/config.local.yaml",
		ListenAddr: "127.0.0.1:9999",
	}); err != nil {
		t.Fatalf("writeState() error = %v", err)
	}
	controlPath := manager.controlPath(ServiceServer)
	if err := os.MkdirAll(controlPath, 0o755); err != nil {
		t.Fatalf("create control dir: %v", err)
	}
	if err := os.WriteFile(filepath.Join(controlPath, "child.json"), []byte("{}"), 0o644); err != nil {
		t.Fatalf("write child control marker: %v", err)
	}

	state, err := manager.StopServer(context.Background())
	if err == nil {
		t.Fatal("StopServer() error = nil, want control removal error")
	}
	if !strings.Contains(err.Error(), "remove managed service control file") {
		t.Fatalf("StopServer() error missing control removal context: %v", err)
	}
	if state.Status != StatusStopped || state.PID != 0 || state.Unmanaged {
		t.Fatalf("state = %#v, want stopped managed state without pid", state)
	}
	if len(runner.kills) != 1 || runner.kills[0].PID != 779 {
		t.Fatalf("process kills = %#v", runner.kills)
	}
	persisted, err := manager.readState(ServiceServer)
	if err != nil {
		t.Fatalf("readState() error = %v", err)
	}
	if persisted.Status != StatusStopped || persisted.PID != 0 || persisted.Unmanaged {
		t.Fatalf("persisted state = %#v, want stopped without unmanaged marker", persisted)
	}
}

// TestManagerRestartServerUsesLastConfig 固定重启沿用上次配置路径并重新启动后台进程。
func TestManagerRestartServerUsesLastConfig(t *testing.T) {
	configPath := copyExampleConfig(t)
	runner := &fakeProcessRunner{
		startInfos:     []ProcessInfo{{PID: 333, ProcessStartTime: 777}},
		runningResults: []bool{true, true, false, true},
	}
	manager := testManager(t, runner)
	if err := manager.writeState(ServiceState{
		Service:          ServiceServer,
		Status:           StatusRunning,
		PID:              98,
		ProcessStartTime: 123456,
		ConfigPath:       configPath,
	}); err != nil {
		t.Fatalf("writeState() error = %v", err)
	}

	state, err := manager.RestartServer(context.Background())
	if err != nil {
		t.Fatalf("RestartServer() error = %v", err)
	}
	if state.Status != StatusRunning || state.PID != 333 {
		t.Fatalf("restart state = %#v", state)
	}
	if len(runner.starts) != 1 {
		t.Fatalf("StartProcess calls = %d, want 1", len(runner.starts))
	}
	wantArgs := []string{"server", "--config", filepath.Clean(configPath)}
	if !reflect.DeepEqual(runner.starts[0].Args, wantArgs) {
		t.Fatalf("restart args = %#v, want %#v", runner.starts[0].Args, wantArgs)
	}
}

func TestManagerStartServerMissingCoreSecretsReturnsActionableError(t *testing.T) {
	unsetCoreSecretEnvForTest(t)
	configPath := copyEnvManagedCoreSecretsConfig(t)
	runner := &fakeProcessRunner{}
	manager := testManager(t, runner)

	state, err := manager.StartServer(context.Background(), configPath)
	if err == nil {
		t.Fatal("StartServer() error = nil, want missing secret error")
	}
	for _, want := range []string{"APP_AUTH_SIGNING_KEY", "`run`", "引导修复流程"} {
		if !strings.Contains(err.Error(), want) {
			t.Fatalf("StartServer() error missing %q:\n%v", want, err)
		}
	}
	if state.Status != StatusFailed || state.LastError == "" {
		t.Fatalf("state = %#v, want failed state with last error", state)
	}
	if len(runner.starts) != 0 {
		t.Fatalf("StartProcess calls = %d, want 0", len(runner.starts))
	}
}

func TestManagerStartServerPreflightReturnsAllBlockingDiagnostics(t *testing.T) {
	unsetPreflightEnvForTest(t)
	configPath := copyProductionConfig(t)
	runner := &fakeProcessRunner{}
	manager := testManager(t, runner)

	state, err := manager.StartServer(context.Background(), configPath)
	if err == nil {
		t.Fatal("StartServer() error = nil, want preflight diagnostics")
	}
	for _, want := range []string{"database.postgres.host", "auth.signing_key", "auth.smtp.host", "`run`", "引导修复流程"} {
		if !strings.Contains(err.Error(), want) {
			t.Fatalf("StartServer() error missing %q:\n%v", want, err)
		}
	}
	if state.Status != StatusFailed || state.LastError == "" {
		t.Fatalf("state = %#v, want failed state with last error", state)
	}
	if len(runner.starts) != 0 {
		t.Fatalf("StartProcess calls = %d, want 0", len(runner.starts))
	}
}

func TestMarkManagedServiceStoppedReturnsStateReadError(t *testing.T) {
	runtimeDir := t.TempDir()
	t.Setenv(ManagedServiceEnvName, "1")
	t.Setenv(RuntimeDirEnvName, runtimeDir)
	stateDir := filepath.Join(runtimeDir, ServiceServer)
	if err := os.MkdirAll(stateDir, 0o755); err != nil {
		t.Fatalf("create state dir: %v", err)
	}
	if err := os.WriteFile(filepath.Join(stateDir, "state.json"), []byte("{broken"), 0o644); err != nil {
		t.Fatalf("write broken state: %v", err)
	}

	err := MarkManagedServiceStopped(ServiceServer, "server failed")
	if err == nil {
		t.Fatal("MarkManagedServiceStopped() error = nil, want state read error")
	}
}

func TestManagedStateWriteErrorJoinsCauseAndPersistenceError(t *testing.T) {
	cause := errors.New("operation failed")
	persistErr := errors.New("state write failed")

	err := managedStateWriteError(cause, persistErr)

	if !errors.Is(err, cause) {
		t.Fatalf("expected operation error in result, got %v", err)
	}
	if !errors.Is(err, persistErr) {
		t.Fatalf("expected persistence error in result, got %v", err)
	}
	if !strings.Contains(err.Error(), "persist managed service state") {
		t.Fatalf("expected persistence context, got %v", err)
	}
}

func testManager(t *testing.T, runner *fakeProcessRunner) *Manager {
	t.Helper()
	return &Manager{
		RuntimeDir: filepath.Join(t.TempDir(), "runtime"),
		Executable: filepath.Join(t.TempDir(), "bin-test"),
		WorkDir:    t.TempDir(),
		Runner:     runner,
		Now: func() time.Time {
			return time.Date(2026, 6, 13, 1, 2, 3, 0, time.UTC)
		},
	}
}

func copyExampleConfig(t *testing.T) string {
	t.Helper()
	_, file, _, ok := runtime.Caller(0)
	if !ok {
		t.Fatal("runtime.Caller failed")
	}
	root := filepath.Clean(filepath.Join(filepath.Dir(file), "..", "..", "..", "..", ".."))
	raw, err := os.ReadFile(filepath.Join(root, "configs", "config.example.yaml"))
	if err != nil {
		t.Fatalf("read config example: %v", err)
	}
	path := filepath.Join(t.TempDir(), "config.yaml")
	if err := os.WriteFile(path, raw, 0o644); err != nil {
		t.Fatalf("write temp config: %v", err)
	}
	return path
}

func copyProductionConfig(t *testing.T) string {
	t.Helper()
	_, file, _, ok := runtime.Caller(0)
	if !ok {
		t.Fatal("runtime.Caller failed")
	}
	root := filepath.Clean(filepath.Join(filepath.Dir(file), "..", "..", "..", "..", ".."))
	raw, err := os.ReadFile(filepath.Join(root, "deploy", "config.production.example.yaml"))
	if err != nil {
		t.Fatalf("read production config example: %v", err)
	}
	path := filepath.Join(t.TempDir(), "config.yaml")
	if err := os.WriteFile(path, raw, 0o644); err != nil {
		t.Fatalf("write temp production config: %v", err)
	}
	return path
}

func copyEnvManagedCoreSecretsConfig(t *testing.T) string {
	t.Helper()
	path := copyExampleConfig(t)
	raw, err := os.ReadFile(path)
	if err != nil {
		t.Fatalf("read temp config: %v", err)
	}
	replacements := map[string]string{
		"signing_key: ${AUTH_SIGNING_KEY:dev-signing-key-change-me-32-bytes}":                "signing_key: ${APP_AUTH_SIGNING_KEY}",
		"refresh_token_pepper: ${AUTH_REFRESH_TOKEN_PEPPER:dev-refresh-pepper-change-me-32}": "refresh_token_pepper: ${APP_AUTH_REFRESH_TOKEN_PEPPER}",
		"mfa_secret_key: ${AUTH_MFA_SECRET_KEY:dev-mfa-secret-key-change-me-32-bytes}":       "mfa_secret_key: ${APP_AUTH_MFA_SECRET_KEY}",
	}
	text := string(raw)
	for oldValue, newValue := range replacements {
		next := strings.Replace(text, oldValue, newValue, 1)
		if next == text {
			t.Fatalf("config copy did not contain %q", oldValue)
		}
		text = next
	}
	if err := os.WriteFile(path, []byte(text), 0o644); err != nil {
		t.Fatalf("write env managed core secrets config: %v", err)
	}
	return path
}

func unsetEnvForTest(t *testing.T, keys ...string) {
	t.Helper()
	for _, key := range keys {
		key := key
		oldValue, existed := os.LookupEnv(key)
		if err := os.Unsetenv(key); err != nil {
			t.Fatalf("unset %s: %v", key, err)
		}
		t.Cleanup(func() {
			if existed {
				if err := os.Setenv(key, oldValue); err != nil {
					t.Errorf("restore %s: %v", key, err)
				}
				return
			}
			if err := os.Unsetenv(key); err != nil {
				t.Errorf("restore unset %s: %v", key, err)
			}
		})
	}
}

func unsetCoreSecretEnvForTest(t *testing.T) {
	t.Helper()
	for _, path := range coreSecretPaths {
		unsetEnvForTest(t, appconfig.EnvNamesForPath(path)...)
	}
}

func unsetPreflightEnvForTest(t *testing.T) {
	t.Helper()
	for _, path := range []string{
		"database.driver",
		"database.postgres.host",
		"database.postgres.port",
		"database.postgres.username",
		"database.postgres.database",
		"auth.signing_key",
		"auth.refresh_token_pepper",
		"auth.mfa_secret_key",
		"auth.notification_driver",
		"auth.smtp.host",
		"auth.smtp.port",
		"auth.smtp.from",
	} {
		unsetEnvForTest(t, appconfig.EnvNamesForPath(path)...)
	}
}

func envContainsPrefix(values []string, prefix string) bool {
	for _, value := range values {
		if strings.HasPrefix(value, prefix) {
			return true
		}
	}
	return false
}

type fakeProcessRunner struct {
	startInfos     []ProcessInfo
	runningResults []bool
	runningErrors  []error
	starts         []ProcessStartRequest
	checks         []ProcessInfo
	kills          []ProcessInfo
	listener       *cliappadapters.ProcessDetails
	listenerErr    error
	listenerChecks []string
	onCheck        func(ProcessInfo, int)
}

func (f *fakeProcessRunner) StartProcess(req ProcessStartRequest) (ProcessInfo, error) {
	f.starts = append(f.starts, req)
	if len(f.startInfos) == 0 {
		return ProcessInfo{PID: 100 + len(f.starts), ProcessStartTime: int64(1000 + len(f.starts))}, nil
	}
	info := f.startInfos[0]
	f.startInfos = f.startInfos[1:]
	return info, nil
}

func (f *fakeProcessRunner) IsProcessRunning(info ProcessInfo) (bool, error) {
	f.checks = append(f.checks, info)
	if f.onCheck != nil {
		f.onCheck(info, len(f.checks))
	}
	if len(f.runningErrors) > 0 {
		err := f.runningErrors[0]
		f.runningErrors = f.runningErrors[1:]
		return false, err
	}
	if len(f.runningResults) == 0 {
		return true, nil
	}
	running := f.runningResults[0]
	f.runningResults = f.runningResults[1:]
	return running, nil
}

func (f *fakeProcessRunner) KillProcess(info ProcessInfo) error {
	f.kills = append(f.kills, info)
	return nil
}

func (f *fakeProcessRunner) FindTCPListener(addr string) (cliappadapters.ProcessDetails, bool, error) {
	f.listenerChecks = append(f.listenerChecks, addr)
	if f.listenerErr != nil {
		return cliappadapters.ProcessDetails{}, false, f.listenerErr
	}
	if f.listener == nil {
		return cliappadapters.ProcessDetails{}, false, nil
	}
	return *f.listener, true, nil
}
