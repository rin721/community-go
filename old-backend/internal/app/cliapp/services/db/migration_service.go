package db

import (
	"context"
	"errors"
	"fmt"
	"io"

	"github.com/open-console/console-platform/internal/app/initapp"
	"github.com/open-console/console-platform/pkg/migrator"
)

// RunMigration 执行迁移或输出迁移状态。
func RunMigration(ctx context.Context, configPath string, operation string, stdout io.Writer) (err error) {
	core, err := initapp.NewCore(configPath)
	if err != nil {
		return fmt.Errorf("initialize core: %w", err)
	}
	defer func() {
		if core.Logger != nil {
			err = errors.Join(err, syncLogger(core.Logger))
		}
	}()
	dbConn, err := initapp.NewDatabase(core.Config)
	if err != nil {
		return fmt.Errorf("initialize database: %w", err)
	}
	defer func() {
		err = errors.Join(err, closeDatabaseResource(dbConn))
	}()
	core.Config.Migration.ApplyDefaults()
	runner, err := migrator.New(dbConn, migrator.Config{Driver: string(core.Config.Database.Driver), Dir: core.Config.Migration.Dir})
	if err != nil {
		return err
	}
	switch operation {
	case "up":
		if err := runner.Up(ctx); err != nil {
			return err
		}
		if _, err := fmt.Fprintln(stdout, "migrations applied"); err != nil {
			return err
		}
	case "down":
		if err := runner.Down(ctx); err != nil {
			return err
		}
		if _, err := fmt.Fprintln(stdout, "migration rolled back"); err != nil {
			return err
		}
	case "status":
		return runner.Status(ctx, stdout)
	}
	return nil
}
