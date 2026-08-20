package initapp

import (
	"context"
	"fmt"
	"os"
	"strings"
	"sync"
	"time"

	communityservice "github.com/open-console/console-platform/internal/modules/community/service"
	"github.com/open-console/console-platform/internal/ports"
	"github.com/open-console/console-platform/pkg/executor"
)

type communityVideoWorker struct {
	service  communityservice.Service
	executor executor.Manager
	logger   ports.Logger
	cfg      communityservice.VideoWorkerConfig
	workerID string

	mu      sync.Mutex
	cancel  context.CancelFunc
	done    chan struct{}
	started bool
}

func newCommunityVideoWorker(service communityservice.Service, manager executor.Manager, logger ports.Logger, cfg communityservice.VideoWorkerConfig) BackgroundService {
	if service == nil || !cfg.Enabled {
		return nil
	}
	cfg = normalizeCommunityVideoWorkerConfig(cfg)
	return &communityVideoWorker{
		service:  service,
		executor: manager,
		logger:   logger,
		cfg:      cfg,
		workerID: communityVideoWorkerID(),
	}
}

func normalizeCommunityVideoWorkerConfig(cfg communityservice.VideoWorkerConfig) communityservice.VideoWorkerConfig {
	if cfg.PollInterval <= 0 {
		cfg.PollInterval = 5 * time.Second
	}
	if cfg.BatchSize <= 0 {
		cfg.BatchSize = 2
	}
	if cfg.LeaseTimeout <= 0 {
		cfg.LeaseTimeout = 30 * time.Minute
	}
	if cfg.MaxAttempts <= 0 {
		cfg.MaxAttempts = 3
	}
	if cfg.RetryDelay <= 0 {
		cfg.RetryDelay = time.Minute
	}
	if strings.TrimSpace(cfg.ExecutorPool) == "" {
		cfg.ExecutorPool = "background"
	}
	if cfg.DispatchTimeout <= 0 {
		cfg.DispatchTimeout = 30 * time.Second
	}
	if cfg.CallbackMaxSkew <= 0 {
		cfg.CallbackMaxSkew = 10 * time.Minute
	}
	return cfg
}

func communityVideoWorkerID() string {
	host, _ := os.Hostname()
	host = strings.Map(func(r rune) rune {
		if r >= 'a' && r <= 'z' || r >= 'A' && r <= 'Z' || r >= '0' && r <= '9' || r == '-' || r == '_' {
			return r
		}
		return '-'
	}, strings.TrimSpace(host))
	if host == "" {
		host = "local"
	}
	return fmt.Sprintf("community-video-%s-%d", host, os.Getpid())
}

func (w *communityVideoWorker) Start(ctx context.Context) error {
	if w == nil || w.service == nil {
		return nil
	}
	w.mu.Lock()
	defer w.mu.Unlock()
	if w.started {
		return nil
	}
	runCtx, cancel := context.WithCancel(ctx)
	done := make(chan struct{})
	w.cancel = cancel
	w.done = done
	w.started = true
	go w.run(runCtx, done)
	return nil
}

func (w *communityVideoWorker) Shutdown(ctx context.Context) error {
	if w == nil {
		return nil
	}
	w.mu.Lock()
	cancel := w.cancel
	done := w.done
	w.cancel = nil
	w.done = nil
	w.started = false
	w.mu.Unlock()
	if cancel == nil || done == nil {
		return nil
	}
	cancel()
	select {
	case <-done:
		return nil
	case <-ctx.Done():
		return ctx.Err()
	}
}

func (w *communityVideoWorker) run(ctx context.Context, done chan<- struct{}) {
	defer close(done)
	w.tick(ctx)
	ticker := time.NewTicker(w.cfg.PollInterval)
	defer ticker.Stop()
	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			w.tick(ctx)
		}
	}
}

func (w *communityVideoWorker) tick(ctx context.Context) {
	if w == nil || w.service == nil {
		return
	}
	ids, err := w.service.ClaimCommunityVideoJobs(ctx, communityservice.VideoJobClaimInput{
		WorkerID:     w.workerID,
		Limit:        w.cfg.BatchSize,
		LeaseTimeout: w.cfg.LeaseTimeout,
	})
	if err != nil {
		if w.logger != nil {
			w.logger.Warn("community video job claim failed", "error", err)
		}
		return
	}
	for _, id := range ids {
		jobID := id
		task := func() {
			if err := w.service.ProcessCommunityVideoJob(ctx, communityservice.VideoJobProcessInput{WorkerID: w.workerID, JobID: jobID}); err != nil && w.logger != nil {
				w.logger.Warn("community video job process failed", "jobId", jobID, "error", err)
			}
		}
		if w.executor == nil {
			task()
			continue
		}
		if err := w.executor.Execute(executor.PoolName(w.cfg.ExecutorPool), task); err != nil {
			if w.logger != nil {
				w.logger.Warn("community video job executor submit failed; processing inline", "jobId", jobID, "pool", w.cfg.ExecutorPool, "error", err)
			}
			task()
		}
	}
}
