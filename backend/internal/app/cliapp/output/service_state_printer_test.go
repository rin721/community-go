package output

import (
	"errors"
	"strings"
	"testing"

	"github.com/open-console/console-platform/internal/app/cliapp/services/managed"
)

func TestPrintServiceStateReturnsWriteError(t *testing.T) {
	writeErr := errors.New("stdout unavailable")
	err := PrintServiceState(outputErrorWriter{err: writeErr}, managed.ServiceState{
		Service: managed.ServiceServer,
		Status:  managed.StatusRunning,
	})

	if !errors.Is(err, writeErr) {
		t.Fatalf("PrintServiceState() error = %v, want %v", err, writeErr)
	}
	if !strings.Contains(err.Error(), "write service state") {
		t.Fatalf("PrintServiceState() error missing write context: %v", err)
	}
}
