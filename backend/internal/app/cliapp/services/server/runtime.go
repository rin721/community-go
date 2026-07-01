package server

import (
	"context"
	"errors"
	"fmt"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/open-console/console-platform/internal/app"
	cliappadapters "github.com/open-console/console-platform/internal/app/cliapp/adapters"
	"github.com/open-console/console-platform/internal/app/cliapp/services/managed"
	"github.com/open-console/console-platform/internal/modules/deploy/gate"
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

	// ── 新增：StartupGate（用于热启动同步） ────────────────────────────
	ipcAddr := os.Getenv(cliappadapters.DeployIPCAddrEnvKey)
	if ipcAddr != "" {
		heartbeatInterval := 10 * time.Second
		gateBuffer := 15 * time.Second

		// 从应用配置读取自定义心跳和缓冲时间
		if application.Core.Config != nil && application.Core.Config.Deploy.Enabled {
			cfg := application.Core.Config.Deploy
			if cfg.HeartbeatIntervalSeconds > 0 {
				heartbeatInterval = time.Duration(cfg.HeartbeatIntervalSeconds) * time.Second
			}
			if cfg.GateBufferSeconds > 0 {
				gateBuffer = time.Duration(cfg.GateBufferSeconds) * time.Second
			}
		}

		application.Core.Logger.Info("startup gate: waiting for version confirmation from old process", "ipc", ipcAddr)
		err := gate.Run(context.Background(), gate.Config{
			IPCAddr:           ipcAddr,
			HeartbeatInterval: heartbeatInterval,
			GateBuffer:        gateBuffer,
		})
		if err != nil {
			if errors.Is(err, gate.ErrRestartRequired) {
				application.Core.Logger.Info("startup gate: current build is outdated, shutting down this instance")
				// 立即关闭应用资源并退出
				shutdownCtx, shutdownCancel := context.WithTimeout(context.Background(), constants.AppShutdownTimeout)
				defer shutdownCancel()
				_ = application.Shutdown(shutdownCtx)
				_ = markManagedServerStopped(err.Error())
				return err
			}
			application.Core.Logger.Warn("startup gate encountered error, proceeding anyway", "error", err)
		} else {
			application.Core.Logger.Info("startup gate: version confirmed, entering business lifecycle")
		}
	}
	// ── 新增结束 ───────────────────────────────────────────────────────

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
