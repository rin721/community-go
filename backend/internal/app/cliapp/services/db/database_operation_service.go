package db

import (
	"context"
	"errors"
	"fmt"

	"github.com/open-console/console-platform/internal/app/initapp"
	appconfig "github.com/open-console/console-platform/internal/config"
)

const (
	OperationDatabase = "database"
	DefaultOperation  = OperationDatabase
)

// OperationOptions 保存一次 db 命令调用解析后的业务选项。
type OperationOptions struct {
	ConfigPath string
	Operation  string
	Apply      bool
	PrintSQL   bool
}

// OperationResult 描述 db 操作执行后需要展示的结果。
type OperationResult struct {
	Message string
	SQL     string
	Applied bool
}

// RunOperation 根据 operation 分派 SQL 预览或数据库执行路径。
func RunOperation(ctx context.Context, opts OperationOptions) (result OperationResult, err error) {
	core, err := initapp.NewCore(opts.ConfigPath)
	if err != nil {
		return OperationResult{}, fmt.Errorf("initialize core: %w", err)
	}
	defer func() {
		if core.Logger != nil {
			err = errors.Join(err, syncLogger(core.Logger))
		}
	}()

	if opts.Operation == OperationDatabase && !opts.Apply {
		sql, err := SQLForPrint(opts, core.Config.Database)
		if err != nil {
			return OperationResult{}, err
		}
		return OperationResult{SQL: sql}, nil
	}

	dbConn, err := initapp.NewDatabase(core.Config)
	if err != nil {
		return OperationResult{}, fmt.Errorf("initialize database: %w", err)
	}
	defer func() {
		err = errors.Join(err, closeDatabaseResource(dbConn))
	}()

	switch opts.Operation {
	case OperationDatabase:
		sql, err := ApplyDatabase(ctx, dbConn, core.Config.Database.Driver, databaseName(core.Config.Database))
		if err != nil {
			return OperationResult{}, err
		}
		return OperationResult{Message: "database create applied", SQL: sql, Applied: true}, nil
	default:
		return OperationResult{}, fmt.Errorf("unsupported db operation: %s", opts.Operation)
	}
}

// SQLForPrint 集中处理可无副作用生成 SQL 的 db 操作。
func SQLForPrint(opts OperationOptions, cfg appconfig.DatabaseConfig) (string, error) {
	switch opts.Operation {
	case OperationDatabase:
		return DatabaseSQL(cfg.Driver, databaseName(cfg))
	default:
		return "", fmt.Errorf("unsupported db operation: %s", opts.Operation)
	}
}

func databaseName(cfg appconfig.DatabaseConfig) string {
	switch cfg.Driver {
	case appconfig.DatabaseDriverSQLite:
		return cfg.SQLite.Path
	case appconfig.DatabaseDriverMySQL:
		return cfg.MySQL.Database
	case appconfig.DatabaseDriverPostgres:
		return cfg.Postgres.Database
	default:
		return ""
	}
}

type loggerSyncer interface {
	Sync() error
}

func syncLogger(syncer loggerSyncer) error {
	if syncer == nil {
		return nil
	}
	if err := syncer.Sync(); err != nil {
		return fmt.Errorf("sync db command logger: %w", err)
	}
	return nil
}
