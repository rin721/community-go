package initservice

import (
	"context"
	"errors"
	"os"
	"path/filepath"
	"strings"
	"testing"

	"github.com/open-console/console-platform/internal/app/cliapp/services/managed"
	"github.com/open-console/console-platform/pkg/cli"
)

func TestOfferManagedServerRestartAfterInitReturnsStatusError(t *testing.T) {
	manager := testPostInitManager(t)
	statePath := filepath.Join(manager.RuntimeDir, managed.ServiceServer, "state.json")
	if err := os.MkdirAll(filepath.Dir(statePath), 0o755); err != nil {
		t.Fatalf("create state dir: %v", err)
	}
	if err := os.WriteFile(statePath, []byte("{broken"), 0o644); err != nil {
		t.Fatalf("write broken state: %v", err)
	}
	restore := SetManagedManagerFactoryForTest(func() *managed.Manager {
		return manager
	})
	t.Cleanup(restore)

	err := OfferManagedServerRestartAfterInit(&cli.Context{
		Context: context.Background(),
		Stdout:  &strings.Builder{},
	}, "configs/config.yaml")

	if err == nil {
		t.Fatal("OfferManagedServerRestartAfterInit() error = nil, want status error")
	}
	if !strings.Contains(err.Error(), "inspect managed server status after init") {
		t.Fatalf("OfferManagedServerRestartAfterInit() error missing status context: %v", err)
	}
}

func TestOfferManagedServerRestartAfterInitReturnsPromptWriteError(t *testing.T) {
	writeErr := errors.New("stdout unavailable")
	manager := testPostInitManager(t)
	restore := SetManagedManagerFactoryForTest(func() *managed.Manager {
		return manager
	})
	t.Cleanup(restore)

	err := OfferManagedServerRestartAfterInit(&cli.Context{
		Context: context.Background(),
		Flags:   map[string]interface{}{"yes": true},
		Stdout:  postInitErrorWriter{err: writeErr},
	}, "configs/config.yaml")

	if !errors.Is(err, writeErr) {
		t.Fatalf("OfferManagedServerRestartAfterInit() error = %v, want %v", err, writeErr)
	}
	if !strings.Contains(err.Error(), "write post-init managed server prompt") {
		t.Fatalf("OfferManagedServerRestartAfterInit() error missing write context: %v", err)
	}
}

func testPostInitManager(t *testing.T) *managed.Manager {
	t.Helper()
	return &managed.Manager{
		RuntimeDir: filepath.Join(t.TempDir(), "runtime"),
		Executable: filepath.Join(t.TempDir(), "bin-test"),
		WorkDir:    t.TempDir(),
	}
}

type postInitErrorWriter struct {
	err error
}

func (w postInitErrorWriter) Write([]byte) (int, error) {
	return 0, w.err
}
