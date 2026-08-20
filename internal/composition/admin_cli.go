package composition

import (
	"context"
	"fmt"

	"github.com/rin721/go-scaffold-template/internal/kernel"
	databaseapp "github.com/rin721/go-scaffold-template/internal/kernel/app/database"
	kernelcomposition "github.com/rin721/go-scaffold-template/internal/kernel/composition"
	"github.com/rin721/go-scaffold-template/internal/kernel/config"
	"github.com/rin721/go-scaffold-template/internal/module/auth"
	authconfig "github.com/rin721/go-scaffold-template/internal/module/auth/binding/config"
	migrationbinding "github.com/rin721/go-scaffold-template/internal/module/todo/binding/migration"
	"github.com/rin721/go-scaffold-template/pkg/supervisor"
)

type adminExecutor struct{ application *Application }

func (e adminExecutor) ResetPassword(ctx context.Context, username, password string) error {
	return e.application.executeAdminResetPassword(ctx, username, password)
}

func (a *Application) executeAdminResetPassword(ctx context.Context, username, password string) error {
	if a == nil {
		return fmt.Errorf("application is nil")
	}
	loader := config.New(
		config.FileSource(a.config.ConfigPath),
		config.EnvSource(a.config.EnvironmentPrefix),
	)
	runtime, err := kernel.New(loader, kernel.Options{Logging: a.config.Logging})
	if err != nil {
		return fmt.Errorf("create kernel: %w", err)
	}
	capabilities, err := kernelcomposition.Compose(runtime, kernelcomposition.Options{
		Logger: kernelcomposition.ConfiguredLoggerReplacement,
	})
	if err != nil {
		return fmt.Errorf("compose application capabilities: %w", err)
	}
	bindings := append([]config.Binding{
		kernelcomposition.HTTPConfiguration(),
	}, applicationOwnedConfigurationBindings()...)
	coordinator, err := kernel.NewCoordinator(runtime, bindings...)
	if err != nil {
		return fmt.Errorf("create configuration coordinator: %w", err)
	}
	candidate, err := coordinator.Prepare(ctx)
	if err != nil {
		return fmt.Errorf("prepare application configuration: %w", err)
	}
	authConfig, err := authconfig.Decode(candidate)
	if err != nil {
		return err
	}
	databaseConfig, err := databaseapp.Decode(candidate)
	if err != nil {
		return err
	}
	databaseAccess, err := adaptDatabaseAccess(capabilities.Database)
	if err != nil {
		return err
	}
	compatibility, err := migrationbinding.NewCompatibility(databaseAccess)
	if err != nil {
		return err
	}
	completion, err := migrationbinding.NewCompletion(databaseConfig.PackageConfig())
	if err != nil {
		return err
	}
	policies, err := operationPolicies()
	if err != nil {
		return err
	}
	authModule, err := auth.NewLocal(auth.Dependencies{
		Clock: capabilities.Clock, Logger: capabilities.Logger, Config: authConfig,
		Policies: policies, AdminAccess: databaseAccess,
	})
	if err != nil {
		return fmt.Errorf("compose local auth module: %w", err)
	}
	if authModule.Admin == nil {
		return fmt.Errorf("local admin service is unavailable")
	}
	owner, err := newTodoOperationSupervisor([]supervisor.Participant{coordinator})
	if err != nil {
		return fmt.Errorf("create admin operation supervisor: %w", err)
	}
	if err := owner.RunOperation(ctx, func(operationCtx context.Context) error {
		if err := compatibility.Check(operationCtx); err != nil {
			return fmt.Errorf("verify admin migration compatibility: %w", err)
		}
		if err := completion.Verify(operationCtx); err != nil {
			return fmt.Errorf("verify admin migration completion: %w", err)
		}
		return authModule.Admin.ResetPassword(operationCtx, username, password)
	}); err != nil {
		return fmt.Errorf("execute admin password reset: %w", err)
	}
	return nil
}
