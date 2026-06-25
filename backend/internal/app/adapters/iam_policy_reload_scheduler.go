package adapters

import (
	"context"
	"sync"
	"time"

	"github.com/open-console/console-platform/internal/ports"
)

const DefaultIAMPolicyReloadInterval = 5 * time.Minute

type IAMPolicyReloadService interface {
	LoadPolicies(context.Context) error
}

// IAMPolicyReloadScheduler 在应用生命周期内周期性重载 IAM 授权策略。
//
// 角色、成员和权限写入成功后仍会同步调用 LoadPolicies 并向上返回错误；该调度器负责
// 对启动期或提交后的授权引擎重载失败做后台补偿，避免数据库事实和内存授权引擎长期漂移。
type IAMPolicyReloadScheduler struct {
	service  IAMPolicyReloadService
	logger   ports.Logger
	interval time.Duration

	mu      sync.Mutex
	cancel  context.CancelFunc
	done    chan struct{}
	started bool
}

func NewIAMPolicyReloadScheduler(service IAMPolicyReloadService, logger ports.Logger, interval time.Duration) *IAMPolicyReloadScheduler {
	if interval <= 0 {
		interval = DefaultIAMPolicyReloadInterval
	}
	return &IAMPolicyReloadScheduler{service: service, logger: logger, interval: interval}
}

func (s *IAMPolicyReloadScheduler) Start(ctx context.Context) error {
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

func (s *IAMPolicyReloadScheduler) Shutdown(ctx context.Context) error {
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

func (s *IAMPolicyReloadScheduler) run(ctx context.Context, done chan<- struct{}) {
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

func (s *IAMPolicyReloadScheduler) tick(ctx context.Context) {
	runCtx, cancel := context.WithTimeout(ctx, s.interval)
	defer cancel()
	if err := s.service.LoadPolicies(runCtx); err != nil {
		if s.logger != nil {
			s.logger.Warn("iam policy reload retry failed", "error", err)
		}
		return
	}
	if s.logger != nil {
		s.logger.Debug("iam policy reload retry completed")
	}
}
