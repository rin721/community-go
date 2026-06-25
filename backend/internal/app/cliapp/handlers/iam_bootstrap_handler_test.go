package handlers

import (
	"errors"
	"strings"
	"testing"
)

func TestMergeIAMBootstrapShutdownErrorPreservesRunAndShutdownErrors(t *testing.T) {
	t.Parallel()

	runErr := errors.New("bootstrap failed")
	shutdownErr := errors.New("database close failed")

	err := mergeIAMBootstrapShutdownError(runErr, shutdownErr)
	if !errors.Is(err, runErr) {
		t.Fatalf("merged error should preserve run error, got %v", err)
	}
	if !errors.Is(err, shutdownErr) {
		t.Fatalf("merged error should preserve shutdown error, got %v", err)
	}
	if !strings.Contains(err.Error(), "shutdown iam bootstrap runtime") {
		t.Fatalf("merged error should include shutdown context, got %v", err)
	}
}

func TestMergeIAMBootstrapShutdownErrorReturnsShutdownOnly(t *testing.T) {
	t.Parallel()

	shutdownErr := errors.New("cache close failed")

	err := mergeIAMBootstrapShutdownError(nil, shutdownErr)
	if !errors.Is(err, shutdownErr) {
		t.Fatalf("shutdown-only error should preserve shutdown error, got %v", err)
	}
	if !strings.Contains(err.Error(), "shutdown iam bootstrap runtime") {
		t.Fatalf("shutdown-only error should include shutdown context, got %v", err)
	}
}

func TestSyncIAMBootstrapLoggerReturnsSyncErrorWithContext(t *testing.T) {
	t.Parallel()

	syncErr := errors.New("logger sync failed")

	err := syncIAMBootstrapLogger(syncErrorIAMBootstrapLogger{err: syncErr})
	if !errors.Is(err, syncErr) {
		t.Fatalf("syncIAMBootstrapLogger() error = %v, want %v", err, syncErr)
	}
	if !strings.Contains(err.Error(), "sync iam bootstrap logger") {
		t.Fatalf("syncIAMBootstrapLogger() error = %v, want operation context", err)
	}
}

type syncErrorIAMBootstrapLogger struct {
	err error
}

func (l syncErrorIAMBootstrapLogger) Sync() error {
	return l.err
}
