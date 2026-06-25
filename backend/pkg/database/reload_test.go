package database

import (
	"errors"
	"strings"
	"testing"
)

func TestCloseReloadCandidateReturnsCloseError(t *testing.T) {
	closeErr := errors.New("close failed")

	err := closeReloadCandidate(closeErrorDatabase{err: closeErr})
	if err == nil {
		t.Fatal("expected close error")
	}
	if !errors.Is(err, closeErr) {
		t.Fatalf("expected joined error to contain close error, got %v", err)
	}
	if !strings.Contains(err.Error(), "database reload candidate close failed") {
		t.Fatalf("expected reload candidate context, got %v", err)
	}
}

func TestCloseReloadCandidateAllowsNilDatabase(t *testing.T) {
	if err := closeReloadCandidate(nil); err != nil {
		t.Fatalf("expected nil database close to be ignored, got %v", err)
	}
}

type closeErrorDatabase struct {
	Database
	err error
}

func (d closeErrorDatabase) Close() error {
	return d.err
}
