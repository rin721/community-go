package adapters

import (
	"errors"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"time"

	"github.com/open-console/console-platform/pkg/processx"
)

type osProcessRunner struct{}

var (
	findProcess              = os.FindProcess
	lookupProcessCreateTime  = processCreateTime
	readProcessCreateTime    = processx.CreateTime
	lookupTCPListenerPID     = processx.TCPListenerPID
	lookupProcessExecutable  = processx.Exe
	lookupProcessCommandLine = processx.CommandLine
	releaseProcess           = func(proc *os.Process) error { return proc.Release() }
	killStartedProcess       = func(proc *os.Process) error { return proc.Kill() }
)

// NewOSProcessRunner 创建默认的系统进程运行器。
func NewOSProcessRunner() ProcessRunner {
	return osProcessRunner{}
}

// StartProcess 启动脱离当前 CLI 的后台进程，并把 stdout/stderr 追加写入指定日志文件。
func (osProcessRunner) StartProcess(req ProcessStartRequest) (ProcessInfo, error) {
	if req.Executable == "" {
		return ProcessInfo{}, errors.New("executable is required")
	}
	if err := os.MkdirAll(filepath.Dir(req.StdoutPath), 0o755); err != nil {
		return ProcessInfo{}, err
	}
	if err := os.MkdirAll(filepath.Dir(req.StderrPath), 0o755); err != nil {
		return ProcessInfo{}, err
	}
	stdout, err := os.OpenFile(req.StdoutPath, os.O_CREATE|os.O_APPEND|os.O_WRONLY, 0o644)
	if err != nil {
		return ProcessInfo{}, err
	}
	defer stdout.Close()
	stderr, err := os.OpenFile(req.StderrPath, os.O_CREATE|os.O_APPEND|os.O_WRONLY, 0o644)
	if err != nil {
		return ProcessInfo{}, err
	}
	defer stderr.Close()

	cmd := exec.Command(req.Executable, req.Args...)
	cmd.Dir = req.WorkDir
	cmd.Env = append(os.Environ(), req.Env...)
	cmd.Stdout = stdout
	cmd.Stderr = stderr
	configureDetachedProcess(cmd)

	if err := cmd.Start(); err != nil {
		return ProcessInfo{}, err
	}
	info := ProcessInfo{PID: cmd.Process.Pid}
	startTime, err := lookupProcessCreateTime(info.PID)
	if err != nil {
		return info, killStartedProcessAfterError(cmd.Process, "startup metadata failure", fmt.Errorf("resolve managed process create time: %w", err))
	}
	info.ProcessStartTime = startTime
	if err := releaseProcess(cmd.Process); err != nil {
		return info, killStartedProcessAfterError(cmd.Process, "process handle release failure", fmt.Errorf("release managed process handle: %w", err))
	}
	return info, nil
}

// IsProcessRunning 根据 PID 和创建时间判断目标进程是否仍是同一个进程。
func (osProcessRunner) IsProcessRunning(info ProcessInfo) (bool, error) {
	return processx.IsRunning(info.PID, info.ProcessStartTime)
}

// KillProcess 强制结束目标进程。
func (osProcessRunner) KillProcess(info ProcessInfo) error {
	if info.PID <= 0 {
		return nil
	}
	proc, err := findProcess(info.PID)
	if err != nil {
		return fmt.Errorf("find process %d: %w", info.PID, err)
	}
	if err := proc.Kill(); err != nil {
		return fmt.Errorf("kill process %d: %w", info.PID, err)
	}
	return nil
}

func killStartedProcessAfterError(proc *os.Process, reason string, primary error) error {
	if proc == nil {
		return primary
	}
	if err := killStartedProcess(proc); err != nil {
		return errors.Join(primary, fmt.Errorf("kill managed process after %s: %w", reason, err))
	}
	return primary
}

func (osProcessRunner) FindTCPListener(addr string) (ProcessDetails, bool, error) {
	pid, ok, err := lookupTCPListenerPID(addr)
	if err != nil || !ok {
		return ProcessDetails{}, ok, err
	}
	details := ProcessDetails{ProcessInfo: ProcessInfo{PID: pid}}
	startTime, err := lookupProcessCreateTime(pid)
	if err != nil {
		return details, true, fmt.Errorf("resolve listener process create time %d: %w", pid, err)
	}
	details.ProcessStartTime = startTime
	executable, err := lookupProcessExecutable(pid)
	if err != nil {
		return details, true, fmt.Errorf("resolve listener process executable %d: %w", pid, err)
	}
	details.Executable = executable
	commandLine, err := lookupProcessCommandLine(pid)
	if err != nil {
		return details, true, fmt.Errorf("resolve listener process command line %d: %w", pid, err)
	}
	details.CommandLine = commandLine
	return details, true, nil
}

func processCreateTime(pid int) (int64, error) {
	var lastErr error
	for attempt := 0; attempt < 10; attempt++ {
		createTime, err := readProcessCreateTime(pid)
		if err == nil && createTime > 0 {
			return createTime, nil
		}
		if err != nil {
			lastErr = err
		} else {
			lastErr = fmt.Errorf("process %d create time is not available", pid)
		}
		time.Sleep(50 * time.Millisecond)
	}
	return 0, lastErr
}
