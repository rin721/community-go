package config

import (
	"fmt"
	"io"

	"github.com/open-console/console-platform/internal/app/cliapp/localization"
	appconfig "github.com/open-console/console-platform/internal/config"
)

func PrintConfigSummary(stdout io.Writer, configPath string, localizers ...*localization.Localizer) error {
	localizer := firstLocalizer(localizers...)
	cfg, err := LoadConfig(configPath)
	if err != nil {
		return err
	}
	if err := writeConfigSummary(stdout, "%s: %s\n", localizer.T("cli.config.summary.configFile"), configPath); err != nil {
		return err
	}
	if err := writeConfigSummary(stdout, "%s: %s:%d\n", localizer.T("cli.config.summary.http"), cfg.Server.Host, cfg.Server.Port); err != nil {
		return err
	}
	if err := writeConfigSummary(stdout, "%s: %s %s\n", localizer.T("cli.config.summary.database"), cfg.Database.Driver, cliDatabaseTarget(cfg)); err != nil {
		return err
	}
	if err := writeConfigSummary(stdout, "%s: %s\n", localizer.T("cli.config.summary.cache"), cfg.Cache.Driver); err != nil {
		return err
	}
	if err := writeConfigSummary(stdout, "%s: %s\n", localizer.T("cli.config.summary.storage"), cfg.Storage.Driver); err != nil {
		return err
	}
	if err := writeConfigSummary(stdout, "%s: %v\n", localizer.T("cli.config.summary.iam"), cfg.Auth.Enabled); err != nil {
		return err
	}
	if cfg.Logger.FilePath != "" {
		if err := writeConfigSummary(stdout, "%s: %s\n", localizer.T("cli.config.summary.appLog"), cfg.Logger.FilePath); err != nil {
			return err
		}
	}
	return nil
}

func writeConfigSummary(stdout io.Writer, format string, args ...any) error {
	if _, err := fmt.Fprintf(stdout, format, args...); err != nil {
		return fmt.Errorf("write config summary: %w", err)
	}
	return nil
}

func firstLocalizer(localizers ...*localization.Localizer) *localization.Localizer {
	if len(localizers) > 0 && localizers[0] != nil {
		return localizers[0]
	}
	return localization.ForArgs(nil)
}

func cliDatabaseTarget(cfg *appconfig.Config) string {
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
