package config

import (
	"errors"
	"strings"
	"testing"

	appconfig "github.com/open-console/console-platform/internal/config"
)

func TestPrintConfigDiagnosticsReturnsWriteError(t *testing.T) {
	writeErr := errors.New("stdout unavailable")
	err := printConfigDiagnostics(errorWriter{err: writeErr}, "configs/config.yaml", []appconfig.ConfigDiagnostic{
		{
			Section: "auth",
			Path:    "auth.signing_key",
			Message: "missing signing key",
		},
	})

	if !errors.Is(err, writeErr) {
		t.Fatalf("printConfigDiagnostics() error = %v, want %v", err, writeErr)
	}
	if !strings.Contains(err.Error(), "write config diagnostics") {
		t.Fatalf("printConfigDiagnostics() error missing write context: %v", err)
	}
}

func TestPrintConfigDiagnosticsSkipsEmptyOutput(t *testing.T) {
	if err := printConfigDiagnostics(errorWriter{err: errors.New("should not write")}, "configs/config.yaml", nil); err != nil {
		t.Fatalf("printConfigDiagnostics() with no diagnostics error = %v, want nil", err)
	}
}
