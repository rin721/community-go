package initapp

import (
	"fmt"

	"github.com/open-console/console-platform/internal/app/adapters"
	"github.com/open-console/console-platform/internal/config"
	"github.com/open-console/console-platform/internal/middleware"
	announcementhandler "github.com/open-console/console-platform/internal/modules/announcements/handler"
	communityhandler "github.com/open-console/console-platform/internal/modules/community/handler"
	iamhandler "github.com/open-console/console-platform/internal/modules/iam/handler"
	iamservice "github.com/open-console/console-platform/internal/modules/iam/service"
	systemhandler "github.com/open-console/console-platform/internal/modules/system/handler"
	"github.com/open-console/console-platform/internal/ports"
	httptransport "github.com/open-console/console-platform/internal/transport/http"
	rpctransport "github.com/open-console/console-platform/internal/transport/rpc"
	"github.com/open-console/console-platform/pkg/database"
	"github.com/open-console/console-platform/pkg/httpserver"
	"github.com/open-console/console-platform/pkg/i18n"
	"github.com/open-console/console-platform/pkg/logger"
	"github.com/open-console/console-platform/pkg/rpcserver"
	"github.com/open-console/console-platform/pkg/web"
)

// NewTransport 装配 HTTP、RPC 以及随传输层运行的后台任务。
//
// 该函数会在创建路由前把 Web 初始设置服务挂到模块依赖上；模块后台任务会被收集到
// Transport.Background，由 lifecycleapp 统一启动、回滚和关闭。
func NewTransport(core Core, infra Infrastructure, modules Modules, setupHandler httptransport.SetupHandler, setupStatusProvider httptransport.SetupStatusProvider) (Transport, error) {
	corsConfig, err := NewCORS(core.Config, core.Logger)
	if err != nil {
		return Transport{}, err
	}

	router, server, err := NewHTTPServer(
		core.Config,
		core.Logger,
		core.I18n,
		infra.Database,
		core.IDGenerator,
		corsConfig,
		modules.Announcements.Handler,
		modules.Community.Handler,
		modules.IAM.Handler,
		modules.System.Handler,
		setupHandler,
		setupStatusProvider,
		modules.IAM.Service,
	)
	if err != nil {
		return Transport{}, err
	}

	rpcServer, err := NewRPCServer(core.Config, core.Logger)
	if err != nil {
		return Transport{}, err
	}

	background := make([]BackgroundService, 0, 2)
	if modules.IAM.Lifecycle != nil {
		background = append(background, modules.IAM.Lifecycle)
	}
	if modules.System.Lifecycle != nil {
		background = append(background, modules.System.Lifecycle)
	}
	return Transport{
		Router:     router,
		HTTPServer: server,
		RPCServer:  rpcServer,
		Background: background,
	}, nil
}

// NewSilentTransport assembles transport without writing framework debug output
// to stdout or stderr. It is intended for CLI initialization paths that need
// route metadata but do not start the HTTP server.
func NewSilentTransport(core Core, infra Infrastructure, modules Modules, setupHandler httptransport.SetupHandler, setupStatusProvider httptransport.SetupStatusProvider) (Transport, error) {
	var transport Transport
	err := web.WithSilentGlobals(func() error {
		var err error
		transport, err = NewTransport(core, infra, modules, setupHandler, setupStatusProvider)
		return err
	})
	return transport, err
}

// NewCORS 生成中间件使用的 CORS 配置。
//
// 配置在这里完成默认值补齐、环境覆盖和校验，避免 HTTP router 需要了解配置来源细节。
func NewCORS(cfg *config.Config, log logger.Logger) (middleware.CORSConfig, error) {
	corsCfg := cfg.CORS
	corsCfg.DefaultConfig()
	corsCfg.OverrideConfig()

	if err := corsCfg.Validate(); err != nil {
		return middleware.CORSConfig{}, err
	}

	if corsCfg.Enabled {
		log.Info(
			"CORS middleware enabled",
			"allow_origins", corsCfg.AllowOrigins,
			"allow_credentials", corsCfg.AllowCredentials,
			"max_age", corsCfg.MaxAge,
		)
	} else {
		log.Info("CORS middleware disabled")
	}

	return middleware.CORSConfig{
		Enabled:          corsCfg.Enabled,
		AllowOrigins:     corsCfg.AllowOrigins,
		AllowMethods:     corsCfg.AllowMethods,
		AllowHeaders:     corsCfg.AllowHeaders,
		ExposeHeaders:    corsCfg.ExposeHeaders,
		AllowCredentials: corsCfg.AllowCredentials,
		MaxAge:           corsCfg.MaxAge,
	}, nil
}

// NewHTTPServer 创建 HTTP router 和 HTTP server 包装器。
//
// 参数来自 core、infra 与 modules 三个装配层级；函数只负责把它们适配到 transport/http 的依赖结构，
// 返回的 engine 供测试或上层观测使用，server 负责实际监听生命周期。
func NewHTTPServer(
	cfg *config.Config,
	log logger.Logger,
	i18nApp i18n.I18n,
	db database.Database,
	traceIDGenerator ports.IDGenerator,
	corsConfig middleware.CORSConfig,
	announcementsHandler *announcementhandler.Handler,
	communityHandler *communityhandler.Handler,
	iamHandler *iamhandler.Handler,
	systemHandler *systemhandler.Handler,
	setupHandler httptransport.SetupHandler,
	setupStatusProvider httptransport.SetupStatusProvider,
	iamService iamservice.Service,
) (*web.Engine, httpserver.HTTPServer, error) {
	middlewareCfg := middleware.DefaultMiddlewareConfig()
	middlewareCfg.CORS = corsConfig
	webUICfg := cfg.WebUI
	webUICfg.ApplyDefaults()

	engine := web.New(cfg.Server.Mode)
	router := adapters.NewHTTPEngine(engine)
	httptransport.NewRouter(httptransport.RouterDeps{
		Router:                       router,
		StaticSPA:                    router,
		Logger:                       log,
		I18n:                         i18nApp,
		Database:                     adapters.NewDatabase(db),
		TraceIDGenerator:             traceIDGenerator,
		Middleware:                   middlewareCfg,
		AnnouncementsHandler:         announcementsHandler,
		CommunityHandler:             communityHandler,
		CommunitySetupStatusProvider: setupStatusProvider,
		IAMHandler:                   iamHandler,
		SystemHandler:                systemHandler,
		SetupHandler:                 setupHandler,
		IAMAuth:                      iamService,
		IAMAuthz:                     iamService,
		WebUI: httptransport.WebUIDeps{
			Enabled:   webUICfg.EnabledValue(),
			MountPath: webUICfg.MountPath,
			DistDir:   webUICfg.DistDir,
		},
	})

	server, err := httpserver.New(engine, HTTPServerConfig(cfg), log)
	if err != nil {
		return nil, nil, fmt.Errorf("failed to create http server: %w", err)
	}

	return engine, server, nil
}

// NewRPCServer 创建 JSON-RPC 独立端口服务。
//
// 基础 RPC 方法始终注册；是否监听端口由 RPC 配置控制。
func NewRPCServer(cfg *config.Config, log logger.Logger) (rpcserver.Server, error) {
	registry := rpcserver.NewRegistry()
	if err := rpctransport.Register(adapters.NewRPCRegistry(registry)); err != nil {
		return nil, fmt.Errorf("failed to create rpc registry: %w", err)
	}

	server, err := rpcserver.New(registry, RPCServerConfig(cfg), log)
	if err != nil {
		return nil, fmt.Errorf("failed to create rpc server: %w", err)
	}
	return server, nil
}
