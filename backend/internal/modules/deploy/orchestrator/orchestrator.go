package orchestrator

import (
	"context"
	"fmt"
	"os"
	"syscall"
	"time"

	"github.com/open-console/console-platform/internal/modules/deploy/ipc"
	"github.com/open-console/console-platform/internal/modules/deploy/model"
	"github.com/open-console/console-platform/internal/modules/deploy/queue"
)

// Builder defines the interface for syncing code and compiling it.
type Builder interface {
	Sync(ctx context.Context, record *model.DeployRecord) error
	Build(ctx context.Context, record *model.DeployRecord) error
}

// Launcher defines the interface for starting the new process with the IPC address.
type Launcher interface {
	Launch(ctx context.Context, record *model.DeployRecord, ipcAddr string) error
}

// Logger defines logging interface.
type Logger interface {
	Info(msg string, keysAndValues ...any)
	Error(msg string, keysAndValues ...any)
	Warn(msg string, keysAndValues ...any)
}

type Config struct {
	WorkDir           string
	Branch            string
	BuildCmd          string
	BinaryPath        string
	ConfigPath        string
	HeartbeatInterval time.Duration
	GateBuffer        time.Duration
}

type Orchestrator struct {
	state         State
	currentCommit string
	queue         *queue.DeployQueue
	cfg           Config
	builder       Builder
	launcher      Launcher
	logger        Logger
	ipcServer     *ipc.Server
	storeRecord   func(*model.DeployRecord)
	newRecord     func(commitID string) *model.DeployRecord
	appendLog     func(*model.DeployRecord, string)
}

func NewOrchestrator(
	cfg Config,
	q *queue.DeployQueue,
	b Builder,
	l Launcher,
	logger Logger,
	storeRecord func(*model.DeployRecord),
	newRecord func(commitID string) *model.DeployRecord,
	appendLog func(*model.DeployRecord, string),
) (*Orchestrator, error) {
	return &Orchestrator{
		state:         StateIdle,
		queue:         q,
		cfg:           cfg,
		builder:       b,
		launcher:      l,
		logger:        logger,
		storeRecord:   storeRecord,
		newRecord:     newRecord,
		appendLog:     appendLog,
	}, nil
}

func (o *Orchestrator) SetLauncher(l Launcher) {
	o.launcher = l
}

func (o *Orchestrator) State() State {
	return o.state
}

func (o *Orchestrator) Start(ctx context.Context) {
	go o.loop(ctx)
}

func (o *Orchestrator) Trigger(commitHash string) {
	o.queue.Push(commitHash)
}

func (o *Orchestrator) loop(ctx context.Context) {
	for {
		select {
		case <-ctx.Done():
			return
		case <-o.queue.Notify():
			commit, ok := o.queue.Pop()
			if !ok {
				continue
			}
			o.runCycle(ctx, commit)
		}
	}
}

func (o *Orchestrator) runCycle(ctx context.Context, commit string) {
	record := o.newRecord(commit)
	record.Status = model.DeployStatusRunning
	o.storeRecord(record)

	o.logger.Info("deploy orchestrator: starting cycle", "commit", commit)
	o.appendLog(record, "[orchestrator] cycle started")

	// 1. Syncing
	o.state = StateSyncing
	o.appendLog(record, "[step:git_sync] starting")
	if err := o.builder.Sync(ctx, record); err != nil {
		o.setFailed(record, fmt.Errorf("git sync failed: %w", err))
		return
	}
	o.appendLog(record, "[step:git_sync] done")

	// Check queue for a newer commit during Syncing
	if next, ok := o.queue.Pop(); ok {
		o.setSuperseded(record, next)
		go o.runCycle(ctx, next)
		return
	}

	// 2. Building
	o.state = StateBuilding
	o.appendLog(record, "[step:build] starting")
	if err := o.builder.Build(ctx, record); err != nil {
		o.setFailed(record, fmt.Errorf("build failed: %w", err))
		return
	}
	o.appendLog(record, "[step:build] done")

	// Check queue for a newer commit during Building
	if next, ok := o.queue.Pop(); ok {
		o.setSuperseded(record, next)
		go o.runCycle(ctx, next)
		return
	}

	// 3. Launching
	o.state = StateLaunching
	o.appendLog(record, "[step:start] launching new process")

	ipcServer, err := ipc.NewServer()
	if err != nil {
		o.setFailed(record, fmt.Errorf("failed to create IPC server: %w", err))
		return
	}
	o.ipcServer = ipcServer
	defer func() {
		_ = ipcServer.Close()
		o.ipcServer = nil
	}()

	if err := o.launcher.Launch(ctx, record, ipcServer.Addr()); err != nil {
		o.setFailed(record, fmt.Errorf("launch failed: %w", err))
		return
	}
	o.appendLog(record, "[step:start] new process launched, waiting for confirmation")

	// 4. HandingOff / Waiting
	o.state = StateHandingOff
	record.Status = model.DeployStatusWaiting
	o.storeRecord(record)

	o.broadcastHeartbeats(ctx, record)
}

func (o *Orchestrator) broadcastHeartbeats(ctx context.Context, record *model.DeployRecord) {
	ticker := time.NewTicker(o.cfg.HeartbeatInterval)
	defer ticker.Stop()

	// Wait N*2 + GateBuffer
	deadline := time.Now().Add(o.cfg.HeartbeatInterval*2 + o.cfg.GateBuffer)

	o.logger.Info("deploy orchestrator: entering heartbeat broadcast", "commit", record.CommitID)
	o.appendLog(record, "[orchestrator] entered heartbeat and wait loop")

	for {
		hasPending := o.queue.HasPending()

		if hasPending {
			nextCommit, _ := o.queue.Pop() // Pop it to notify abort
			// Update this run as superseded since there's a pending run
			o.logger.Info("deploy orchestrator: pending commit detected during handoff, sending abort", "next", nextCommit)
			o.appendLog(record, fmt.Sprintf("[orchestrator] pending commit %s detected, sending abort to child", nextCommit))

			_ = o.ipcServer.Send(ipc.Message{
				Type:       ipc.MsgRestartRequired,
				CommitHash: nextCommit,
				SentAt:     time.Now(),
			})

			// Wait for MsgAbort response or next tick
			o.queue.Push(nextCommit) // Push back for runCycle to pick up
		} else {
			_ = o.ipcServer.Send(ipc.Message{
				Type:   ipc.MsgHeartbeat,
				SentAt: time.Now(),
			})
		}

		select {
		case <-ctx.Done():
			return
		case msg, ok := <-o.ipcServer.Messages():
			if !ok {
				// Connection closed/broken: treat as timeout
				o.setSuccessAndShutdown(record)
				return
			}
			if msg.Type == ipc.MsgReady {
				o.logger.Info("deploy orchestrator: child process reports READY")
				o.appendLog(record, "[orchestrator] child process confirmed READY, switching traffic")
				o.setSuccessAndShutdown(record)
				return
			}
			if msg.Type == ipc.MsgAbort {
				o.logger.Info("deploy orchestrator: child process reports ABORTED")
				o.appendLog(record, "[orchestrator] child process confirmed ABORTED")
				o.state = StateIdle
				record.Status = model.DeployStatusSkipped
				record.Error = "aborted by newer commit"
				now := time.Now()
				record.EndedAt = &now
				o.storeRecord(record)

				// Next loop iteration will pick up the pushed commit
				return
			}
		case <-ticker.C:
			// Continue loop
		case <-time.After(time.Until(deadline)):
			// Timeout: assume success or force transition
			o.logger.Warn("deploy orchestrator: handoff timeout reached, forcing switch")
			o.appendLog(record, "[orchestrator] handoff timeout, forcing traffic switch")
			o.setSuccessAndShutdown(record)
			return
		}
	}
}

func (o *Orchestrator) setFailed(record *model.DeployRecord, err error) {
	o.logger.Error("deploy orchestrator: pipeline failed", "error", err, "commit", record.CommitID)
	o.state = StateFailed
	record.Status = model.DeployStatusFailed
	record.Error = err.Error()
	now := time.Now()
	record.EndedAt = &now
	o.storeRecord(record)

	// Delay before returning to idle
	time.AfterFunc(5*time.Second, func() {
		o.state = StateIdle
	})
}

func (o *Orchestrator) setSuperseded(record *model.DeployRecord, nextCommit string) {
	o.logger.Info("deploy orchestrator: pipeline superseded", "commit", record.CommitID, "next", nextCommit)
	record.Status = model.DeployStatusSkipped
	record.Error = fmt.Sprintf("superseded by newer commit %s", nextCommit)
	now := time.Now()
	record.EndedAt = &now
	o.storeRecord(record)
}

func (o *Orchestrator) setSuccessAndShutdown(record *model.DeployRecord) {
	o.state = StateIdle
	record.Status = model.DeployStatusSuccess
	now := time.Now()
	record.EndedAt = &now
	o.storeRecord(record)

	o.logger.Info("deploy orchestrator: deploy succeeded, self-shutting down old process")
	o.appendLog(record, "[orchestrator] deploy success, triggering old process graceful exit")

	// Trigger self shutdown gracefully
	p, err := os.FindProcess(os.Getpid())
	if err == nil {
		_ = p.Signal(syscall.SIGTERM)
	}
}
