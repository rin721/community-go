package initapp

import (
	"testing"

	"github.com/open-console/console-platform/internal/config"
	"github.com/open-console/console-platform/pkg/logger"
)

func TestNewCORSAddsConfiguredCSRFHeaderAfterEnvOverride(t *testing.T) {
	t.Setenv("APP_CORS_ALLOW_HEADERS", "Content-Type")

	cfg := &config.Config{}
	cfg.CORS.Enabled = true
	cfg.CORS.AllowOrigins = []string{"https://community.example.test"}
	cfg.Auth.CSRF.HeaderName = "X-Community-CSRF"

	cors, err := NewCORS(cfg, transportTestLogger{})
	if err != nil {
		t.Fatalf("NewCORS() error = %v", err)
	}

	for _, header := range []string{"Content-Type", config.DefaultAuthCSRFHeaderName, config.DefaultCommunityAuthCSRFHeaderName, "X-Community-CSRF"} {
		if !corsAllowHeadersContain(cors.AllowHeaders, header) {
			t.Fatalf("CORS allow headers do not contain %q: %#v", header, cors.AllowHeaders)
		}
	}
}

func corsAllowHeadersContain(headers []string, target string) bool {
	for _, header := range headers {
		if header == target {
			return true
		}
	}
	return false
}

type transportTestLogger struct{}

func (transportTestLogger) Debug(string, ...interface{}) {}
func (transportTestLogger) Info(string, ...interface{})  {}
func (transportTestLogger) Warn(string, ...interface{})  {}
func (transportTestLogger) Error(string, ...interface{}) {}
func (transportTestLogger) Fatal(string, ...interface{}) {}

func (transportTestLogger) With(...interface{}) logger.Logger {
	return transportTestLogger{}
}

func (transportTestLogger) Reload(*logger.Config) error {
	return nil
}

func (transportTestLogger) Sync() error {
	return nil
}
