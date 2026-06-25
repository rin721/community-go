package adapters

import (
	"errors"
	"os"
	"strings"
	"testing"
	"time"
)

func TestKillProcessReturnsFindProcessError(t *testing.T) {
	findErr := errors.New("process table unavailable")
	oldFindProcess := findProcess
	findProcess = func(int) (*os.Process, error) {
		return nil, findErr
	}
	t.Cleanup(func() {
		findProcess = oldFindProcess
	})

	err := osProcessRunner{}.KillProcess(ProcessInfo{PID: 12345, ProcessStartTime: 67890})
	if !errors.Is(err, findErr) {
		t.Fatalf("KillProcess() error = %v, want %v", err, findErr)
	}
	if !strings.Contains(err.Error(), "find process 12345") {
		t.Fatalf("KillProcess() error missing process context: %v", err)
	}
}

func TestStartProcessReturnsCreateTimeErrorAndKillsStartedProcess(t *testing.T) {
	createTimeErr := errors.New("create time unavailable")
	oldLookupProcessCreateTime := lookupProcessCreateTime
	oldKillStartedProcess := killStartedProcess
	lookupProcessCreateTime = func(int) (int64, error) {
		return 0, createTimeErr
	}
	killCalled := false
	killStartedProcess = func(proc *os.Process) error {
		killCalled = true
		return oldKillStartedProcess(proc)
	}
	t.Cleanup(func() {
		lookupProcessCreateTime = oldLookupProcessCreateTime
		killStartedProcess = oldKillStartedProcess
	})

	info, err := osProcessRunner{}.StartProcess(helperProcessStartRequest(t))

	if info.PID <= 0 {
		t.Fatalf("StartProcess() pid = %d, want started process pid in error result", info.PID)
	}
	if !errors.Is(err, createTimeErr) {
		t.Fatalf("StartProcess() error = %v, want %v", err, createTimeErr)
	}
	if !strings.Contains(err.Error(), "resolve managed process create time") {
		t.Fatalf("StartProcess() error missing create time context: %v", err)
	}
	if !killCalled {
		t.Fatal("StartProcess() did not kill started process after create time failure")
	}
}

func TestStartProcessReturnsReleaseErrorAndKillsStartedProcess(t *testing.T) {
	releaseErr := errors.New("release failed")
	oldLookupProcessCreateTime := lookupProcessCreateTime
	oldReleaseProcess := releaseProcess
	oldKillStartedProcess := killStartedProcess
	lookupProcessCreateTime = func(int) (int64, error) {
		return 123456789, nil
	}
	releaseProcess = func(*os.Process) error {
		return releaseErr
	}
	killCalled := false
	killStartedProcess = func(proc *os.Process) error {
		killCalled = true
		return oldKillStartedProcess(proc)
	}
	t.Cleanup(func() {
		lookupProcessCreateTime = oldLookupProcessCreateTime
		releaseProcess = oldReleaseProcess
		killStartedProcess = oldKillStartedProcess
	})

	info, err := osProcessRunner{}.StartProcess(helperProcessStartRequest(t))

	if info.PID <= 0 || info.ProcessStartTime != 123456789 {
		t.Fatalf("StartProcess() info = %#v, want started process info in error result", info)
	}
	if !errors.Is(err, releaseErr) {
		t.Fatalf("StartProcess() error = %v, want %v", err, releaseErr)
	}
	if !strings.Contains(err.Error(), "release managed process handle") {
		t.Fatalf("StartProcess() error missing release context: %v", err)
	}
	if !killCalled {
		t.Fatal("StartProcess() did not kill started process after release failure")
	}
}

func TestProcessCreateTimeReturnsUnavailableErrorForZeroTimestamp(t *testing.T) {
	oldReadProcessCreateTime := readProcessCreateTime
	readProcessCreateTime = func(int) (int64, error) {
		return 0, nil
	}
	t.Cleanup(func() {
		readProcessCreateTime = oldReadProcessCreateTime
	})

	createTime, err := processCreateTime(2468)

	if createTime != 0 {
		t.Fatalf("processCreateTime() = %d, want 0 on unavailable timestamp", createTime)
	}
	if err == nil {
		t.Fatal("processCreateTime() error = nil, want unavailable timestamp error")
	}
	if !strings.Contains(err.Error(), "process 2468 create time is not available") {
		t.Fatalf("processCreateTime() error missing pid context: %v", err)
	}
}

func TestFindTCPListenerReturnsProcessMetadataErrors(t *testing.T) {
	tests := []struct {
		name      string
		setup     func(error)
		want      string
		wantStage string
	}{
		{
			name: "create time",
			setup: func(wantErr error) {
				lookupProcessCreateTime = func(int) (int64, error) {
					return 0, wantErr
				}
			},
			want:      "create time unavailable",
			wantStage: "resolve listener process create time 2468",
		},
		{
			name: "executable",
			setup: func(wantErr error) {
				lookupProcessExecutable = func(int) (string, error) {
					return "", wantErr
				}
			},
			want:      "executable unavailable",
			wantStage: "resolve listener process executable 2468",
		},
		{
			name: "command line",
			setup: func(wantErr error) {
				lookupProcessCommandLine = func(int) (string, error) {
					return "", wantErr
				}
			},
			want:      "command line unavailable",
			wantStage: "resolve listener process command line 2468",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			oldLookupTCPListenerPID := lookupTCPListenerPID
			oldLookupProcessCreateTime := lookupProcessCreateTime
			oldLookupProcessExecutable := lookupProcessExecutable
			oldLookupProcessCommandLine := lookupProcessCommandLine
			wantErr := errors.New(tt.want)
			lookupTCPListenerPID = func(string) (int, bool, error) {
				return 2468, true, nil
			}
			lookupProcessCreateTime = func(int) (int64, error) {
				return 13579, nil
			}
			lookupProcessExecutable = func(int) (string, error) {
				return "console.exe", nil
			}
			lookupProcessCommandLine = func(int) (string, error) {
				return "console.exe server", nil
			}
			tt.setup(wantErr)
			t.Cleanup(func() {
				lookupTCPListenerPID = oldLookupTCPListenerPID
				lookupProcessCreateTime = oldLookupProcessCreateTime
				lookupProcessExecutable = oldLookupProcessExecutable
				lookupProcessCommandLine = oldLookupProcessCommandLine
			})

			details, ok, err := osProcessRunner{}.FindTCPListener("127.0.0.1:9999")

			if !ok {
				t.Fatal("FindTCPListener() ok = false, want true when listener PID was found")
			}
			if details.PID != 2468 {
				t.Fatalf("FindTCPListener() details.PID = %d, want 2468", details.PID)
			}
			if !errors.Is(err, wantErr) {
				t.Fatalf("FindTCPListener() error = %v, want %v", err, wantErr)
			}
			if !strings.Contains(err.Error(), tt.wantStage) {
				t.Fatalf("FindTCPListener() error missing stage context: %v", err)
			}
		})
	}
}

func helperProcessStartRequest(t *testing.T) ProcessStartRequest {
	t.Helper()
	executable, err := os.Executable()
	if err != nil {
		t.Fatalf("resolve test executable: %v", err)
	}
	dir := t.TempDir()
	return ProcessStartRequest{
		Executable: executable,
		Args:       []string{"-test.run=TestManagedProcessRunnerHelper"},
		WorkDir:    dir,
		Env:        []string{"CONSOLE_PROCESS_RUNNER_HELPER=1"},
		StdoutPath: dir + string(os.PathSeparator) + "stdout.log",
		StderrPath: dir + string(os.PathSeparator) + "stderr.log",
	}
}

func TestManagedProcessRunnerHelper(t *testing.T) {
	if os.Getenv("CONSOLE_PROCESS_RUNNER_HELPER") != "1" {
		return
	}
	time.Sleep(30 * time.Second)
	os.Exit(0)
}
