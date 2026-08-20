package handlers

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"strings"
	"time"

	"github.com/open-console/console-platform/internal/app/initapp"
	"github.com/open-console/console-platform/internal/app/lifecycleapp"
	iamservice "github.com/open-console/console-platform/internal/modules/iam/service"
	"github.com/open-console/console-platform/pkg/cli"
)

// IAMBootstrapHandler 处理 iam bootstrap-admin 子命令。
type IAMBootstrapHandler struct{}

func NewIAMBootstrapHandler() *IAMBootstrapHandler {
	return &IAMBootstrapHandler{}
}

func (h *IAMBootstrapHandler) Execute(ctx *cli.Context) (err error) {
	password := ctx.GetString("password")
	if ctx.GetBool("password-stdin") {
		raw, err := io.ReadAll(ctx.Stdin)
		if err != nil {
			return err
		}
		password = strings.TrimSpace(string(raw))
	}
	if password == "" {
		return &cli.UsageError{Command: ctx.CommandPath, Message: "password is required; pass --password or --password-stdin"}
	}

	core, err := initapp.NewCore(ctx.GetString("config"))
	if err != nil {
		return fmt.Errorf("initialize core: %w", err)
	}
	shutdownHandlesLogger := false
	defer func() {
		if shutdownHandlesLogger || core.Logger == nil {
			return
		}
		err = errors.Join(err, syncIAMBootstrapLogger(core.Logger))
	}()
	infra, err := initapp.NewInfrastructure(core)
	if err != nil {
		return err
	}
	shutdownHandlesLogger = true
	defer func() {
		shutdownCtx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()
		err = mergeIAMBootstrapShutdownError(err, lifecycleapp.Shutdown(shutdownCtx, core, infra, initapp.Transport{}))
	}()
	if err := initapp.ApplyConfiguredMigrations(core, infra); err != nil {
		return err
	}
	module, err := initapp.NewIAMModule(core, infra)
	if err != nil {
		return err
	}
	principal, err := module.Service.BootstrapAdmin(ctx.Context, iamservice.BootstrapAdminInput{
		OrgCode:     ctx.GetString("org-code"),
		OrgName:     ctx.GetString("org-name"),
		Username:    ctx.GetString("username"),
		Email:       ctx.GetString("email"),
		DisplayName: ctx.GetString("display-name"),
		Password:    password,
	})
	if err != nil {
		return err
	}
	return json.NewEncoder(ctx.Stdout).Encode(principal)
}

func mergeIAMBootstrapShutdownError(runErr, shutdownErr error) error {
	if shutdownErr == nil {
		return runErr
	}
	wrappedShutdownErr := fmt.Errorf("shutdown iam bootstrap runtime: %w", shutdownErr)
	if runErr == nil {
		return wrappedShutdownErr
	}
	return errors.Join(runErr, wrappedShutdownErr)
}

type iamBootstrapLoggerSyncer interface {
	Sync() error
}

func syncIAMBootstrapLogger(syncer iamBootstrapLoggerSyncer) error {
	if syncer == nil {
		return nil
	}
	if err := syncer.Sync(); err != nil {
		return fmt.Errorf("sync iam bootstrap logger: %w", err)
	}
	return nil
}
