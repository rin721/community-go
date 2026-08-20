package initservice

import (
	"context"
	"errors"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/open-console/console-platform/internal/app/initapp"
	"github.com/open-console/console-platform/internal/app/initcenter"
	"github.com/open-console/console-platform/internal/app/lifecycleapp"
	appconfig "github.com/open-console/console-platform/internal/config"
	"github.com/open-console/console-platform/pkg/database"
	"github.com/open-console/console-platform/pkg/logger"
	"github.com/open-console/console-platform/types/constants"
)

// InitializationInput 描述一次交互式初始化需要的输入。
type InitializationInput struct {
	ConfigPath         string
	OrgCode            string
	OrgName            string
	AdminUsername      string
	AdminEmail         string
	AdminDisplayName   string
	AdminPassword      string
	CreateServiceToken bool
	ServiceTokenDays   int
	ServiceTokenRemark string
}

// InspectInitializationStatus 装配最小运行时并读取统一初始化中心状态。
func InspectInitializationStatus(ctx context.Context, configPath string) (status initcenter.Status, err error) {
	if configPath == "" {
		configPath = constants.AppDefaultConfigPath
	}
	center, cleanup, err := newBootstrapCenter(configPath, true, nil)
	if err != nil {
		return initcenter.Status{}, err
	}
	defer func() {
		err = mergeBootstrapCenterCleanupError(err, cleanup())
	}()
	return center.Status(ctx)
}

func SetupSchema(ctx context.Context, configPath string) (schema initcenter.SetupSchema, err error) {
	center, cleanup, err := newBootstrapCenter(configPath, false, nil)
	if err != nil {
		return initcenter.SetupSchema{}, err
	}
	defer func() {
		err = mergeBootstrapCenterCleanupError(err, cleanup())
	}()
	return center.Schema(ctx)
}

func SaveSetupConfig(ctx context.Context, configPath string, stepKey string, values map[string]any) (result initcenter.ConfigSaveResult, err error) {
	center, cleanup, err := newBootstrapCenter(configPath, false, nil)
	if err != nil {
		return initcenter.ConfigSaveResult{}, err
	}
	defer func() {
		err = mergeBootstrapCenterCleanupError(err, cleanup())
	}()
	return center.SaveConfig(ctx, stepKey, initcenter.Input{Source: initcenter.SourceCLI, Mode: initcenter.ModeFirstRun}, values, true, true)
}

// ExecuteInitialization 执行数据库、IAM 和系统默认数据初始化。
//
// 函数会装配最小可运行应用图来复用真实服务逻辑，但不会启动 HTTP/RPC 监听；defer 中统一关闭已创建资源，
// 避免初始化命令留下数据库、缓存或后台任务句柄。
func ExecuteInitialization(ctx context.Context, stdout io.Writer, input InitializationInput) (err error) {
	if input.ConfigPath == "" {
		input.ConfigPath = constants.AppDefaultConfigPath
	}
	core, err := newBootstrapCore(input.ConfigPath)
	if err != nil {
		return err
	}
	infra, err := newBootstrapInfrastructure(core)
	if err != nil {
		return err
	}
	var transport initapp.Transport
	defer func() {
		shutdownCtx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()
		err = mergeInitializationShutdownError(err, lifecycleapp.Shutdown(shutdownCtx, core, infra, transport))
	}()

	var iam initapp.IAMModule
	if core.Config.Auth.Enabled {
		if err := initapp.ApplyExplicitMigrations(ctx, core, infra); err != nil {
			return err
		}
		iam, err = initapp.NewIAMModule(core, infra)
		if err != nil {
			return err
		}
	}
	system := initapp.NewSystemModule(core, infra, iam)
	modules := initapp.Modules{IAM: iam, System: system}
	center := initcenter.New(core, infra, modules, input.ConfigPath, stdout)
	if modules.IAM.Handler != nil {
		modules.IAM.Handler.UseSetupService(center.IAMSetupService())
	}
	if modules.Community.Handler != nil {
		modules.Community.Handler.UseSetupStatusProvider(center)
	}
	transport, err = initapp.NewSilentTransport(core, infra, modules, initcenter.NewHandler(center, core.Logger, initcenter.HandlerConfigFromAppConfig(core.Config)), center)
	if err != nil {
		return err
	}

	_, err = center.Run(ctx, initcenter.Input{
		Source:             initcenter.SourceCLI,
		Mode:               initcenter.ModeFirstRun,
		OrgCode:            input.OrgCode,
		OrgName:            input.OrgName,
		AdminUsername:      input.AdminUsername,
		AdminEmail:         input.AdminEmail,
		AdminDisplayName:   input.AdminDisplayName,
		AdminPassword:      input.AdminPassword,
		CreateServiceToken: input.CreateServiceToken,
		ServiceTokenDays:   input.ServiceTokenDays,
		ServiceTokenRemark: input.ServiceTokenRemark,
	})
	return err
}

func newBootstrapCore(configPath string) (initapp.Core, error) {
	configManager, cfg, err := initapp.LoadConfig(configPath)
	if err != nil {
		return initapp.Core{}, err
	}
	cfg.I18n.Resources = resolveBootstrapResourceDirs(configPath, cfg.I18n.Resources)
	i18nApp, i18nUtils, err := initapp.NewI18n(cfg)
	if err != nil {
		return initapp.Core{}, err
	}
	return initapp.Core{
		Config:        cfg,
		ConfigManager: configManager,
		Logger:        silentLogger{},
		I18n:          i18nApp,
		I18nUtils:     i18nUtils,
		IDGenerator:   initapp.NewIDGenerator(),
	}, nil
}

func resolveBootstrapResourceDirs(configPath string, resources map[string]string) map[string]string {
	resolved := make(map[string]string, len(resources))
	for namespace, dir := range resources {
		resolved[namespace] = resolveBootstrapResourceDir(configPath, dir)
	}
	return resolved
}

func resolveBootstrapResourceDir(configPath string, resourceDir string) string {
	resourceDir = strings.TrimSpace(resourceDir)
	if resourceDir == "" {
		return resourceDir
	}
	if filepath.IsAbs(resourceDir) {
		return resourceDir
	}
	candidates := []string{resourceDir}
	if cwd, err := os.Getwd(); err == nil && cwd != "" {
		for dir := cwd; dir != ""; dir = filepath.Dir(dir) {
			candidates = append(candidates, filepath.Join(dir, resourceDir))
			parent := filepath.Dir(dir)
			if parent == dir {
				break
			}
		}
	}
	if configPath != "" {
		candidates = append(candidates, filepath.Join(filepath.Dir(configPath), resourceDir))
	}
	for _, candidate := range candidates {
		if stat, err := os.Stat(candidate); err == nil && stat.IsDir() {
			if abs, err := filepath.Abs(candidate); err == nil {
				return abs
			}
			return candidate
		}
	}
	return resourceDir
}

func newBootstrapCenter(configPath string, requireDatabase bool, stdout io.Writer) (*initcenter.Service, func() error, error) {
	if configPath == "" {
		configPath = constants.AppDefaultConfigPath
	}
	core, err := newBootstrapCore(configPath)
	if err != nil {
		return nil, func() error { return nil }, err
	}
	db, err := newSilentDatabase(core.Config)
	if err != nil && requireDatabase {
		return nil, func() error { return nil }, err
	}
	infra := initapp.Infrastructure{Database: db}
	cleanup := func() error {
		return closeBootstrapCenterDatabase(db)
	}
	return initcenter.New(core, infra, initapp.Modules{}, configPath, stdout), cleanup, nil
}

func newBootstrapInfrastructure(core initapp.Core) (infra initapp.Infrastructure, err error) {
	defer func() {
		if err != nil {
			err = errors.Join(err, closePartialBootstrapInfrastructure(infra))
		}
	}()
	db, err := newSilentDatabase(core.Config)
	if err != nil {
		return infra, err
	}
	infra.Database = db
	cacheClient, err := initapp.NewCache(core.Config, core.Logger)
	if err != nil {
		return infra, err
	}
	infra.Cache = cacheClient
	executorManager, err := initapp.NewExecutor(core.Config, core.Logger)
	if err != nil {
		return infra, err
	}
	infra.Executor = executorManager
	storageService, err := initapp.NewStorage(core.Config, core.Logger)
	if err != nil {
		return infra, err
	}
	infra.Storage = storageService
	return infra, nil
}

func newSilentDatabase(cfg *appconfig.Config) (database.Database, error) {
	dbCfg := initapp.DatabaseConfig(cfg)
	dbCfg.Silent = true
	db, err := database.New(dbCfg)
	if err != nil {
		return nil, err
	}
	return db, nil
}

type silentLogger struct{}

func (silentLogger) Debug(string, ...interface{}) {}
func (silentLogger) Info(string, ...interface{})  {}
func (silentLogger) Warn(string, ...interface{})  {}
func (silentLogger) Error(string, ...interface{}) {}
func (silentLogger) Fatal(string, ...interface{}) {}

func (l silentLogger) With(...interface{}) logger.Logger { return l }
func (silentLogger) Sync() error                         { return nil }
func (silentLogger) Reload(*logger.Config) error         { return nil }

func mergeInitializationShutdownError(runErr error, shutdownErr error) error {
	if shutdownErr == nil {
		return runErr
	}
	wrappedShutdownErr := fmt.Errorf("shutdown initialization runtime: %w", shutdownErr)
	if runErr == nil {
		return wrappedShutdownErr
	}
	return errors.Join(runErr, wrappedShutdownErr)
}

func mergeBootstrapCenterCleanupError(runErr error, cleanupErr error) error {
	if cleanupErr == nil {
		return runErr
	}
	wrappedCleanupErr := fmt.Errorf("cleanup bootstrap center: %w", cleanupErr)
	if runErr == nil {
		return wrappedCleanupErr
	}
	return errors.Join(runErr, wrappedCleanupErr)
}

func closeBootstrapCenterDatabase(db database.Database) error {
	if db == nil {
		return nil
	}
	if err := db.Close(); err != nil {
		return fmt.Errorf("database close: %w", err)
	}
	return nil
}

func closePartialBootstrapInfrastructure(infra initapp.Infrastructure) error {
	var joined error
	if infra.Storage != nil {
		if err := infra.Storage.Close(); err != nil {
			joined = errors.Join(joined, fmt.Errorf("storage close: %w", err))
		}
	}
	if infra.Executor != nil {
		if err := infra.Executor.Shutdown(); err != nil {
			joined = errors.Join(joined, fmt.Errorf("executor shutdown: %w", err))
		}
	}
	if infra.Cache != nil {
		if err := infra.Cache.Close(); err != nil {
			joined = errors.Join(joined, fmt.Errorf("cache close: %w", err))
		}
	}
	if infra.Database != nil {
		if err := infra.Database.Close(); err != nil {
			joined = errors.Join(joined, fmt.Errorf("database close: %w", err))
		}
	}
	return joined
}
