package adapters

import (
	"context"
	"errors"
	"testing"
	"time"
)

func TestIAMPolicyReloadSchedulerRetriesAndLogsFailures(t *testing.T) {
	service := &fakeIAMPolicyReloadService{errors: []error{errors.New("policy backend unavailable"), nil}}
	logger := &capturePolicyReloadLogger{}
	scheduler := NewIAMPolicyReloadScheduler(service, logger, 10*time.Millisecond)

	scheduler.tick(context.Background())
	scheduler.tick(context.Background())

	if service.calls != 2 {
		t.Fatalf("LoadPolicies calls = %d, want 2", service.calls)
	}
	if len(logger.warns) != 1 || logger.warns[0] != "iam policy reload retry failed" {
		t.Fatalf("warn logs = %#v", logger.warns)
	}
	if len(logger.debugs) != 1 || logger.debugs[0] != "iam policy reload retry completed" {
		t.Fatalf("debug logs = %#v", logger.debugs)
	}
}

func TestIAMPolicyReloadSchedulerLifecycleIsIdempotent(t *testing.T) {
	service := &fakeIAMPolicyReloadService{}
	scheduler := NewIAMPolicyReloadScheduler(service, nil, time.Hour)
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
		t.Fatal("scheduler should run an immediate policy reload tick on start")
	}
}

type fakeIAMPolicyReloadService struct {
	errors []error
	calls  int
}

func (s *fakeIAMPolicyReloadService) LoadPolicies(context.Context) error {
	index := s.calls
	s.calls++
	if index < len(s.errors) {
		return s.errors[index]
	}
	return nil
}

type capturePolicyReloadLogger struct {
	warns  []string
	debugs []string
}

func (l *capturePolicyReloadLogger) Debug(message string, _ ...interface{}) {
	l.debugs = append(l.debugs, message)
}

func (l *capturePolicyReloadLogger) Info(string, ...interface{}) {}

func (l *capturePolicyReloadLogger) Warn(message string, _ ...interface{}) {
	l.warns = append(l.warns, message)
}

func (l *capturePolicyReloadLogger) Error(string, ...interface{}) {}

func (l *capturePolicyReloadLogger) Fatal(string, ...interface{}) {}

func (l *capturePolicyReloadLogger) Sync() error { return nil }
