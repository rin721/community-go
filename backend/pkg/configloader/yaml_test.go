package configloader

import (
	"errors"
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func TestUpdateYAMLScalarsRejectsEnvPlaceholderByDefault(t *testing.T) {
	configPath := writeYAMLScalarTestFile(t)

	err := UpdateYAMLScalars(configPath, []YAMLScalarUpdate{
		{Kind: YAMLScalarString, Path: "auth.signing_key", Value: "updated-signing-secret-at-least-32-bytes"},
	})
	if err == nil || !strings.Contains(err.Error(), "managed by environment placeholder") {
		t.Fatalf("expected environment placeholder error, got %v", err)
	}

	content, err := os.ReadFile(configPath)
	if err != nil {
		t.Fatalf("read config: %v", err)
	}
	if !strings.Contains(string(content), "${AUTH_SIGNING_KEY:dev-secret}") {
		t.Fatalf("placeholder should remain unchanged:\n%s", content)
	}
}

func TestUpdateYAMLScalarsAllowsEnvPlaceholderOverwriteWithOption(t *testing.T) {
	configPath := writeYAMLScalarTestFile(t)

	if err := UpdateYAMLScalars(configPath, []YAMLScalarUpdate{
		{Kind: YAMLScalarString, Path: "auth.signing_key", Value: "updated-signing-secret-at-least-32-bytes"},
	}, WithEnvPlaceholderOverwrite()); err != nil {
		t.Fatalf("UpdateYAMLScalars() error = %v", err)
	}

	content, err := os.ReadFile(configPath)
	if err != nil {
		t.Fatalf("read config: %v", err)
	}
	text := string(content)
	if !strings.Contains(text, `signing_key: "updated-signing-secret-at-least-32-bytes"`) {
		t.Fatalf("updated config missing forced value:\n%s", text)
	}
	if strings.Contains(text, "${AUTH_SIGNING_KEY") {
		t.Fatalf("placeholder should be overwritten:\n%s", text)
	}
}

func TestYAMLPathContainsEnvPlaceholder(t *testing.T) {
	configPath := writeYAMLScalarTestFile(t)

	hasPlaceholder, err := YAMLPathContainsEnvPlaceholder(configPath, "auth.signing_key")
	if err != nil {
		t.Fatalf("YAMLPathContainsEnvPlaceholder(signing_key) error = %v", err)
	}
	if !hasPlaceholder {
		t.Fatal("expected signing key path to contain env placeholder")
	}

	hasPlaceholder, err = YAMLPathContainsEnvPlaceholder(configPath, "auth.issuer")
	if err != nil {
		t.Fatalf("YAMLPathContainsEnvPlaceholder(issuer) error = %v", err)
	}
	if hasPlaceholder {
		t.Fatal("issuer path should not contain env placeholder")
	}
}

func TestYAMLStringSlice(t *testing.T) {
	configPath := writeYAMLScalarTestFile(t)

	values, err := YAMLStringSlice(configPath, "env_override.disabled_paths")
	if err != nil {
		t.Fatalf("YAMLStringSlice() error = %v", err)
	}
	if len(values) != 1 || values[0] != "auth.signing_key" {
		t.Fatalf("values = %#v", values)
	}

	values, err = YAMLStringSlice(configPath, "env_override.missing")
	if err != nil {
		t.Fatalf("YAMLStringSlice(missing) error = %v", err)
	}
	if len(values) != 0 {
		t.Fatalf("missing values = %#v, want empty", values)
	}
}

func TestUpdateYAMLScalarsCreatesMissingStringSliceAndDeduplicates(t *testing.T) {
	configPath := writeYAMLScalarTestFile(t)

	if err := UpdateYAMLScalars(configPath, []YAMLScalarUpdate{
		{
			Kind:          YAMLScalarStringSlice,
			Path:          "env_override.disabled_paths",
			Values:        []string{"auth.signing_key", " auth.signing_key ", "", "auth.notification_driver"},
			CreateMissing: true,
		},
	}); err != nil {
		t.Fatalf("UpdateYAMLScalars() error = %v", err)
	}

	content, err := os.ReadFile(configPath)
	if err != nil {
		t.Fatalf("read config: %v", err)
	}
	text := string(content)
	for _, want := range []string{"env_override:", "disabled_paths:", `- "auth.signing_key"`, `- "auth.notification_driver"`} {
		if !strings.Contains(text, want) {
			t.Fatalf("updated config missing %q:\n%s", want, text)
		}
	}
	if strings.Count(text, "auth.signing_key") != 1 {
		t.Fatalf("disabled paths should be deduplicated:\n%s", text)
	}
}

func TestRestoreFileContentReturnsWriteAndRestoreErrors(t *testing.T) {
	writeErr := errors.New("target write failed")
	restoreErr := errors.New("restore failed")

	err := restoreFileContentWithWriter("config.yaml", []byte("old"), 0o600, writeErr, func(string, []byte, os.FileMode) error {
		return restoreErr
	})

	if !errors.Is(err, writeErr) {
		t.Fatalf("expected joined error to contain write error, got %v", err)
	}
	if !errors.Is(err, restoreErr) {
		t.Fatalf("expected joined error to contain restore error, got %v", err)
	}
	if !strings.Contains(err.Error(), "restore config file after failed write") {
		t.Fatalf("expected restore context in error, got %v", err)
	}
}

func TestCloseConfigFileAfterErrorJoinsCloseFailure(t *testing.T) {
	writeErr := errors.New("write failed")
	closeErr := errors.New("close failed")

	err := closeConfigFileAfterError(writeErr, fakeCloser{err: closeErr}, "close temp")

	if !errors.Is(err, writeErr) {
		t.Fatalf("expected joined error to contain write error, got %v", err)
	}
	if !errors.Is(err, closeErr) {
		t.Fatalf("expected joined error to contain close error, got %v", err)
	}
	if !strings.Contains(err.Error(), "close temp") {
		t.Fatalf("expected close context in error, got %v", err)
	}
}

func TestRemoveConfigTempFileReturnsCleanupError(t *testing.T) {
	tempPath := filepath.Join(t.TempDir(), "config.tmp")
	if err := os.MkdirAll(tempPath, 0o755); err != nil {
		t.Fatalf("create temp dir: %v", err)
	}
	if err := os.WriteFile(filepath.Join(tempPath, "child"), []byte("x"), 0o600); err != nil {
		t.Fatalf("write temp child: %v", err)
	}

	err := removeConfigTempFile(tempPath)

	if err == nil {
		t.Fatal("removeConfigTempFile() error = nil, want cleanup error")
	}
	if !strings.Contains(err.Error(), "remove config temp file") {
		t.Fatalf("expected cleanup context in error, got %v", err)
	}
}

func writeYAMLScalarTestFile(t *testing.T) string {
	t.Helper()
	configPath := filepath.Join(t.TempDir(), "config.yaml")
	content := []byte(`
auth:
  issuer: console-platform
  signing_key: ${AUTH_SIGNING_KEY:dev-secret}
env_override:
  disabled_paths:
    - auth.signing_key
`)
	if err := os.WriteFile(configPath, content, 0o600); err != nil {
		t.Fatalf("write config: %v", err)
	}
	return configPath
}

type fakeCloser struct {
	err error
}

func (f fakeCloser) Close() error {
	return f.err
}
