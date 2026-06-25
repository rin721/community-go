package output

import (
	"fmt"
	"io"
	"strings"

	cliconfig "github.com/open-console/console-platform/internal/app/cliapp/config"
	"github.com/open-console/console-platform/internal/app/cliapp/localization"
	appconfig "github.com/open-console/console-platform/internal/config"
)

func PrintDependencyServiceInfo(w io.Writer, service string, configPath string, localizers ...*localization.Localizer) error {
	localizer := firstLocalizer(localizers...)
	cfg, err := cliconfig.LoadConfig(configPath)
	if err != nil {
		return err
	}
	switch strings.ToLower(strings.TrimSpace(service)) {
	case "db":
		if err := writeDependencyInfo(w, "db: driver=%s target=%s\n", cfg.Database.Driver, databaseTarget(cfg)); err != nil {
			return err
		}
	case "iam":
		if err := writeDependencyInfo(w, "iam: enabled=%v issuer=%s\n", cfg.Auth.Enabled, cfg.Auth.Issuer); err != nil {
			return err
		}
	case "cache":
		if err := writeDependencyInfo(w, "cache: driver=%s redis=%s\n", cfg.Cache.Driver, cfg.Cache.Redis.Addr); err != nil {
			return err
		}
	case "storage":
		if err := writeDependencyInfo(w, "storage: driver=%s local=%s s3=%s minio=%s\n", cfg.Storage.Driver, cfg.Storage.Local.BasePath, cfg.Storage.S3.Bucket, cfg.Storage.MinIO.Bucket); err != nil {
			return err
		}
	}
	if err := writeDependencyInfo(w, "%s\n", localizer.T("cli.run.dependencyInfo.note")); err != nil {
		return err
	}
	return nil
}

func writeDependencyInfo(w io.Writer, format string, args ...any) error {
	if _, err := fmt.Fprintf(w, format, args...); err != nil {
		return fmt.Errorf("write dependency service info: %w", err)
	}
	return nil
}

func databaseTarget(cfg *appconfig.Config) string {
	switch cfg.Database.Driver {
	case appconfig.DatabaseDriverSQLite:
		return cfg.Database.SQLite.Path
	case appconfig.DatabaseDriverMySQL:
		return cfg.Database.MySQL.Database + "@" + cfg.Database.MySQL.Host
	case appconfig.DatabaseDriverPostgres:
		return cfg.Database.Postgres.Database + "@" + cfg.Database.Postgres.Host
	default:
		return ""
	}
}
