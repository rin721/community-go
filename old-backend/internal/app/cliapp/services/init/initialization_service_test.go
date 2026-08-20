package initservice

import (
	"context"
	"errors"
	"os"
	"path/filepath"
	"runtime"
	"strings"
	"testing"

	"github.com/open-console/console-platform/pkg/database"
)

type bootstrapCasbinRule struct{}

func (bootstrapCasbinRule) TableName() string { return "iam_casbin_rules" }

func TestInspectInitializationStatusUsesBootstrapOnly(t *testing.T) {
	t.Parallel()

	configPath, dbPath := copyTempConfig(t)
	status, err := InspectInitializationStatus(context.Background(), configPath)
	if err != nil {
		t.Fatalf("InspectInitializationStatus() error = %v", err)
	}
	if !status.Required {
		t.Fatal("status.Required = false, want true for empty bootstrap database")
	}

	db, err := database.New(&database.Config{
		Driver: database.DriverSQLite,
		DBName: dbPath,
		Silent: true,
	})
	if err != nil {
		t.Fatalf("reopen sqlite: %v", err)
	}
	t.Cleanup(func() {
		if err := db.Close(); err != nil {
			t.Fatalf("close sqlite: %v", err)
		}
	})
	hasCasbinRules, err := db.HasTable(context.Background(), bootstrapCasbinRule{})
	if err != nil {
		t.Fatalf("HasTable(iam_casbin_rules) error = %v", err)
	}
	if hasCasbinRules {
		t.Fatal("InspectInitializationStatus created or touched iam_casbin_rules; bootstrap status must not load IAM policies")
	}
}

func TestMergeInitializationShutdownErrorPreservesRunAndShutdownErrors(t *testing.T) {
	t.Parallel()

	runErr := errors.New("initialization failed")
	shutdownErr := errors.New("database close failed")

	err := mergeInitializationShutdownError(runErr, shutdownErr)

	if !errors.Is(err, runErr) {
		t.Fatalf("merged error missing initialization error: %v", err)
	}
	if !errors.Is(err, shutdownErr) {
		t.Fatalf("merged error missing shutdown error: %v", err)
	}
	if !strings.Contains(err.Error(), "shutdown initialization runtime") {
		t.Fatalf("merged error missing shutdown context: %v", err)
	}
}

func TestMergeBootstrapCenterCleanupErrorPreservesRunAndCleanupErrors(t *testing.T) {
	t.Parallel()

	runErr := errors.New("schema failed")
	cleanupErr := errors.New("database close failed")

	err := mergeBootstrapCenterCleanupError(runErr, cleanupErr)

	if !errors.Is(err, runErr) {
		t.Fatalf("merged error missing run error: %v", err)
	}
	if !errors.Is(err, cleanupErr) {
		t.Fatalf("merged error missing cleanup error: %v", err)
	}
	if !strings.Contains(err.Error(), "cleanup bootstrap center") {
		t.Fatalf("merged error missing cleanup context: %v", err)
	}
}

func TestCloseBootstrapCenterDatabaseReturnsCloseError(t *testing.T) {
	t.Parallel()

	closeErr := errors.New("database close failed")

	err := closeBootstrapCenterDatabase(closeErrorDatabase{err: closeErr})

	if !errors.Is(err, closeErr) {
		t.Fatalf("closeBootstrapCenterDatabase() error = %v, want close error", err)
	}
	if !strings.Contains(err.Error(), "database close") {
		t.Fatalf("closeBootstrapCenterDatabase() error = %v, want database close context", err)
	}
}

type closeErrorDatabase struct {
	database.Database
	err error
}

func (d closeErrorDatabase) Close() error {
	return d.err
}

func copyTempConfig(t *testing.T) (string, string) {
	t.Helper()

	_, file, _, ok := runtime.Caller(0)
	if !ok {
		t.Fatal("runtime.Caller failed")
	}
	root := filepath.Clean(filepath.Join(filepath.Dir(file), "..", "..", "..", "..", ".."))
	raw, err := os.ReadFile(filepath.Join(root, "configs", "config.example.yaml"))
	if err != nil {
		t.Fatalf("read config example: %v", err)
	}
	dir := t.TempDir()
	dbPath := filepath.ToSlash(filepath.Join(dir, "app.db"))
	content := strings.ReplaceAll(string(raw), "  dbname: ./data/app.db", "  dbname: \""+dbPath+"\"")
	path := filepath.Join(dir, "config.yaml")
	if err := os.WriteFile(path, []byte(content), 0o644); err != nil {
		t.Fatalf("write temp config: %v", err)
	}
	return path, dbPath
}
