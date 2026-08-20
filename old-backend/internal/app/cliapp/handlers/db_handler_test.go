package handlers

import (
	"context"
	"errors"
	"strings"
	"testing"

	servicedb "github.com/open-console/console-platform/internal/app/cliapp/services/db"
	"github.com/open-console/console-platform/pkg/cli"
)

func TestDBHandlerReturnsSQLWriteError(t *testing.T) {
	writeErr := errors.New("stdout unavailable")
	handler := &DBHandler{
		Runner: func(context.Context, servicedb.OperationOptions) (servicedb.OperationResult, error) {
			return servicedb.OperationResult{SQL: "CREATE DATABASE app;"}, nil
		},
	}

	err := handler.Execute(&cli.Context{
		Context: context.Background(),
		Flags:   map[string]interface{}{"apply": false},
		Stdout:  dbHandlerErrorWriter{err: writeErr},
	})

	if !errors.Is(err, writeErr) {
		t.Fatalf("DBHandler.Execute() error = %v, want %v", err, writeErr)
	}
	if !strings.Contains(err.Error(), "write db operation sql") {
		t.Fatalf("DBHandler.Execute() error missing write context: %v", err)
	}
}

type dbHandlerErrorWriter struct {
	err error
}

func (w dbHandlerErrorWriter) Write([]byte) (int, error) {
	return 0, w.err
}
