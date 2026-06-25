package server

import (
	"context"
	"errors"
	"fmt"
	"os"
	"os/signal"
	"syscall"

	"github.com/open-console/console-platform/internal/app"
	cliappadapters "github.com/open-console/console-platform/internal/app/cliapp/adapters"
	"github.com/open-console/console-platform/internal/app/cliapp/services/managed"
	"github.com/open-console/console-platform/types/constants"
)

// Run 装配应用、启动 HTTP 服务并等待系统信号、托管控制请求或启动错误。
func Run(configPath string) error {
	application, err := app.New(app.Options{
		ConfigPath: configPath,
	})
	if err != nil {
		return errors.Join(
			fmt.Errorf("failed to initialize application: %w", err),
			markManagedServerStopped(err.Error()),
		)
	}

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	defer signal.Stop(quit)

	manager := managed.NewManager()
	controlCtx, stopControlWatcher := context.WithCancel(context.Background())
	defer stopControlWatcher()
	control, err := cliappadapters.WatchManagedServiceControl(controlCtx, managed.ServiceServer, manager.ControlPath(managed.ServiceServer))
	if err != nil {
		controlErr := fmt.Errorf("initialize managed service control watcher: %w", err)
		ctx, cancel := context.WithTimeout(context.Background(), constants.AppShutdownTimeout)
		defer cancel()
		return errors.Join(
			controlErr,
			application.Shutdown(ctx),
			markManagedServerStopped(controlErr.Error()),
		)
	}

	errChan := make(chan error, 1)
	go func() {
		if err := application.Run(); err != nil {
			errChan <- err
		}
	}()

	var finalError string
	select {
	case sig := <-quit:
		application.Core.Logger.Info("received shutdown signal", "signal", sig.String())
	case req, ok := <-control:
		if ok {
			application.Core.Logger.Info("received CLI service control request", "action", req.Action, "pid", req.PID)
		}
	case err := <-errChan:
		application.Core.Logger.Error("server error", "error", err)
		finalError = err.Error()
	}

	ctx, cancel := context.WithTimeout(context.Background(), constants.AppShutdownTimeout)
	defer cancel()

	if err := application.Shutdown(ctx); err != nil {
		application.Core.Logger.Error("shutdown error", "error", err)
		return errors.Join(
			fmt.Errorf("shutdown error: %w", err),
			markManagedServerStopped(err.Error()),
		)
	}

	if err := markManagedServerStopped(finalError); err != nil {
		application.Core.Logger.Error("failed to persist managed service stop state", "error", err)
		return err
	}
	application.Core.Logger.Info("application exited gracefully")
	return nil
}

func markManagedServerStopped(lastError string) error {
	if err := managed.MarkManagedServiceStopped(managed.ServiceServer, lastError); err != nil {
		return fmt.Errorf("mark managed service stopped: %w", err)
	}
	return nil
}
