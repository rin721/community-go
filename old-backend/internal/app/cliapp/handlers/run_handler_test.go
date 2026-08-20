package handlers

import (
	"bytes"
	"context"
	"errors"
	"strings"
	"testing"

	"github.com/open-console/console-platform/internal/app/cliapp/localization"
	"github.com/open-console/console-platform/internal/app/initcenter"
	"github.com/open-console/console-platform/pkg/cli"
)

func TestRunHandlerReturnsInitializationStatusError(t *testing.T) {
	statusErr := errors.New("status unavailable")
	oldInspectInitializationStatus := inspectInitializationStatus
	inspectInitializationStatus = func(context.Context, string) (initcenter.Status, error) {
		return initcenter.Status{}, statusErr
	}
	t.Cleanup(func() {
		inspectInitializationStatus = oldInspectInitializationStatus
	})

	var stdout bytes.Buffer
	ctx := &cli.Context{
		Context: context.Background(),
		Stdout:  &stdout,
		UI:      cli.NewPromptUI(strings.NewReader(""), &stdout),
	}

	handled, err := NewRunHandler().handleInitializationBeforeServer(ctx, ctx.UI, "configs/config.yaml", nil)
	if handled {
		t.Fatal("handleInitializationBeforeServer handled initialization flow, want status error before handling")
	}
	if !errors.Is(err, statusErr) {
		t.Fatalf("handleInitializationBeforeServer error = %v, want %v", err, statusErr)
	}
	if !strings.Contains(err.Error(), "inspect initialization status before starting server") {
		t.Fatalf("handleInitializationBeforeServer error missing context: %v", err)
	}
}

func TestPrintInitializationStatusReturnsWriteError(t *testing.T) {
	writeErr := errors.New("stdout unavailable")
	err := printInitializationStatus(runOutputErrorWriter{err: writeErr}, initcenter.Status{
		Required:    true,
		CurrentStep: "database",
	}, localization.ForArgs(nil))

	if !errors.Is(err, writeErr) {
		t.Fatalf("printInitializationStatus() error = %v, want %v", err, writeErr)
	}
	if !strings.Contains(err.Error(), "write initialization status") {
		t.Fatalf("printInitializationStatus() error missing write context: %v", err)
	}
}

func TestRunHandlerReturnsUninitializedNoticeWriteError(t *testing.T) {
	writeErr := errors.New("stdout unavailable")
	oldInspectInitializationStatus := inspectInitializationStatus
	inspectInitializationStatus = func(context.Context, string) (initcenter.Status, error) {
		return initcenter.Status{Required: true}, nil
	}
	t.Cleanup(func() {
		inspectInitializationStatus = oldInspectInitializationStatus
	})

	ctx := &cli.Context{
		Context: context.Background(),
		Flags:   map[string]interface{}{"yes": true},
		UI:      runInfoErrorUI{err: writeErr},
	}

	handled, err := NewRunHandler().handleInitializationBeforeServer(ctx, ctx.UI, "configs/config.yaml", nil)
	if !handled {
		t.Fatal("handleInitializationBeforeServer handled = false, want true when info output fails")
	}
	if !errors.Is(err, writeErr) {
		t.Fatalf("handleInitializationBeforeServer error = %v, want %v", err, writeErr)
	}
	if !strings.Contains(err.Error(), "write uninitialized startup notice") {
		t.Fatalf("handleInitializationBeforeServer error missing write context: %v", err)
	}
}

func TestPromptSetupStepValuesReturnsGroupTitleWriteError(t *testing.T) {
	writeErr := errors.New("stdout unavailable")
	ctx := &cli.Context{Context: context.Background()}

	_, err := promptSetupStepValues(ctx, runInfoErrorUI{err: writeErr}, initcenter.StepSchema{
		Groups: []initcenter.FieldGroup{{Title: "Database"}},
	})
	if !errors.Is(err, writeErr) {
		t.Fatalf("promptSetupStepValues() error = %v, want %v", err, writeErr)
	}
	if !strings.Contains(err.Error(), "write setup field group title") {
		t.Fatalf("promptSetupStepValues() error missing write context: %v", err)
	}
}

type runOutputErrorWriter struct {
	err error
}

func (w runOutputErrorWriter) Write([]byte) (int, error) {
	return 0, w.err
}

type runInfoErrorUI struct {
	err error
}

func (ui runInfoErrorUI) Select(context.Context, string, []cli.SelectOption) (string, error) {
	return "", nil
}

func (ui runInfoErrorUI) Confirm(context.Context, string, bool) (bool, error) {
	return false, nil
}

func (ui runInfoErrorUI) Input(context.Context, string, string) (string, error) {
	return "", nil
}

func (ui runInfoErrorUI) Password(context.Context, string) (string, error) {
	return "", nil
}

func (ui runInfoErrorUI) Info(string) error {
	return ui.err
}
