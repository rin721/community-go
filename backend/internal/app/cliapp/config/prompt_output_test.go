package config

import (
	"context"
	"errors"
	"strings"
	"testing"

	appconfig "github.com/open-console/console-platform/internal/config"
	"github.com/open-console/console-platform/pkg/cli"
)

func TestPromptCoreSecretRecoveryReturnsInfoWriteError(t *testing.T) {
	configPath := copyWritablePrivacyConfig(t)
	writeErr := errors.New("stdout unavailable")
	ctx := newConfigPromptTestContext(configPath, infoErrorUI{err: writeErr}, map[string]string{
		"privacy.core_secrets.action": privacyCoreActionGenerateFile,
	})

	changed, err := PromptCoreSecretRecovery(ctx, configPath)
	if changed {
		t.Fatal("PromptCoreSecretRecovery() changed = true, want false on notice write failure")
	}
	if !errors.Is(err, writeErr) {
		t.Fatalf("PromptCoreSecretRecovery() error = %v, want %v", err, writeErr)
	}
	if !strings.Contains(err.Error(), "write IAM core secret generated notice") {
		t.Fatalf("PromptCoreSecretRecovery() error missing write context: %v", err)
	}
}

func TestPromptDatabasePreflightRepairReturnsInfoWriteError(t *testing.T) {
	configPath := copyWritablePrivacyConfig(t)
	writeErr := errors.New("stdout unavailable")
	ctx := newConfigPromptTestContext(configPath, infoErrorUI{err: writeErr}, map[string]string{
		"preflight.database.action": preflightDatabaseActionSQLite,
	})

	changed, err := promptDatabasePreflightRepair(ctx, configPath, &appconfig.Config{})
	if changed {
		t.Fatal("promptDatabasePreflightRepair() changed = true, want false on notice write failure")
	}
	if !errors.Is(err, writeErr) {
		t.Fatalf("promptDatabasePreflightRepair() error = %v, want %v", err, writeErr)
	}
	if !strings.Contains(err.Error(), "write database preflight sqlite notice") {
		t.Fatalf("promptDatabasePreflightRepair() error missing write context: %v", err)
	}
}

func TestPromptSMTPPreflightRepairReturnsInfoWriteError(t *testing.T) {
	configPath := copyWritablePrivacyConfig(t)
	writeErr := errors.New("stdout unavailable")
	ctx := newConfigPromptTestContext(configPath, infoErrorUI{err: writeErr}, map[string]string{
		"preflight.smtp.action": preflightSMTPActionDebug,
	})

	changed, err := promptSMTPPreflightRepair(ctx, configPath, &appconfig.Config{})
	if changed {
		t.Fatal("promptSMTPPreflightRepair() changed = true, want false on notice write failure")
	}
	if !errors.Is(err, writeErr) {
		t.Fatalf("promptSMTPPreflightRepair() error = %v, want %v", err, writeErr)
	}
	if !strings.Contains(err.Error(), "write SMTP preflight debug notice") {
		t.Fatalf("promptSMTPPreflightRepair() error missing write context: %v", err)
	}
}

func newConfigPromptTestContext(configPath string, base cli.PromptUI, answers map[string]string) *cli.Context {
	return &cli.Context{
		Context: context.Background(),
		Flags: map[string]interface{}{
			"config": configPath,
		},
		UI: cli.WithPromptAnswers(base, answers),
	}
}

type infoErrorUI struct {
	err error
}

func (ui infoErrorUI) Select(context.Context, string, []cli.SelectOption) (string, error) {
	return "", errors.New("unexpected select prompt")
}

func (ui infoErrorUI) Confirm(context.Context, string, bool) (bool, error) {
	return false, errors.New("unexpected confirm prompt")
}

func (ui infoErrorUI) Input(context.Context, string, string) (string, error) {
	return "", errors.New("unexpected input prompt")
}

func (ui infoErrorUI) Password(context.Context, string) (string, error) {
	return "", errors.New("unexpected password prompt")
}

func (ui infoErrorUI) Info(string) error {
	return ui.err
}
