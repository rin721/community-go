package configloader

import (
	"errors"
	"os"
	"path/filepath"
	"testing"
)

func TestLoadEnvReturnsMissingFileError(t *testing.T) {
	err := LoadEnv(filepath.Join(t.TempDir(), ".env"))
	if !errors.Is(err, os.ErrNotExist) {
		t.Fatalf("LoadEnv(missing) error = %v, want os.ErrNotExist", err)
	}
}

func TestLoadEnvReturnsParseError(t *testing.T) {
	envPath := filepath.Join(t.TempDir(), ".env")
	if err := os.WriteFile(envPath, []byte("APP_BROKEN='unterminated\n"), 0o600); err != nil {
		t.Fatalf("write .env: %v", err)
	}

	if err := LoadEnv(envPath); err == nil {
		t.Fatal("LoadEnv() should return dotenv parse errors")
	}
}

func TestLoadEnvLoadsValues(t *testing.T) {
	envPath := filepath.Join(t.TempDir(), ".env")
	key := "APP_CONFIGLOADER_TEST_VALUE"
	t.Setenv(key, "")
	if err := os.Unsetenv(key); err != nil {
		t.Fatalf("unset %s: %v", key, err)
	}
	if err := os.WriteFile(envPath, []byte(key+"=loaded\n"), 0o600); err != nil {
		t.Fatalf("write .env: %v", err)
	}

	if err := LoadEnv(envPath); err != nil {
		t.Fatalf("LoadEnv() error = %v", err)
	}
	if got := os.Getenv(key); got != "loaded" {
		t.Fatalf("%s = %q, want loaded", key, got)
	}
}
