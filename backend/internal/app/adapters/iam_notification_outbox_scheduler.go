package adapters

import (
	"context"
	"sync"
	"time"

	iamservice "github.com/open-console/console-platform/internal/modules/iam/service"
	"github.com/open-console/console-platform/internal/ports"
)

const (
	DefaultIAMNotificationOutboxInterval  = time.Minute
	DefaultIAMNotificationOutboxBatchSize = 20
)

type IAMNotificationOutboxService interface {
	DispatchNotificationOutbox(context.Context, iamservice.NotificationOutboxDispatchInput) (iamservice.NotificationOutboxDispatchResult, error)
}

// IAMNotificationOutboxScheduler 在应用生命周期内补偿 IAM 邀请、密码重置和邮箱验证通知投递。
//
// Service 仍会在创建 token 后立即同步投递一次；该调度器只处理进入 outbox 的失败或延迟任务。
type IAMNotificationOutboxScheduler struct {
	service   IAMNotificationOutboxService
	logger    ports.Logger
	interval  time.Duration
	batchSize int

	mu      sync.Mutex
	cancel  context.CancelFunc
	done    chan struct{}
	started bool
}

func NewIAMNotificationOutboxScheduler(service IAMNotificationOutboxService, logger ports.Logger, interval time.Duration, batchSize int) *IAMNotificationOutboxScheduler {
	if interval <= 0 {
		interval = DefaultIAMNotificationOutboxInterval
	}
	if batchSize <= 0 {
		batchSize = DefaultIAMNotificationOutboxBatchSize
	}
	return &IAMNotificationOutboxScheduler{service: service, logger: logger, interval: interval, batchSize: batchSize}
}

func (s *IAMNotificationOutboxScheduler) Start(ctx context.Context) error {
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

func (s *IAMNotificationOutboxScheduler) Shutdown(ctx context.Context) error {
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

func (s *IAMNotificationOutboxScheduler) run(ctx context.Context, done chan<- struct{}) {
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

func (s *IAMNotificationOutboxScheduler) tick(ctx context.Context) {
	runCtx, cancel := context.WithTimeout(ctx, s.interval)
	defer cancel()
	result, err := s.service.DispatchNotificationOutbox(runCtx, iamservice.NotificationOutboxDispatchInput{Limit: s.batchSize})
	if err != nil {
		if s.logger != nil {
			s.logger.Warn(
				"iam notification outbox dispatch failed",
				"error", err,
				"scanned", result.Scanned,
				"sent", result.Sent,
				"failed", result.Failed,
				"deferred", result.Deferred,
			)
		}
		return
	}
	if s.logger != nil && result.Scanned > 0 {
		s.logger.Debug(
			"iam notification outbox dispatch completed",
			"scanned", result.Scanned,
			"sent", result.Sent,
			"failed", result.Failed,
			"deferred", result.Deferred,
		)
	}
}
