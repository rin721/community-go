package adapters

import (
	"context"
	"errors"
	"testing"
	"time"

	iamservice "github.com/open-console/console-platform/internal/modules/iam/service"
)

func TestIAMNotificationOutboxSchedulerDispatchesAndLogsFailures(t *testing.T) {
	service := &fakeIAMNotificationOutboxService{
		results: []iamservice.NotificationOutboxDispatchResult{{Scanned: 1, Deferred: 1}, {Scanned: 1, Sent: 1}},
		errors:  []error{errors.New("smtp unavailable"), nil},
	}
	logger := &capturePolicyReloadLogger{}
	scheduler := NewIAMNotificationOutboxScheduler(service, logger, 10*time.Millisecond, 5)

	scheduler.tick(context.Background())
	scheduler.tick(context.Background())

	if service.calls != 2 {
		t.Fatalf("DispatchNotificationOutbox calls = %d, want 2", service.calls)
	}
	if service.lastLimit != 5 {
		t.Fatalf("dispatch limit = %d, want 5", service.lastLimit)
	}
	if len(logger.warns) != 1 || logger.warns[0] != "iam notification outbox dispatch failed" {
		t.Fatalf("warn logs = %#v", logger.warns)
	}
	if len(logger.debugs) != 1 || logger.debugs[0] != "iam notification outbox dispatch completed" {
		t.Fatalf("debug logs = %#v", logger.debugs)
	}
}

func TestIAMNotificationOutboxSchedulerLifecycleIsIdempotent(t *testing.T) {
	service := &fakeIAMNotificationOutboxService{}
	scheduler := NewIAMNotificationOutboxScheduler(service, nil, time.Hour, 0)
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	if err := scheduler.Start(ctx); err != nil {
		t.Fatalf("Start() error = %v", err)
	}
	if err := scheduler.Start(ctx); err != nil {
		t.Fatalf("second Start() error = %v", err)
	}
	shutdownCtx, shutdownCancel := context.WithTimeout(context.Background(), time.Second)
	defer shutdownCancel()
	if err := scheduler.Shutdown(shutdownCtx); err != nil {
		t.Fatalf("Shutdown() error = %v", err)
	}
	if err := scheduler.Shutdown(shutdownCtx); err != nil {
		t.Fatalf("second Shutdown() error = %v", err)
	}
	if service.calls == 0 {
		t.Fatal("scheduler should run an immediate notification outbox tick on start")
	}
}

type fakeIAMNotificationOutboxService struct {
	results   []iamservice.NotificationOutboxDispatchResult
	errors    []error
	calls     int
	lastLimit int
}

func (s *fakeIAMNotificationOutboxService) DispatchNotificationOutbox(_ context.Context, input iamservice.NotificationOutboxDispatchInput) (iamservice.NotificationOutboxDispatchResult, error) {
	s.lastLimit = input.Limit
	index := s.calls
	s.calls++
	var result iamservice.NotificationOutboxDispatchResult
	if index < len(s.results) {
		result = s.results[index]
	}
	var err error
	if index < len(s.errors) {
		err = s.errors[index]
	}
	return result, err
}
