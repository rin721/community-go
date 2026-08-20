package handlers

import (
	"context"
	"fmt"

	clioutput "github.com/open-console/console-platform/internal/app/cliapp/output"
	servicedb "github.com/open-console/console-platform/internal/app/cliapp/services/db"
	"github.com/open-console/console-platform/pkg/cli"
)

type DBRunnerFunc func(context.Context, servicedb.OperationOptions) (servicedb.OperationResult, error)

// DBHandler 处理 db 命令。
type DBHandler struct {
	Runner DBRunnerFunc
}

func NewDBHandler() *DBHandler {
	return &DBHandler{}
}

func (h *DBHandler) Execute(ctx *cli.Context) error {
	opts := DBOptionsFromContext(ctx)
	if opts.Operation == "" {
		opts.Operation = servicedb.DefaultOperation
	}
	runner := h.Runner
	if runner == nil {
		runner = servicedb.RunOperation
	}
	result, err := runner(ContextWithFallback(ctx), opts)
	if err != nil {
		return err
	}
	if !opts.Apply {
		if _, err := fmt.Fprintln(ctx.Stdout, result.SQL); err != nil {
			return fmt.Errorf("write db operation sql: %w", err)
		}
		return nil
	}
	return clioutput.WriteDBOperationResult(ctx.Stdout, result.Message, result.SQL, opts.PrintSQL)
}

func DBOptionsFromContext(ctx *cli.Context) servicedb.OperationOptions {
	return servicedb.OperationOptions{
		ConfigPath: ctx.GetString("config"),
		Operation:  ctx.GetString("operation"),
		Apply:      ctx.GetBool("apply"),
		PrintSQL:   ctx.GetBool("print-sql"),
	}
}

func ContextWithFallback(ctx *cli.Context) context.Context {
	if ctx != nil && ctx.Context != nil {
		return ctx.Context
	}
	return context.Background()
}
