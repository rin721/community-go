package config

import (
	"errors"
	"os"
	"path/filepath"
	"runtime"
	"strings"
	"testing"
)

func TestPrintConfigSummaryReturnsWriteError(t *testing.T) {
	writeErr := errors.New("stdout unavailable")
	err := PrintConfigSummary(errorWriter{err: writeErr}, copyConfigExampleForSummary(t))

	if !errors.Is(err, writeErr) {
		t.Fatalf("PrintConfigSummary() error = %v, want %v", err, writeErr)
	}
	if !strings.Contains(err.Error(), "write config summary") {
		t.Fatalf("PrintConfigSummary() error missing write context: %v", err)
	}
}

func copyConfigExampleForSummary(t *testing.T) string {
	t.Helper()
	_, file, _, ok := runtime.Caller(0)
	if !ok {
		t.Fatal("runtime.Caller failed")
	}
	root := filepath.Clean(filepath.Join(filepath.Dir(file), "..", "..", "..", ".."))
	raw, err := os.ReadFile(filepath.Join(root, "configs", "config.example.yaml"))
	if err != nil {
		t.Fatalf("read config example: %v", err)
	}
	path := filepath.Join(t.TempDir(), "config.yaml")
	if err := os.WriteFile(path, raw, 0o644); err != nil {
		t.Fatalf("write temp config: %v", err)
	}
	return path
}

type errorWriter struct {
	err error
}

func (w errorWriter) Write([]byte) (int, error) {
	return 0, w.err
}
