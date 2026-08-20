package migrator

import (
	"bytes"
	"context"
	"database/sql"
	"errors"
	"os"
	"path/filepath"
	"strings"
	"testing"

	"github.com/open-console/console-platform/pkg/database"
)

func TestRunnerUpStatusDown(t *testing.T) {
	runner, db := newSmokeRunner(t)

	if err := runner.Up(context.Background()); err != nil {
		t.Fatalf("Up() failed: %v", err)
	}
	if ok, err := db.HasTable(context.Background(), struct{}{}); err != nil || ok {
		t.Fatalf("anonymous HasTable sanity check = %v, %v", ok, err)
	}
	var count int
	if _, err := db.Raw(context.Background(), &count, "SELECT COUNT(*) FROM migrator_smoke"); err != nil {
		t.Fatalf("query migrated table: %v", err)
	}
	var status bytes.Buffer
	if err := runner.Status(context.Background(), &status); err != nil {
		t.Fatalf("Status() failed: %v", err)
	}
	if status.Len() == 0 {
		t.Fatal("expected status output")
	}
	if err := runner.Down(context.Background()); err != nil {
		t.Fatalf("Down() failed: %v", err)
	}
}

func TestRunnerStatusReturnsWriterError(t *testing.T) {
	runner, _ := newSmokeRunner(t)

	if err := runner.Up(context.Background()); err != nil {
		t.Fatalf("Up() failed: %v", err)
	}
	writeErr := errors.New("migration writer failed")
	err := runner.Status(context.Background(), failingWriter{err: writeErr})
	if err == nil {
		t.Fatal("expected writer error")
	}
	if !errors.Is(err, writeErr) {
		t.Fatalf("expected errors.Is writer error, got %v", err)
	}
	if !strings.Contains(err.Error(), "write migration output") {
		t.Fatalf("expected migration output context, got %v", err)
	}
}

func TestNewRequiresSQLProvider(t *testing.T) {
	_, err := New(nil, Config{Driver: "sqlite", Dir: t.TempDir()})
	if err == nil {
		t.Fatal("expected nil provider error")
	}
}

func newSmokeRunner(t *testing.T) (Runner, database.Database) {
	t.Helper()

	dir := t.TempDir()
	migration := `-- +goose Up
CREATE TABLE migrator_smoke (id INTEGER PRIMARY KEY, name TEXT NOT NULL);
-- +goose Down
DROP TABLE migrator_smoke;
`
	if err := os.WriteFile(filepath.Join(dir, "20260531000100_create_smoke.sql"), []byte(migration), 0644); err != nil {
		t.Fatalf("write migration: %v", err)
	}

	db, err := database.New(&database.Config{Driver: database.DriverSQLite, DBName: filepath.Join(t.TempDir(), "test.db")})
	if err != nil {
		t.Fatalf("database.New() failed: %v", err)
	}
	t.Cleanup(func() {
		if err := db.Close(); err != nil {
			t.Errorf("database close: %v", err)
		}
	})

	runner, err := New(db, Config{Driver: string(database.DriverSQLite), Dir: dir})
	if err != nil {
		t.Fatalf("New() failed: %v", err)
	}
	return runner, db
}

type failingWriter struct {
	err error
}

func (w failingWriter) Write([]byte) (int, error) {
	return 0, w.err
}

var _ SQLProvider = sqlProviderFunc(nil)

type sqlProviderFunc func() (*sql.DB, error)

func (f sqlProviderFunc) SQLDB() (*sql.DB, error) {
	return f()
}
