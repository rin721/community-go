package config

import (
	"os"
	"path/filepath"
	"runtime"
	"strings"
	"testing"

	"github.com/open-console/console-platform/pkg/configloader"
)

func TestDocumentedExampleConfigYAMLFilesAreValid(t *testing.T) {
	root := configExamplesRepoRoot(t)
	files := documentedExampleConfigFiles(t, root)

	for _, file := range files {
		file := file
		t.Run(filepath.ToSlash(strings.TrimPrefix(file, root+string(os.PathSeparator))), func(t *testing.T) {
			loader := configloader.New()
			loader.SetConfigFile(file)
			if err := loader.ReadInConfig(); err != nil {
				t.Fatalf("parse example config: %v", err)
			}
			if len(loader.AllSettings()) == 0 {
				t.Fatal("example config must contain a mapping document")
			}
		})
	}
}

func TestDocumentedExampleConfigsLoadWithControlledEnvironment(t *testing.T) {
	root := configExamplesRepoRoot(t)
	files := documentedExampleConfigFiles(t, root)

	for _, file := range files {
		file := file
		t.Run(filepath.ToSlash(strings.TrimPrefix(file, root+string(os.PathSeparator))), func(t *testing.T) {
			setControlledExampleEnv(t, filepath.Base(file))
			mgr := NewManager()
			if err := mgr.Load(file); err != nil {
				t.Fatalf("load example config: %v", err)
			}
			if cfg := mgr.Get(); cfg == nil {
				t.Fatal("loaded config is nil")
			}
		})
	}
}

func documentedExampleConfigFiles(t *testing.T, root string) []string {
	t.Helper()

	files := []string{
		filepath.Join(root, "configs", "config.example.yaml"),
		filepath.Join(root, "deploy", "config.production.example.yaml"),
	}
	matches, err := filepath.Glob(filepath.Join(root, "configs", "examples", "*.example.yaml"))
	if err != nil {
		t.Fatalf("glob scenario examples: %v", err)
	}
	if len(matches) == 0 {
		t.Fatal("no scenario example configs found")
	}
	files = append(files, matches...)
	return files
}

func configExamplesRepoRoot(t *testing.T) string {
	t.Helper()

	_, file, _, ok := runtime.Caller(0)
	if !ok {
		t.Fatal("runtime.Caller failed")
	}
	return filepath.Clean(filepath.Join(filepath.Dir(file), "..", ".."))
}

func setControlledExampleEnv(t *testing.T, fileName string) {
	t.Helper()

	env := map[string]string{
		"APP_SERVER_MODE":                                 "debug",
		"APP_DB_DRIVER":                                   "sqlite",
		"APP_DB_SQLITE_PATH":                              "./data/test-example.db",
		"APP_DB_MYSQL_HOST":                               "127.0.0.1",
		"APP_DB_MYSQL_PORT":                               "3306",
		"APP_DB_MYSQL_USERNAME":                           "console_platform",
		"APP_DB_MYSQL_PASSWORD":                           "example-db-password",
		"APP_DB_MYSQL_DATABASE":                           "console_platform",
		"APP_DB_MYSQL_CHARSET":                            "utf8mb4",
		"APP_DB_POSTGRES_HOST":                            "127.0.0.1",
		"APP_DB_POSTGRES_PORT":                            "5432",
		"APP_DB_POSTGRES_USERNAME":                        "console_platform",
		"APP_DB_POSTGRES_PASSWORD":                        "example-db-password",
		"APP_DB_POSTGRES_DATABASE":                        "console_platform",
		"APP_DB_POSTGRES_SSL_MODE":                        "disable",
		"APP_DB_POOL_MAX_OPEN_CONNS":                      "10",
		"APP_DB_POOL_MAX_IDLE_CONNS":                      "5",
		"APP_CACHE_DRIVER":                                "local",
		"APP_CACHE_LOCAL_MAX_COST":                        "67108864",
		"APP_CACHE_LOCAL_NUM_COUNTERS":                    "1000000",
		"APP_CACHE_LOCAL_BUFFER_ITEMS":                    "64",
		"APP_CACHE_LOCAL_DEFAULT_TTL_SECONDS":             "0",
		"APP_CACHE_REDIS_ADDR":                            "127.0.0.1:6379",
		"APP_CACHE_REDIS_USERNAME":                        "",
		"APP_CACHE_REDIS_PASSWORD":                        "",
		"APP_CACHE_REDIS_DB":                              "0",
		"APP_CACHE_REDIS_POOL_SIZE":                       "10",
		"APP_CACHE_REDIS_MIN_IDLE_CONNS":                  "2",
		"APP_CACHE_REDIS_MAX_RETRIES":                     "2",
		"APP_CACHE_REDIS_DIAL_TIMEOUT":                    "5",
		"APP_CACHE_REDIS_READ_TIMEOUT":                    "3",
		"APP_CACHE_REDIS_WRITE_TIMEOUT":                   "3",
		"APP_LOG_LEVEL":                                   "info",
		"APP_LOG_FORMAT":                                  "console",
		"APP_LOG_CONSOLE_FORMAT":                          "console",
		"APP_LOG_FILE_FORMAT":                             "json",
		"APP_LOG_OUTPUT":                                  "stdout",
		"APP_LOG_FILE_PATH":                               "./logs/app.log",
		"APP_LOG_MAX_SIZE":                                "100",
		"APP_LOG_MAX_BACKUPS":                             "7",
		"APP_LOG_MAX_AGE":                                 "30",
		"APP_I18N_DEFAULT_LOCALE":                         "zh-CN",
		"APP_I18N_FALLBACK_LOCALE":                        "zh-CN",
		"APP_I18N_SUPPORTED_LOCALES":                      "zh-CN,en-US",
		"APP_EXECUTOR_ENABLED":                            "true",
		"APP_STORAGE_DRIVER":                              "local",
		"APP_STORAGE_LOCAL_FS_TYPE":                       "basepath",
		"APP_STORAGE_LOCAL_BASE_PATH":                     "./data/uploads",
		"APP_STORAGE_LOCAL_PUBLIC_URL":                    "/uploads",
		"APP_STORAGE_LOCAL_ENABLE_WATCH":                  "false",
		"APP_STORAGE_LOCAL_WATCH_BUFFER_SIZE":             "100",
		"APP_STORAGE_S3_ENDPOINT":                         "https://s3.example.com",
		"APP_STORAGE_S3_REGION":                           "us-east-1",
		"APP_STORAGE_S3_BUCKET":                           "console-platform",
		"APP_STORAGE_S3_ACCESS_KEY_ID":                    "example",
		"APP_STORAGE_S3_SECRET_ACCESS_KEY":                "example",
		"APP_STORAGE_S3_USE_PATH_STYLE":                   "true",
		"APP_STORAGE_S3_PUBLIC_BASE_URL":                  "",
		"APP_STORAGE_MINIO_ENDPOINT":                      "http://127.0.0.1:9000",
		"APP_STORAGE_MINIO_REGION":                        "us-east-1",
		"APP_STORAGE_MINIO_BUCKET":                        "console-platform",
		"APP_STORAGE_MINIO_ACCESS_KEY_ID":                 "example",
		"APP_STORAGE_MINIO_SECRET_ACCESS_KEY":             "example",
		"APP_STORAGE_MINIO_USE_PATH_STYLE":                "true",
		"APP_STORAGE_MINIO_PUBLIC_BASE_URL":               "",
		"APP_SYSTEM_SEED_DEFAULTS_ON_START":               "true",
		"APP_SYSTEM_MAINTENANCE_CLEANUP_INTERVAL_SECONDS": "60",
		"APP_SYSTEM_MAINTENANCE_CLEANUP_BATCH_SIZE":       "100",
		"APP_WEBUI_ENABLED":                               "true",
		"APP_WEBUI_MOUNT_PATH":                            "/",
		"APP_WEBUI_DIST_DIR":                              "./web/app/build/client",
		"APP_WEBUI_PUBLIC_BASE_URL":                       "/",
		"APP_RPC_ENABLED":                                 "false",
		"APP_RPC_HOST":                                    "127.0.0.1",
		"APP_RPC_PORT":                                    "10099",
		"APP_RPC_READ_TIMEOUT":                            "10",
		"APP_RPC_WRITE_TIMEOUT":                           "10",
		"APP_RPC_IDLE_TIMEOUT":                            "30",
		"APP_AUTH_ENABLED":                                "true",
		"APP_AUTH_REGISTRATION_MODE":                      "direct",
		"APP_AUTH_ISSUER":                                 "console-platform",
		"APP_AUTH_AUDIENCE":                               "console-platform-api",
		"APP_AUTH_SIGNING_KEY":                            "example-signing-key-at-least-32-bytes",
		"APP_AUTH_ACCESS_TOKEN_TTL_SECONDS":               "900",
		"APP_AUTH_REFRESH_TOKEN_TTL_SECONDS":              "604800",
		"APP_AUTH_REFRESH_TOKEN_PEPPER":                   "example-refresh-pepper-at-least-32",
		"APP_AUTH_MFA_ISSUER":                             "console-platform",
		"APP_AUTH_MFA_SECRET_KEY":                         "example-mfa-secret-key-at-least-32",
		"APP_AUTH_LOGIN_MAX_FAILURES":                     "5",
		"APP_AUTH_LOGIN_LOCK_MINUTES":                     "15",
		"APP_AUTH_LOGIN_CAPTCHA_ENABLED":                  "false",
		"APP_AUTH_CAPTCHA_TTL_SECONDS":                    "120",
		"APP_AUTH_INVITATION_TTL_SECONDS":                 "86400",
		"APP_AUTH_EMAIL_VERIFICATION_TTL_SECONDS":         "86400",
		"APP_AUTH_PASSWORD_RESET_TTL_SECONDS":             "1800",
		"APP_AUTH_NOTIFICATION_DRIVER":                    "debug",
		"APP_AUTH_NOTIFICATION_RETRY_INTERVAL_SECONDS":    "60",
		"APP_AUTH_NOTIFICATION_RETRY_BATCH_SIZE":          "20",
		"APP_AUTH_NOTIFICATION_RETRY_MAX_ATTEMPTS":        "5",
		"APP_AUTH_SMTP_HOST":                              "127.0.0.1",
		"APP_AUTH_SMTP_PORT":                              "1025",
		"APP_AUTH_SMTP_USERNAME":                          "mailer",
		"APP_AUTH_SMTP_PASSWORD":                          "example-smtp-password",
		"APP_AUTH_SMTP_FROM":                              "no-reply@example.invalid",
		"APP_AUTH_SMTP_FROM_NAME":                         "${BRAND_PRODUCT_NAME:Console Platform}",
		"APP_AUTH_SMTP_SECURITY":                          "none",
		"APP_AUTH_PASSWORD_MIN_LENGTH":                    "8",
		"APP_AUTH_PASSWORD_REQUIRE_LOWER":                 "false",
		"APP_AUTH_PASSWORD_REQUIRE_UPPER":                 "false",
		"APP_AUTH_PASSWORD_REQUIRE_NUMBER":                "false",
		"APP_AUTH_PASSWORD_REQUIRE_SYMBOL":                "false",
		"APP_AUTH_CASBIN_RELOAD_INTERVAL_SECONDS":         "300",
		"APP_MIGRATION_AUTO_APPLY":                        "true",
		"APP_MIGRATION_DIR":                               "./internal/migrations",
		"APP_CORS_ENABLED":                                "true",
		"APP_CORS_ALLOW_ORIGINS":                          "*",
		"APP_CORS_ALLOW_METHODS":                          "GET,POST,PUT,DELETE,PATCH,OPTIONS",
		"APP_CORS_ALLOW_HEADERS":                          "Origin,Content-Type,X-Request-ID,Authorization",
		"APP_CORS_EXPOSE_HEADERS":                         "X-Request-ID",
		"APP_CORS_ALLOW_CREDENTIALS":                      "false",
		"APP_CORS_MAX_AGE":                                "3600",
		"AUTH_SIGNING_KEY":                                "example-signing-key-at-least-32-bytes",
		"AUTH_REFRESH_TOKEN_PEPPER":                       "example-refresh-pepper-at-least-32",
		"AUTH_MFA_SECRET_KEY":                             "example-mfa-secret-key-at-least-32",
		"AUTH_SMTP_HOST":                                  "127.0.0.1",
		"AUTH_SMTP_PORT":                                  "1025",
		"AUTH_SMTP_USERNAME":                              "mailer",
		"AUTH_SMTP_PASSWORD":                              "example-smtp-password",
		"AUTH_SMTP_FROM":                                  "no-reply@example.invalid",
		"AUTH_SMTP_FROM_NAME":                             "${BRAND_PRODUCT_NAME:Console Platform}",
		"AUTH_SMTP_SECURITY":                              "none",
	}

	switch fileName {
	case "config.production.example.yaml", "postgres-production.example.yaml":
		env["APP_SERVER_MODE"] = "release"
		env["APP_DB_DRIVER"] = "postgres"
		env["APP_AUTH_REGISTRATION_MODE"] = "disabled"
		env["APP_AUTH_NOTIFICATION_DRIVER"] = "smtp"
		env["APP_AUTH_SMTP_SECURITY"] = "starttls"
		env["APP_MIGRATION_AUTO_APPLY"] = "false"
		env["APP_CORS_ALLOW_ORIGINS"] = "https://admin.example.invalid"
	case "mysql-redis.example.yaml":
		env["APP_DB_DRIVER"] = "mysql"
		env["APP_CACHE_DRIVER"] = "redis"
	case "smtp-auth.example.yaml":
		env["APP_AUTH_REGISTRATION_MODE"] = "disabled"
		env["APP_AUTH_NOTIFICATION_DRIVER"] = "smtp"
	case "storage-media.example.yaml":
		env["APP_STORAGE_DRIVER"] = "local"
	}

	for key, value := range env {
		t.Setenv(key, value)
	}
}
