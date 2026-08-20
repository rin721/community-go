package handlers

import (
	servicedb "github.com/open-console/console-platform/internal/app/cliapp/services/db"
	"github.com/open-console/console-platform/pkg/cli"
)

// DBMigrationHandler 处理 db migrate 子命令。
type DBMigrationHandler struct{}

func NewDBMigrationHandler() *DBMigrationHandler {
	return &DBMigrationHandler{}
}

func (h *DBMigrationHandler) Execute(ctx *cli.Context) error {
	return servicedb.RunMigration(ctx.Context, ctx.GetString("config"), ctx.Args[0], ctx.Stdout)
}
