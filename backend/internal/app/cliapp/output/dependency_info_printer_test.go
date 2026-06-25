package output

import (
	"errors"
	"os"
	"path/filepath"
	"runtime"
	"strings"
	"testing"
)

func TestPrintDependencyServiceInfoReturnsWriteError(t *testing.T) {
	writeErr := errors.New("stdout unavailable")
	err := PrintDependencyServiceInfo(outputErrorWriter{err: writeErr}, "db", copyConfigExampleForDependencyInfo(t))

	if !errors.Is(err, writeErr) {
		t.Fatalf("PrintDependencyServiceInfo() error = %v, want %v", err, writeErr)
	}
	if !strings.Contains(err.Error(), "write dependency service info") {
		t.Fatalf("PrintDependencyServiceInfo() error missing write context: %v", err)
	}
}

func TestWriteDBOperationResultReturnsWriteError(t *testing.T) {
	writeErr := errors.New("stdout unavailable")
	err := WriteDBOperationResult(outputErrorWriter{err: writeErr}, "database create applied", "CREATE DATABASE app;", true)

	if !errors.Is(err, writeErr) {
		t.Fatalf("WriteDBOperationResult() error = %v, want %v", err, writeErr)
	}
	if !strings.Contains(err.Error(), "write db operation result") {
		t.Fatalf("WriteDBOperationResult() error missing write context: %v", err)
	}
}

func copyConfigExampleForDependencyInfo(t *testing.T) string {
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

type outputErrorWriter struct {
	err error
}

func (w outputErrorWriter) Write([]byte) (int, error) {
	return 0, w.err
}
