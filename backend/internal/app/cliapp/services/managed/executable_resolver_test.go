package managed

import (
	"errors"
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func TestMergeExecutableCopyCloseErrorPreservesCopyAndCloseErrors(t *testing.T) {
	t.Parallel()

	copyErr := errors.New("copy failed")
	closeErr := errors.New("close failed")

	err := mergeExecutableCopyCloseError(copyErr, closeErr)
	if !errors.Is(err, copyErr) {
		t.Fatalf("merged error should preserve copy error, got %v", err)
	}
	if !errors.Is(err, closeErr) {
		t.Fatalf("merged error should preserve close error, got %v", err)
	}
	if !strings.Contains(err.Error(), "close temporary executable after copy failure") {
		t.Fatalf("merged error should include close context, got %v", err)
	}
}

func TestMergeExecutableCopyCloseErrorReturnsCopyOnly(t *testing.T) {
	t.Parallel()

	copyErr := errors.New("copy failed")

	err := mergeExecutableCopyCloseError(copyErr, nil)
	if !errors.Is(err, copyErr) {
		t.Fatalf("copy-only error should preserve copy error, got %v", err)
	}
}

func TestCopyExecutableReturnsTargetRemoveError(t *testing.T) {
	t.Parallel()

	dir := t.TempDir()
	source := filepath.Join(dir, "source.exe")
	target := filepath.Join(dir, "target.exe")
	if err := os.WriteFile(source, []byte("managed executable"), 0o755); err != nil {
		t.Fatalf("write source executable: %v", err)
	}
	if err := os.MkdirAll(target, 0o755); err != nil {
		t.Fatalf("create blocking target dir: %v", err)
	}
	if err := os.WriteFile(filepath.Join(target, "child"), []byte("blocked"), 0o644); err != nil {
		t.Fatalf("write blocking child: %v", err)
	}

	err := copyExecutable(source, target)

	if err == nil {
		t.Fatal("copyExecutable() error = nil, want target remove error")
	}
	if !strings.Contains(err.Error(), "remove existing managed executable") {
		t.Fatalf("copyExecutable() error missing target removal context: %v", err)
	}
	if _, statErr := os.Stat(target + ".tmp"); !errors.Is(statErr, os.ErrNotExist) {
		t.Fatalf("temporary executable should be cleaned, stat error = %v", statErr)
	}
}

func TestExecutableTempCleanupErrorJoinsCleanupFailure(t *testing.T) {
	t.Parallel()

	primary := errors.New("replace failed")
	tmp := filepath.Join(t.TempDir(), "target.exe.tmp")
	if err := os.MkdirAll(tmp, 0o755); err != nil {
		t.Fatalf("create temp dir: %v", err)
	}
	if err := os.WriteFile(filepath.Join(tmp, "child"), []byte("blocked"), 0o644); err != nil {
		t.Fatalf("write temp child: %v", err)
	}

	err := withExecutableTempCleanup(primary, tmp)

	if !errors.Is(err, primary) {
		t.Fatalf("expected primary error in result, got %v", err)
	}
	if !strings.Contains(err.Error(), "remove temporary managed executable") {
		t.Fatalf("expected temporary cleanup context, got %v", err)
	}
}
