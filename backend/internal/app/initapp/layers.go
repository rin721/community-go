// Package initapp 定义应用装配所需的分层结构和构建函数。
//
// 本包位于组合根内部，负责把配置转换为可注入的核心服务、基础设施、业务模块和传输层。
package initapp

// 本文件属于应用初始化装配层，负责把配置、基础设施、业务模块或传输层拼接为可运行的分层对象。

import (
	"context"

	"github.com/open-console/console-platform/internal/config"
	announcementhandler "github.com/open-console/console-platform/internal/modules/announcements/handler"
	announcementservice "github.com/open-console/console-platform/internal/modules/announcements/service"
	communityhandler "github.com/open-console/console-platform/internal/modules/community/handler"
	communityservice "github.com/open-console/console-platform/internal/modules/community/service"
	iamhandler "github.com/open-console/console-platform/internal/modules/iam/handler"
	iamrepository "github.com/open-console/console-platform/internal/modules/iam/repository"
	iamservice "github.com/open-console/console-platform/internal/modules/iam/service"
	systemhandler "github.com/open-console/console-platform/internal/modules/system/handler"
	systemservice "github.com/open-console/console-platform/internal/modules/system/service"
	"github.com/open-console/console-platform/pkg/cache"
	"github.com/open-console/console-platform/pkg/database"
	"github.com/open-console/console-platform/pkg/executor"
	"github.com/open-console/console-platform/pkg/httpserver"
	"github.com/open-console/console-platform/pkg/i18n"
	"github.com/open-console/console-platform/pkg/logger"
	"github.com/open-console/console-platform/pkg/rpcserver"
	"github.com/open-console/console-platform/pkg/storage"
	"github.com/open-console/console-platform/pkg/utils"
	"github.com/open-console/console-platform/pkg/web"
)

// Core 保存所有层共享的核心服务。
//
// Core 是后续装配的输入边界：基础设施、模块和传输层只能依赖这里暴露的跨层能力。
type Core struct {
	Config        *config.Config
	ConfigManager config.Manager
	Logger        logger.Logger
	I18n          i18n.I18n
	I18nUtils     *utils.I18nUtils
	IDGenerator   utils.IDGenerator
}

// Infrastructure 保存可被业务模块和传输层复用的基础设施组件。
//
// Database 是启动期硬依赖；Cache、Executor 和 Storage 可能因配置禁用而为 nil，
// 调用方必须把 nil 视为“该能力未启用”。
type Infrastructure struct {
	Database database.Database
	Cache    cache.Cache
	Executor executor.Manager
	Storage  storage.Storage
}

// Modules 汇总当前应用启用的业务模块。
type Modules struct {
	Announcements AnnouncementsModule
	Community     CommunityModule
	IAM           IAMModule
	System        SystemModule
}

// IAMModule 保存 IAM 模块对其他层暴露的仓储、服务和 HTTP 处理器。
//
// 当认证模块被配置关闭时，该结构体会保持零值，调用方需要把 nil 字段视为能力未启用。
type IAMModule struct {
	Repository iamrepository.Repository
	Service    iamservice.Service
	Handler    *iamhandler.Handler
	Notifier   *iamservice.ReloadableNotifier
	Lifecycle  BackgroundService
}

// AnnouncementsModule 保存公告示例业务模块的服务和 HTTP 处理器。
type AnnouncementsModule struct {
	Service announcementservice.Service
	Handler *announcementhandler.Handler
}

// CommunityModule 保存视频社区业务模块的服务和 HTTP 处理器。
type CommunityModule struct {
	Service   communityservice.Service
	Handler   *communityhandler.Handler
	Lifecycle BackgroundService
}

// SystemModule 保存系统管理模块的服务和 HTTP 处理器。
type SystemModule struct {
	Service   systemservice.Service
	Handler   *systemhandler.Handler
	Lifecycle BackgroundService
}

// Transport 保存对外服务入口。
type Transport struct {
	Router     *web.Engine
	HTTPServer httpserver.HTTPServer
	RPCServer  rpcserver.Server
	Background []BackgroundService
}

// BackgroundService 表示随应用运行期启动和关闭的后台任务。
//
// Start 接收主运行上下文；Shutdown 接收带超时的关闭上下文。实现必须支持重复或空状态调用，
// 以便启动失败回滚和应用关闭流程可以做 best-effort 清理。
type BackgroundService interface {
	Start(context.Context) error
	Shutdown(context.Context) error
}
