package db

import (
	"errors"
	"strings"
	"testing"

	"github.com/open-console/console-platform/pkg/database"
)

func TestCloseDatabaseResourceReturnsCloseError(t *testing.T) {
	closeErr := errors.New("close failed")
	db := closeErrorDatabase{err: closeErr}

	err := closeDatabaseResource(db)
	if err == nil {
		t.Fatal("closeDatabaseResource() error = nil, want close error")
	}
	if !errors.Is(err, closeErr) {
		t.Fatalf("closeDatabaseResource() error = %v, want %v", err, closeErr)
	}
	if !strings.Contains(err.Error(), "database close") {
		t.Fatalf("closeDatabaseResource() error = %v, want close context", err)
	}
}

func TestSyncLoggerReturnsSyncErrorWithContext(t *testing.T) {
	syncErr := errors.New("logger sync failed")

	err := syncLogger(syncErrorLogger{err: syncErr})
	if err == nil {
		t.Fatal("syncLogger() error = nil, want sync error")
	}
	if !errors.Is(err, syncErr) {
		t.Fatalf("syncLogger() error = %v, want %v", err, syncErr)
	}
	if !strings.Contains(err.Error(), "sync db command logger") {
		t.Fatalf("syncLogger() error = %v, want operation context", err)
	}
}

type closeErrorDatabase struct {
	database.Database
	err error
}

func (d closeErrorDatabase) Close() error {
	return d.err
}

type syncErrorLogger struct {
	err error
}

func (l syncErrorLogger) Sync() error {
	return l.err
}
