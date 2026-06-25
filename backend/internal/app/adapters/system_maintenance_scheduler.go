package adapters

import (
	"context"
	"sync"
	"time"

	systemservice "github.com/open-console/console-platform/internal/modules/system/service"
	"github.com/open-console/console-platform/internal/ports"
)

const DefaultSystemMaintenanceCleanupInterval = time.Minute

type SystemMaintenanceCleanupService interface {
	RunMaintenanceCleanup(context.Context) (systemservice.MaintenanceCleanupResult, error)
}

// SystemMaintenanceScheduler 在应用生命周期内调度 System 模块补偿清理。
type SystemMaintenanceScheduler struct {
	service  SystemMaintenanceCleanupService
	logger   ports.Logger
	interval time.Duration

	mu      sync.Mutex
	cancel  context.CancelFunc
	done    chan struct{}
	started bool
}

func NewSystemMaintenanceScheduler(service SystemMaintenanceCleanupService, logger ports.Logger, interval time.Duration) *SystemMaintenanceScheduler {
	if interval <= 0 {
		interval = DefaultSystemMaintenanceCleanupInterval
	}
	return &SystemMaintenanceScheduler{service: service, logger: logger, interval: interval}
}

func (s *SystemMaintenanceScheduler) Start(ctx context.Context) error {
	if s == nil || s.service == nil {
		return nil
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	if s.started {
		return nil
	}
	runCtx, cancel := context.WithCancel(ctx)
	done := make(chan struct{})
	s.cancel = cancel
	s.done = done
	s.started = true
	go s.run(runCtx, done)
	return nil
}

func (s *SystemMaintenanceScheduler) Shutdown(ctx context.Context) error {
	if s == nil {
		return nil
	}
	s.mu.Lock()
	cancel := s.cancel
	done := s.done
	s.cancel = nil
	s.done = nil
	s.started = false
	s.mu.Unlock()
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

func (s *SystemMaintenanceScheduler) run(ctx context.Context, done chan<- struct{}) {
	defer close(done)
	s.tick(ctx)
	ticker := time.NewTicker(s.interval)
	defer ticker.Stop()
	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			s.tick(ctx)
		}
	}
}

func (s *SystemMaintenanceScheduler) tick(ctx context.Context) {
	runCtx, cancel := context.WithTimeout(ctx, s.interval)
	defer cancel()
	result, err := s.service.RunMaintenanceCleanup(runCtx)
	if err != nil {
		if s.logger != nil {
			s.logger.Warn(
				"system maintenance cleanup failed",
				"error", err,
				"storage", result.StorageStatus,
				"media_sessions_scanned", result.MediaUploadSessionsScanned,
				"media_sessions_expired", result.MediaUploadSessionsExpired,
				"media_chunk_sessions_cleaned", result.MediaUploadChunkSessionsCleaned,
				"traffic_probe_targets_checked", result.TrafficProbeTargetsChecked,
			)
		}
		return
	}
	if s.logger != nil && (result.MediaUploadChunkSessionsCleaned > 0 || result.MediaUploadSessionsExpired > 0 || result.TrafficProbeTargetsChecked > 0) {
		s.logger.Debug(
			"system maintenance cleanup completed",
			"storage", result.StorageStatus,
			"media_sessions_scanned", result.MediaUploadSessionsScanned,
			"media_sessions_expired", result.MediaUploadSessionsExpired,
			"media_chunk_sessions_cleaned", result.MediaUploadChunkSessionsCleaned,
			"traffic_probe_targets_checked", result.TrafficProbeTargetsChecked,
		)
	}
}
