package initapp

// 本文件属于应用初始化装配层，负责把配置、基础设施、业务模块或传输层拼接为可运行的分层对象。

import (
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/open-console/console-platform/internal/app/adapters"
	"github.com/open-console/console-platform/internal/config"
	announcementhandler "github.com/open-console/console-platform/internal/modules/announcements/handler"
	announcementrepository "github.com/open-console/console-platform/internal/modules/announcements/repository"
	announcementservice "github.com/open-console/console-platform/internal/modules/announcements/service"
	iamhandler "github.com/open-console/console-platform/internal/modules/iam/handler"
	iaminfrastructure "github.com/open-console/console-platform/internal/modules/iam/infrastructure"
	iammodel "github.com/open-console/console-platform/internal/modules/iam/model"
	iamrepository "github.com/open-console/console-platform/internal/modules/iam/repository"
	iamservice "github.com/open-console/console-platform/internal/modules/iam/service"
	systemhandler "github.com/open-console/console-platform/internal/modules/system/handler"
	systemmodel "github.com/open-console/console-platform/internal/modules/system/model"
	systemrepository "github.com/open-console/console-platform/internal/modules/system/repository"
	systemservice "github.com/open-console/console-platform/internal/modules/system/service"
	"github.com/open-console/console-platform/pkg/authorization"
	"github.com/open-console/console-platform/pkg/crypto"
	mailpkg "github.com/open-console/console-platform/pkg/mail"
	"github.com/open-console/console-platform/pkg/token"
)

// NewModules 根据配置装配业务模块。
func NewModules(core Core, infra Infrastructure) (Modules, error) {
	if err := ApplyConfiguredMigrations(core, infra); err != nil {
		return Modules{}, err
	}

	var iamModule IAMModule
	if core.Config.Auth.Enabled {
		module, err := NewIAMModule(core, infra)
		if err != nil {
			return Modules{}, err
		}
		if err := module.Service.LoadPolicies(context.Background()); err != nil && core.Logger != nil {
			core.Logger.Warn("failed to load iam policies", "error", err)
		}
		iamModule = module
	} else if core.Logger != nil {
		core.Logger.Info("iam module disabled")
	}

	announcementsModule := NewAnnouncementsModule(core, infra)
	systemModule := NewSystemModule(core, infra, iamModule)
	return Modules{
		Announcements: announcementsModule,
		IAM:           iamModule,
		System:        systemModule,
	}, nil
}

// ApplyConfiguredMigrations 根据运行配置决定是否在服务启动阶段执行数据库迁移。
//
// 该函数会先补齐迁移配置默认值；当 AutoApply 关闭时不产生副作用。返回值表示配置校验或迁移执行错误。
func ApplyConfiguredMigrations(core Core, infra Infrastructure) error {
	core.Config.Migration.ApplyDefaults()
	if !core.Config.Migration.AutoApply {
		return nil
	}
	return applyMigrations(context.Background(), core, infra, "server-start")
}

// NewIAMModule 装配身份认证与授权模块所需的密码、Token、策略、通知和仓储依赖。
//
// core 提供配置、ID 生成器和日志，infra 提供数据库连接；返回值中的仓储、服务和处理器会被 HTTP
// 路由和系统模块复用。函数会加载现有授权策略，加载失败只记录告警以避免阻断启动。
func NewIAMModule(core Core, infra Infrastructure) (IAMModule, error) {
	authCfg := core.Config.Auth
	authCfg.ApplyDefaults()

	passwords, err := crypto.NewBcrypt()
	if err != nil {
		return IAMModule{}, fmt.Errorf("initialize password crypto: %w", err)
	}
	tokenManager, err := token.New(token.Config{
		Issuer:        authCfg.Issuer,
		Audience:      authCfg.Audience,
		SigningKey:    authCfg.SigningKey,
		AccessTTL:     time.Duration(authCfg.AccessTokenTTLSeconds) * time.Second,
		RefreshTTL:    time.Duration(authCfg.RefreshTokenTTLSeconds) * time.Second,
		RefreshPepper: authCfg.RefreshTokenPepper,
	})
	if err != nil {
		return IAMModule{}, fmt.Errorf("initialize token manager: %w", err)
	}
	enforcer, err := authorization.New()
	if err != nil {
		return IAMModule{}, fmt.Errorf("initialize authorization enforcer: %w", err)
	}
	moduleDB := adapters.NewDatabase(infra.Database)
	repo := iamrepository.New(moduleDB)
	notifier, err := NewIAMNotifier(core, authCfg)
	if err != nil {
		return IAMModule{}, err
	}
	reloadableNotifier := iamservice.NewReloadableNotifier(notifier)
	serviceOptions := make([]iamservice.Option, 0, 1)
	if authCfg.Cache.EnabledValue() && infra.Cache != nil {
		serviceOptions = append(serviceOptions, iamservice.WithCacheStore(adapters.NewJSONCacheStore(infra.Cache)))
	}
	service := iamservice.New(repo, passwords, adapters.NewTokenManager(tokenManager), adapters.NewAuthorizerEnforcer(enforcer), core.IDGenerator, adapters.TOTPProvider{}, iamservice.Config{
		RegistrationMode:             authCfg.RegistrationMode,
		MFAIssuer:                    authCfg.MFAIssuer,
		MFASecretKey:                 authCfg.MFASecretKey,
		LoginMaxFailures:             authCfg.LoginMaxFailures,
		LoginLockDuration:            time.Duration(authCfg.LoginLockMinutes) * time.Minute,
		CaptchaEnabled:               authCfg.LoginCaptchaEnabled,
		CaptchaTTL:                   time.Duration(authCfg.CaptchaTTLSeconds) * time.Second,
		InvitationTTL:                time.Duration(authCfg.InvitationTTLSeconds) * time.Second,
		EmailVerificationTTL:         time.Duration(authCfg.EmailVerificationTTLSeconds) * time.Second,
		PasswordResetTTL:             time.Duration(authCfg.PasswordResetTTLSeconds) * time.Second,
		NotificationDriver:           authCfg.NotificationDriver,
		NotificationRetryInterval:    time.Duration(authCfg.NotificationRetryIntervalSeconds) * time.Second,
		NotificationRetryMaxAttempts: authCfg.NotificationRetryMaxAttempts,
		PublicBaseURL:                webUIPublicBaseURL(core.Config.WebUI),
		DefaultProductCode:           normalizeSystemProductCode(core.Config.Brand.ProductCode),
		DefaultClientType:            authCfg.Session.DefaultClientType,
		SingleSessionPerContext:      authCfg.Session.SinglePerProductPlatformValue(),
		UserCacheTTL:                 time.Duration(authCfg.Cache.UserTTLSeconds) * time.Second,
		OrgCacheTTL:                  time.Duration(authCfg.Cache.OrgTTLSeconds) * time.Second,
		RoleCacheTTL:                 time.Duration(authCfg.Cache.RoleTTLSeconds) * time.Second,
		PermissionCacheTTL:           time.Duration(authCfg.Cache.PermissionTTLSeconds) * time.Second,
		PasswordPolicy: iamservice.PasswordPolicy{
			MinLength:     authCfg.PasswordPolicy.MinLength,
			RequireLower:  authCfg.PasswordPolicy.RequireLower,
			RequireUpper:  authCfg.PasswordPolicy.RequireUpper,
			RequireNumber: authCfg.PasswordPolicy.RequireNumber,
			RequireSymbol: authCfg.PasswordPolicy.RequireSymbol,
		},
	}, reloadableNotifier, serviceOptions...)
	return IAMModule{
		Repository: repo,
		Service:    service,
		Handler:    iamhandler.New(service, core.Logger, IAMHandlerRuntimeConfig(core.Config)),
		Notifier:   reloadableNotifier,
		Lifecycle: newBackgroundGroup(
			adapters.NewIAMPolicyReloadScheduler(service, core.Logger, time.Duration(authCfg.CasbinReloadIntervalSeconds)*time.Second),
			adapters.NewIAMNotificationOutboxScheduler(service, core.Logger, time.Duration(authCfg.NotificationRetryIntervalSeconds)*time.Second, authCfg.NotificationRetryBatchSize),
		),
	}, nil
}

// NewIAMNotifier 根据认证配置选择通知实现。
//
// 当前仅在 NotificationDriver=smtp 时创建真实发送器，其余值返回 Noop 实现，保证邀请和重置流程
// 在未配置邮件服务时仍能完成业务状态变更。
func NewIAMNotifier(core Core, cfg config.AuthConfig) (iamservice.Notifier, error) {
	switch strings.ToLower(strings.TrimSpace(cfg.NotificationDriver)) {
	case "smtp":
		sender, err := mailpkg.NewSMTP(MailConfig(cfg.SMTP))
		if err != nil {
			return nil, fmt.Errorf("initialize smtp mail sender: %w", err)
		}
		locale := core.Config.I18n.DefaultLocale
		templateData := core.Config.Brand.TemplateData()
		return iaminfrastructure.NewSMTPNotifier(iaminfrastructure.SMTPNotifierConfig{
			Sender:       iamMailSender{inner: sender},
			TemplateData: templateData,
			Localize: func(key string, data map[string]any) string {
				return core.I18n.Localize(locale, "ui", key, data)
			},
		})
	default:
		return iamservice.NoopNotifier{}, nil
	}
}

// IAMNotificationRuntimeConfig 提取 IAM service 运行期通知策略。
func IAMNotificationRuntimeConfig(cfg *config.Config) iamservice.NotificationRuntimeConfig {
	authCfg := cfg.Auth
	authCfg.ApplyDefaults()
	return iamservice.NotificationRuntimeConfig{
		NotificationDriver:           authCfg.NotificationDriver,
		NotificationRetryInterval:    time.Duration(authCfg.NotificationRetryIntervalSeconds) * time.Second,
		NotificationRetryMaxAttempts: authCfg.NotificationRetryMaxAttempts,
		PublicBaseURL:                webUIPublicBaseURL(cfg.WebUI),
	}
}

func IAMRegistrationRuntimeConfig(cfg *config.Config) iamservice.RegistrationRuntimeConfig {
	authCfg := cfg.Auth
	authCfg.ApplyDefaults()
	return iamservice.RegistrationRuntimeConfig{
		RegistrationMode:     authCfg.RegistrationMode,
		EmailVerificationTTL: time.Duration(authCfg.EmailVerificationTTLSeconds) * time.Second,
	}
}

func IAMHandlerRuntimeConfig(cfg *config.Config) iamhandler.RuntimeConfig {
	authCfg := cfg.Auth
	authCfg.ApplyDefaults()
	return iamhandler.RuntimeConfig{
		CookieNamePrefix:     authCfg.Cookie.NamePrefix,
		CookieDomain:         authCfg.Cookie.Domain,
		CookiePath:           authCfg.Cookie.Path,
		CookieSameSite:       authCfg.Cookie.SameSite,
		CookieSecure:         authCfg.Cookie.Secure,
		CSRFEnabled:          authCfg.CSRF.EnabledValue(),
		CSRFCookieName:       authCfg.CSRF.CookieName,
		CSRFHeaderName:       authCfg.CSRF.HeaderName,
		ProductHeader:        authCfg.Session.ProductHeader,
		ClientTypeHeader:     authCfg.Session.ClientTypeHeader,
		DefaultProductCode:   normalizeSystemProductCode(cfg.Brand.ProductCode),
		DefaultClientType:    authCfg.Session.DefaultClientType,
		MobileUserAgentHints: append([]string(nil), authCfg.Session.MobileUserAgentHints...),
	}
}

type iamMailSender struct {
	inner mailpkg.Sender
}

func (s iamMailSender) Send(ctx context.Context, msg iaminfrastructure.MailMessage) error {
	return s.inner.Send(ctx, mailpkg.Message{
		To:       msg.To,
		Subject:  msg.Subject,
		TextBody: msg.TextBody,
	})
}

// NewAnnouncementsModule 装配公告示例业务模块。
func NewAnnouncementsModule(core Core, infra Infrastructure) AnnouncementsModule {
	var repo announcementrepository.Repository
	if infra.Database != nil {
		repo = announcementrepository.New(adapters.NewDatabase(infra.Database))
	}
	service := announcementservice.New(repo, core.IDGenerator, announcementservice.Config{})
	return AnnouncementsModule{
		Service: service,
		Handler: announcementhandler.New(service, core.Logger),
	}
}

// NewSystemModule 装配系统管理模块，并按配置执行默认数据种子。
//
// core 提供配置快照、配置更新器、ID 生成器和指标采集依赖；infra 提供可选仓储和存储能力；
// iam.Repository 存在时会被适配为系统权限管理所需的权限存储。
func NewSystemModule(core Core, infra Infrastructure, iam IAMModule) SystemModule {
	hostCollector := adapters.HostMetricsCollector{}
	metricsSampler := adapters.NewServerMetricsSampler(
		hostCollector,
		adapters.DefaultServerMetricsInterval,
		adapters.DefaultServerMetricsMaxSamples,
	)
	trafficRunner := adapters.NewTrafficProbeRunner(adapters.WithTrafficProbeLogger(core.Logger))
	trafficAlertSink := NewTrafficAlertSink(core)
	options := []systemservice.Option{
		systemservice.WithIDGenerator(core.IDGenerator),
		systemservice.WithHostMetrics(hostCollector),
		systemservice.WithMetricsHistory(metricsSampler),
		systemservice.WithTrafficProbeRunner(trafficRunner),
		systemservice.WithTrafficAlertSink(trafficAlertSink),
		systemservice.WithLogger(core.Logger),
	}
	if infra.Database != nil {
		options = append(options, systemservice.WithRepository(systemrepository.New(adapters.NewDatabase(infra.Database))))
	}
	if infra.Storage != nil {
		options = append(options, systemservice.WithStorage(infra.Storage))
	}
	if iam.Repository != nil {
		options = append(options, systemservice.WithPermissionStore(newSystemPermissionStore(iam.Repository, core.IDGenerator, core.Config.Brand.ProductCode)))
	}
	service := systemservice.New(systemservice.Config{
		MaintenanceCleanupBatchSize: core.Config.System.MaintenanceCleanupBatchSizeValue(),
		ConfigProvider: func() systemmodel.ConfigSnapshot {
			if core.ConfigManager != nil {
				if cfg := core.ConfigManager.Get(); cfg != nil {
					return SystemConfigSnapshot(cfg)
				}
			}
			return SystemConfigSnapshot(core.Config)
		},
		ConfigUpdater: runtimeConfigUpdater(core.ConfigManager),
		StartTime:     time.Now().UTC(),
	}, options...)
	trafficScheduler := adapters.NewTrafficProbeScheduler(service, core.Logger, adapters.DefaultTrafficProbeScheduleInterval)
	maintenanceScheduler := adapters.NewSystemMaintenanceScheduler(service, core.Logger, time.Duration(core.Config.System.MaintenanceCleanupIntervalSecondsValue())*time.Second)
	seedSystemDefaults(core, service)
	return SystemModule{
		Service:   service,
		Handler:   systemhandler.New(service, iam.Service, core.Logger),
		Lifecycle: newBackgroundGroup(metricsSampler, trafficScheduler, maintenanceScheduler),
	}
}

func NewTrafficAlertSink(core Core) systemservice.TrafficAlertSink {
	var sender mailpkg.Sender
	if core.Config != nil {
		authCfg := core.Config.Auth
		authCfg.ApplyDefaults()
		if strings.EqualFold(strings.TrimSpace(authCfg.NotificationDriver), "smtp") {
			smtpSender, err := mailpkg.NewSMTP(MailConfig(authCfg.SMTP))
			if err != nil {
				if core.Logger != nil {
					core.Logger.Warn("traffic hijack smtp sender disabled", "error", err)
				}
			} else {
				sender = smtpSender
			}
		}
	}
	return adapters.NewTrafficAlertSink(core.Logger, sender)
}

// seedSystemDefaults 在启动阶段按配置补齐系统默认数据。
//
// 该操作是 best-effort：失败只记录日志，不阻断主服务启动，避免初始化数据问题扩大为整体不可用。
func seedSystemDefaults(core Core, service systemservice.Service) {
	if core.Config == nil || service == nil || !core.Config.System.SeedDefaultsOnStartValue() {
		return
	}
	result, err := service.SeedDefaults(context.Background())
	if err != nil {
		if core.Logger != nil {
			core.Logger.Warn("system defaults seed failed", "error", err)
		}
		return
	}
	if core.Logger != nil {
		core.Logger.Info(
			"system defaults seed completed",
			"storage", result.StorageStatus,
			"dictionaries", result.DictionariesCreated,
			"dictionary_items", result.DictionaryItemsCreated,
			"parameters", result.ParametersCreated,
		)
	}
}

// systemPermissionIDGenerator 是系统模块写入 IAM 权限表时所需的最小 ID 生成接口。
type systemPermissionIDGenerator interface {
	NextID() int64
}

// systemPermissionStore 将 IAM 权限仓储适配为系统模块的权限管理端口。
type systemPermissionStore struct {
	repo        iamrepository.Repository
	ids         systemPermissionIDGenerator
	productCode string
}

// newSystemPermissionStore 创建系统权限管理所需的 IAM 仓储适配器。
func newSystemPermissionStore(repo iamrepository.Repository, ids systemPermissionIDGenerator, productCode string) systemservice.PermissionStore {
	return &systemPermissionStore{repo: repo, ids: ids, productCode: normalizeSystemProductCode(productCode)}
}

// ListPermissions 从 IAM 权限表读取权限，并转换为系统模块对外暴露的精简权限条目。
func (s *systemPermissionStore) ListPermissions(ctx context.Context) ([]systemmodel.PermissionEntry, error) {
	permissions, err := s.repo.ListPermissions(ctx)
	if err != nil {
		return nil, err
	}
	out := make([]systemmodel.PermissionEntry, 0, len(permissions))
	for _, permission := range permissions {
		out = append(out, systemmodel.PermissionEntry{
			Code:        permission.Code,
			ProductCode: permission.ProductCode,
			Scope:       permission.Scope,
			Name:        permission.Name,
			Description: permission.Description,
		})
	}
	return out, nil
}

// CreatePermission 通过 IAM 仓储创建系统配置中新增的权限项。
//
// 这里在适配层填充 ID 和时间戳，保持系统模块只表达权限语义，不依赖 IAM 的持久化模型细节。
func (s *systemPermissionStore) CreatePermission(ctx context.Context, permission systemmodel.PermissionEntry) error {
	now := time.Now().UTC()
	return s.repo.CreatePermission(ctx, &iammodel.Permission{
		ID:          s.ids.NextID(),
		ProductCode: systemPermissionProductCode(permission.ProductCode, s.productCode),
		Scope:       systemPermissionScope(permission.Scope),
		Code:        permission.Code,
		Name:        permission.Name,
		Description: permission.Description,
		CreatedAt:   now,
		UpdatedAt:   now,
	})
}

func systemPermissionScope(value string) string {
	value = strings.ToLower(strings.TrimSpace(value))
	if value == "" {
		return iammodel.PermissionScopeTenant
	}
	return value
}

func normalizeSystemProductCode(value string) string {
	value = strings.ToLower(strings.TrimSpace(value))
	if value == "" {
		return "platform"
	}
	return value
}

func systemPermissionProductCode(value string, fallback string) string {
	value = strings.ToLower(strings.TrimSpace(value))
	if value != "" {
		return value
	}
	return normalizeSystemProductCode(fallback)
}

func intPtr(value int) *int {
	return &value
}

// webUIPublicBaseURL 返回通知链接中使用的 WebUI 公开入口。
//
// PublicBaseURL 显式配置时优先使用；否则退回到挂载路径，避免邀请或重置链接依赖空字符串。
func webUIPublicBaseURL(cfg config.WebUIConfig) string {
	cfg.ApplyDefaults()
	if cfg.PublicBaseURL != "" {
		return cfg.PublicBaseURL
	}
	return cfg.MountPath
}

// SystemConfigSnapshot 将完整运行配置转换为系统模块可展示的配置快照。
//
// 参数为当前配置对象指针；nil 时返回空快照。函数会在副本上补默认值，避免为了展示而修改运行中的配置。
// 返回值按页面分组组织配置项，并对敏感字段只暴露是否已配置。
func SystemConfigSnapshot(configSnapshot *config.Config) systemmodel.ConfigSnapshot {
	if configSnapshot == nil {
		return systemmodel.ConfigSnapshot{}
	}
	cfg := *configSnapshot
	cfg.Auth.ApplyDefaults()
	cfg.Migration.ApplyDefaults()
	cfg.RPC.ApplyDefaults()
	cfg.System = config.SystemConfig{
		SeedDefaultsOnStart:               cfg.System.SeedDefaultsOnStart,
		MaintenanceCleanupIntervalSeconds: intPtr(cfg.System.MaintenanceCleanupIntervalSecondsValue()),
		MaintenanceCleanupBatchSize:       intPtr(cfg.System.MaintenanceCleanupBatchSizeValue()),
	}
	cfg.WebUI.ApplyDefaults()

	snapshot := systemmodel.ConfigSnapshot{Sections: []systemmodel.ConfigSection{
		{
			Code:        "brand",
			Description: "产品名称、产品编码和公开版本显示。",
			Icon:        "badge",
			Label:       "品牌",
			Order:       5,
			Items: []systemmodel.ConfigItem{
				configItem("brand.productName", "产品名称", cfg.Brand.ProductName),
				configItem("brand.productCode", "产品编码", cfg.Brand.ProductCode),
				configItem("brand.versionName", "版本名称", cfg.Brand.VersionName),
			},
		},
		{
			Code:        "server",
			Description: "HTTP 服务监听、运行模式和连接超时。",
			Icon:        "server",
			Label:       "系统服务",
			Order:       10,
			Items: []systemmodel.ConfigItem{
				configItem("server.host", "监听地址", cfg.Server.Host),
				configItem("server.port", "监听端口", cfg.Server.Port),
				configItem("server.mode", "运行模式", cfg.Server.Mode),
				configItem("server.read_timeout", "读取超时(秒)", cfg.Server.ReadTimeout),
				configItem("server.write_timeout", "写入超时(秒)", cfg.Server.WriteTimeout),
				configItem("server.idle_timeout", "空闲超时(秒)", cfg.Server.IdleTimeout),
			},
		},
		{
			Code:        "database",
			Description: "主数据库驱动、连接地址和连接池参数。",
			Icon:        "database",
			Label:       "数据库",
			Order:       20,
			Items: []systemmodel.ConfigItem{
				configItem("database.driver", "驱动", cfg.Database.Driver),
				configItem("database.sqlite.path", "SQLite 文件", cfg.Database.SQLite.Path),
				configItem("database.mysql.host", "MySQL 主机", cfg.Database.MySQL.Host),
				configItem("database.mysql.port", "MySQL 端口", cfg.Database.MySQL.Port),
				configItem("database.mysql.username", "MySQL 用户", cfg.Database.MySQL.Username),
				secretConfigItem("database.mysql.password", "MySQL 密码", cfg.Database.MySQL.Password),
				configItem("database.mysql.database", "MySQL 数据库", cfg.Database.MySQL.Database),
				configItem("database.mysql.charset", "MySQL 字符集", cfg.Database.MySQL.Charset),
				configItem("database.postgres.host", "PostgreSQL 主机", cfg.Database.Postgres.Host),
				configItem("database.postgres.port", "PostgreSQL 端口", cfg.Database.Postgres.Port),
				configItem("database.postgres.username", "PostgreSQL 用户", cfg.Database.Postgres.Username),
				secretConfigItem("database.postgres.password", "PostgreSQL 密码", cfg.Database.Postgres.Password),
				configItem("database.postgres.database", "PostgreSQL 数据库", cfg.Database.Postgres.Database),
				configItem("database.postgres.sslMode", "PostgreSQL SSL", cfg.Database.Postgres.SSLMode),
				configItem("database.pool.maxOpenConns", "最大打开连接", cfg.Database.Pool.MaxOpenConns),
				configItem("database.pool.maxIdleConns", "最大空闲连接", cfg.Database.Pool.MaxIdleConns),
			},
		},
		{
			Code:        "cache",
			Description: "缓存驱动、本地缓存容量和 Redis 连接参数。",
			Icon:        "hard-drive",
			Label:       "缓存",
			Order:       30,
			Items: []systemmodel.ConfigItem{
				configItem("cache.driver", "驱动", cfg.Cache.Driver),
				configItem("cache.local.maxCost", "本地最大成本", cfg.Cache.Local.MaxCost),
				configItem("cache.local.numCounters", "本地计数器", cfg.Cache.Local.NumCounters),
				configItem("cache.local.bufferItems", "本地写入缓冲", cfg.Cache.Local.BufferItems),
				configItem("cache.local.defaultTtlSeconds", "本地默认 TTL(秒)", cfg.Cache.Local.DefaultTTLSeconds),
				configItem("cache.redis.addr", "Redis 地址", cfg.Cache.Redis.Addr),
				configItem("cache.redis.username", "Redis 用户", cfg.Cache.Redis.Username),
				secretConfigItem("cache.redis.password", "Redis 密码", cfg.Cache.Redis.Password),
				configItem("cache.redis.db", "Redis 数据库", cfg.Cache.Redis.DB),
				configItem("cache.redis.poolSize", "Redis 连接池", cfg.Cache.Redis.PoolSize),
				configItem("cache.redis.minIdleConns", "Redis 最小空闲连接", cfg.Cache.Redis.MinIdleConns),
				configItem("cache.redis.maxRetries", "Redis 最大重试", cfg.Cache.Redis.MaxRetries),
				configItem("cache.redis.dialTimeout", "Redis 连接超时(秒)", cfg.Cache.Redis.DialTimeout),
				configItem("cache.redis.readTimeout", "Redis 读取超时(秒)", cfg.Cache.Redis.ReadTimeout),
				configItem("cache.redis.writeTimeout", "Redis 写入超时(秒)", cfg.Cache.Redis.WriteTimeout),
			},
		},
		{
			Code:        "auth",
			Description: "IAM、令牌、MFA、登录锁定和通知策略。",
			Icon:        "shield-check",
			Label:       "认证安全",
			Order:       40,
			Items: []systemmodel.ConfigItem{
				configItem("auth.enabled", "启用 IAM", cfg.Auth.Enabled),
				configItem("auth.registration_mode", "注册模式", cfg.Auth.RegistrationMode),
				configItem("auth.issuer", "签发者", cfg.Auth.Issuer),
				configItem("auth.audience", "受众", cfg.Auth.Audience),
				secretConfigItem("auth.signing_key", "签名密钥", cfg.Auth.SigningKey),
				configItem("auth.access_token_ttl_seconds", "Access TTL(秒)", cfg.Auth.AccessTokenTTLSeconds),
				configItem("auth.refresh_token_ttl_seconds", "Refresh TTL(秒)", cfg.Auth.RefreshTokenTTLSeconds),
				secretConfigItem("auth.refresh_token_pepper", "Refresh Pepper", cfg.Auth.RefreshTokenPepper),
				configItem("auth.cookie.name_prefix", "Cookie 名称前缀", cfg.Auth.Cookie.NamePrefix),
				configItem("auth.cookie.domain", "Cookie 域", cfg.Auth.Cookie.Domain),
				configItem("auth.cookie.path", "Cookie 路径", cfg.Auth.Cookie.Path),
				configItem("auth.cookie.same_site", "Cookie SameSite", cfg.Auth.Cookie.SameSite),
				configItem("auth.cookie.secure", "Cookie Secure", cfg.Auth.Cookie.Secure),
				configItem("auth.csrf.enabled", "CSRF 防护", cfg.Auth.CSRF.EnabledValue()),
				configItem("auth.csrf.cookie_name", "CSRF Cookie 名", cfg.Auth.CSRF.CookieName),
				configItem("auth.csrf.header_name", "CSRF Header 名", cfg.Auth.CSRF.HeaderName),
				configItem("auth.session.single_per_product_platform", "单产品平台单会话", cfg.Auth.Session.SinglePerProductPlatformValue()),
				configItem("auth.session.product_header", "产品 Header", cfg.Auth.Session.ProductHeader),
				configItem("auth.session.client_type_header", "客户端类型 Header", cfg.Auth.Session.ClientTypeHeader),
				configItem("auth.session.default_client_type", "默认客户端类型", cfg.Auth.Session.DefaultClientType),
				configItem("auth.session.mobile_user_agent_hints", "移动端 UA 关键字", cfg.Auth.Session.MobileUserAgentHints),
				configItem("auth.cache.enabled", "IAM 缓存", cfg.Auth.Cache.EnabledValue()),
				configItem("auth.cache.user_ttl_seconds", "用户缓存 TTL(秒)", cfg.Auth.Cache.UserTTLSeconds),
				configItem("auth.cache.org_ttl_seconds", "组织缓存 TTL(秒)", cfg.Auth.Cache.OrgTTLSeconds),
				configItem("auth.cache.role_ttl_seconds", "角色缓存 TTL(秒)", cfg.Auth.Cache.RoleTTLSeconds),
				configItem("auth.cache.permission_ttl_seconds", "权限缓存 TTL(秒)", cfg.Auth.Cache.PermissionTTLSeconds),
				configItem("auth.mfa_issuer", "MFA 签发者", cfg.Auth.MFAIssuer),
				secretConfigItem("auth.mfa_secret_key", "MFA 密钥", cfg.Auth.MFASecretKey),
				configItem("auth.login_max_failures", "登录失败锁定次数", cfg.Auth.LoginMaxFailures),
				configItem("auth.login_lock_minutes", "锁定时长(分钟)", cfg.Auth.LoginLockMinutes),
				configItem("auth.login_captcha_enabled", "登录验证码", cfg.Auth.LoginCaptchaEnabled),
				configItem("auth.captcha_ttl_seconds", "验证码 TTL(秒)", cfg.Auth.CaptchaTTLSeconds),
				configItem("auth.invitation_ttl_seconds", "邀请 TTL(秒)", cfg.Auth.InvitationTTLSeconds),
				configItem("auth.email_verification_ttl_seconds", "邮箱验证 TTL(秒)", cfg.Auth.EmailVerificationTTLSeconds),
				configItem("auth.password_reset_ttl_seconds", "重置 TTL(秒)", cfg.Auth.PasswordResetTTLSeconds),
				configItem("auth.notification_driver", "通知驱动", cfg.Auth.NotificationDriver),
				configItem("auth.notification_retry_interval_seconds", "通知重试间隔(秒)", cfg.Auth.NotificationRetryIntervalSeconds),
				configItem("auth.notification_retry_batch_size", "通知重试批量", cfg.Auth.NotificationRetryBatchSize),
				configItem("auth.notification_retry_max_attempts", "通知最大尝试次数", cfg.Auth.NotificationRetryMaxAttempts),
				configItem("auth.casbin_reload_interval_seconds", "权限策略刷新(秒)", cfg.Auth.CasbinReloadIntervalSeconds),
				configItem("auth.password_policy.min_length", "密码最小长度", cfg.Auth.PasswordPolicy.MinLength),
				configItem("auth.smtp.host", "SMTP 主机", cfg.Auth.SMTP.Host),
				configItem("auth.smtp.port", "SMTP 端口", cfg.Auth.SMTP.Port),
				configItem("auth.smtp.username", "SMTP 用户", cfg.Auth.SMTP.Username),
				secretConfigItem("auth.smtp.password", "SMTP 密码", cfg.Auth.SMTP.Password),
				configItem("auth.smtp.from", "SMTP 发件人", cfg.Auth.SMTP.From),
				configItem("auth.smtp.from_name", "SMTP 发件人名称", cfg.Auth.SMTP.FromName),
				configItem("auth.smtp.security", "SMTP 加密方式", cfg.Auth.SMTP.Security),
			},
		},
		{
			Code:        "logger",
			Description: "日志级别、格式和文件轮转。",
			Icon:        "scroll-text",
			Label:       "日志",
			Order:       50,
			Items: []systemmodel.ConfigItem{
				configItem("logger.level", "级别", cfg.Logger.Level),
				configItem("logger.format", "默认格式", cfg.Logger.Format),
				configItem("logger.console_format", "控制台格式", cfg.Logger.ConsoleFormat),
				configItem("logger.file_format", "文件格式", cfg.Logger.FileFormat),
				configItem("logger.output", "输出", cfg.Logger.Output),
				configItem("logger.file_path", "文件路径", cfg.Logger.FilePath),
				configItem("logger.max_size", "单文件大小(MB)", cfg.Logger.MaxSize),
				configItem("logger.max_backups", "备份数量", cfg.Logger.MaxBackups),
				configItem("logger.max_age", "保留天数", cfg.Logger.MaxAge),
			},
		},
		{
			Code:        "webui",
			Description: "内置 WebUI 静态产物挂载和公开访问地址。",
			Icon:        "monitor",
			Label:       "WebUI",
			Order:       60,
			Items: []systemmodel.ConfigItem{
				configItem("webui.enabled", "启用", cfg.WebUI.EnabledValue()),
				configItem("webui.mount_path", "挂载路径", cfg.WebUI.MountPath),
				configItem("webui.dist_dir", "静态目录", cfg.WebUI.DistDir),
				configItem("webui.public_base_url", "公开地址", cfg.WebUI.PublicBaseURL),
			},
		},
		{
			Code:        "storage",
			Description: "文件服务类型、基础路径和监听策略。",
			Icon:        "folder",
			Label:       "文件存储",
			Order:       70,
			Items: []systemmodel.ConfigItem{
				configItem("storage.driver", "驱动", cfg.Storage.Driver),
				configItem("storage.local.fsType", "本地文件系统", cfg.Storage.Local.FSType),
				configItem("storage.local.basePath", "本地路径", cfg.Storage.Local.BasePath),
				configItem("storage.local.publicUrl", "本地公开 URL", cfg.Storage.Local.PublicURL),
				configItem("storage.local.enableWatch", "监听变更", cfg.Storage.Local.EnableWatch),
				configItem("storage.local.watchBufferSize", "监听缓冲区", cfg.Storage.Local.WatchBufferSize),
				configItem("storage.s3.endpoint", "S3 Endpoint", cfg.Storage.S3.Endpoint),
				configItem("storage.s3.region", "S3 Region", cfg.Storage.S3.Region),
				configItem("storage.s3.bucket", "S3 Bucket", cfg.Storage.S3.Bucket),
				configItem("storage.s3.accessKeyId", "S3 Access Key", cfg.Storage.S3.AccessKeyID),
				secretConfigItem("storage.s3.secretAccessKey", "S3 Secret", cfg.Storage.S3.SecretAccessKey),
				configItem("storage.s3.usePathStyle", "S3 Path-style", cfg.Storage.S3.UsePathStyle),
				configItem("storage.s3.publicBaseUrl", "S3 公开 URL", cfg.Storage.S3.PublicBaseURL),
				configItem("storage.minio.endpoint", "MinIO Endpoint", cfg.Storage.MinIO.Endpoint),
				configItem("storage.minio.region", "MinIO Region", cfg.Storage.MinIO.Region),
				configItem("storage.minio.bucket", "MinIO Bucket", cfg.Storage.MinIO.Bucket),
				configItem("storage.minio.accessKeyId", "MinIO Access Key", cfg.Storage.MinIO.AccessKeyID),
				secretConfigItem("storage.minio.secretAccessKey", "MinIO Secret", cfg.Storage.MinIO.SecretAccessKey),
				configItem("storage.minio.usePathStyle", "MinIO Path-style", cfg.Storage.MinIO.UsePathStyle),
				configItem("storage.minio.publicBaseUrl", "MinIO 公开 URL", cfg.Storage.MinIO.PublicBaseURL),
			},
		},
		{
			Code:        "system",
			Description: "系统默认数据和后台维护清理策略。",
			Icon:        "settings-2",
			Label:       "系统管理",
			Order:       75,
			Items: []systemmodel.ConfigItem{
				configItem("system.seed_defaults_on_start", "启动时补齐默认数据", cfg.System.SeedDefaultsOnStartValue()),
				configItem("system.maintenance_cleanup_interval_seconds", "维护清理间隔(秒)", cfg.System.MaintenanceCleanupIntervalSecondsValue()),
				configItem("system.maintenance_cleanup_batch_size", "维护清理批量", cfg.System.MaintenanceCleanupBatchSizeValue()),
			},
		},
		{
			Code:        "runtime",
			Description: "跨域、国际化、迁移、执行器和 RPC 的运行策略。",
			Icon:        "settings",
			Label:       "运行策略",
			Order:       80,
			Items:       runtimeConfigItems(&cfg),
		},
	}}
	for index := range snapshot.Sections {
		snapshot.Sections[index].LabelKey = "system.config.sections." + snapshot.Sections[index].Code + ".label"
		snapshot.Sections[index].DescriptionKey = "system.config.sections." + snapshot.Sections[index].Code + ".description"
		decorateSystemConfigSection(&snapshot.Sections[index])
	}
	return snapshot
}

func decorateSystemConfigSection(section *systemmodel.ConfigSection) {
	for index := range section.Items {
		decorateSystemConfigItem(&section.Items[index])
	}
	section.Groups = systemConfigGroups(section.Code, section.Items)
	if section.Groups == nil {
		section.Groups = []systemmodel.ConfigGroup{}
	}
}

func decorateSystemConfigItem(item *systemmodel.ConfigItem) {
	item.DescriptionKey = "system.config.items." + item.Key + ".description"
	item.Editor = systemConfigItemEditor(*item)
	item.Options = systemConfigItemOptions(item.Key)
	if len(item.Options) > 0 {
		item.Editor = "select"
	}
	switch item.Key {
	case "database.driver", "cache.driver", "storage.driver", "auth.registration_mode", "auth.notification_driver":
		item.Risk = "high"
	}
}

func systemConfigGroups(sectionCode string, items []systemmodel.ConfigItem) []systemmodel.ConfigGroup {
	switch sectionCode {
	case "database":
		return []systemmodel.ConfigGroup{
			systemConfigGroup(sectionCode, "driver", items, nil, true, "high", "database.driver"),
			systemConfigGroup(sectionCode, "sqlite", items, visibleInSystemConfig("database.driver", config.DatabaseDriverSQLite), true, "", "database.sqlite.path"),
			systemConfigGroup(sectionCode, "mysql", items, visibleInSystemConfig("database.driver", config.DatabaseDriverMySQL), true, "high", "database.mysql.host", "database.mysql.port", "database.mysql.username", "database.mysql.password", "database.mysql.database", "database.mysql.charset"),
			systemConfigGroup(sectionCode, "postgres", items, visibleInSystemConfig("database.driver", config.DatabaseDriverPostgres), true, "high", "database.postgres.host", "database.postgres.port", "database.postgres.username", "database.postgres.password", "database.postgres.database", "database.postgres.sslMode"),
			systemConfigGroup(sectionCode, "pool", items, nil, false, "", "database.pool.maxOpenConns", "database.pool.maxIdleConns"),
		}
	case "cache":
		return []systemmodel.ConfigGroup{
			systemConfigGroup(sectionCode, "driver", items, nil, true, "medium", "cache.driver"),
			systemConfigGroup(sectionCode, "local", items, visibleInSystemConfig("cache.driver", config.CacheDriverLocal, config.CacheDriverHybrid), true, "", "cache.local.maxCost", "cache.local.numCounters", "cache.local.bufferItems", "cache.local.defaultTtlSeconds"),
			systemConfigGroup(sectionCode, "redis", items, visibleInSystemConfig("cache.driver", config.CacheDriverRedis, config.CacheDriverHybrid), true, "medium", "cache.redis.addr", "cache.redis.username", "cache.redis.password", "cache.redis.db", "cache.redis.poolSize", "cache.redis.minIdleConns", "cache.redis.maxRetries", "cache.redis.dialTimeout", "cache.redis.readTimeout", "cache.redis.writeTimeout"),
		}
	case "auth":
		return []systemmodel.ConfigGroup{
			systemConfigGroup(sectionCode, "iam", items, nil, false, "medium", "auth.enabled", "auth.issuer", "auth.audience", "auth.signing_key"),
			systemConfigGroup(sectionCode, "registration", items, nil, false, "medium", "auth.registration_mode", "auth.email_verification_ttl_seconds", "auth.invitation_ttl_seconds"),
			systemConfigGroup(sectionCode, "tokens", items, nil, false, "medium", "auth.access_token_ttl_seconds", "auth.refresh_token_ttl_seconds", "auth.refresh_token_pepper"),
			systemConfigGroup(sectionCode, "cookie", items, nil, false, "medium", "auth.cookie.name_prefix", "auth.cookie.domain", "auth.cookie.path", "auth.cookie.same_site", "auth.cookie.secure"),
			systemConfigGroup(sectionCode, "csrf", items, nil, false, "medium", "auth.csrf.enabled", "auth.csrf.cookie_name", "auth.csrf.header_name"),
			systemConfigGroup(sectionCode, "session", items, nil, false, "medium", "auth.session.single_per_product_platform", "auth.session.product_header", "auth.session.client_type_header", "auth.session.default_client_type", "auth.session.mobile_user_agent_hints"),
			systemConfigGroup(sectionCode, "cache", items, nil, false, "medium", "auth.cache.enabled", "auth.cache.user_ttl_seconds", "auth.cache.org_ttl_seconds", "auth.cache.role_ttl_seconds", "auth.cache.permission_ttl_seconds"),
			systemConfigGroup(sectionCode, "mfa", items, nil, false, "", "auth.mfa_issuer", "auth.mfa_secret_key"),
			systemConfigGroup(sectionCode, "login", items, nil, false, "", "auth.login_max_failures", "auth.login_lock_minutes", "auth.login_captcha_enabled", "auth.captcha_ttl_seconds"),
			systemConfigGroup(sectionCode, "notification", items, nil, true, "medium", "auth.notification_driver", "auth.notification_retry_interval_seconds", "auth.notification_retry_batch_size", "auth.notification_retry_max_attempts"),
			systemConfigGroup(sectionCode, "smtp_connection", items, visibleInSystemConfig("auth.notification_driver", "smtp"), true, "medium", "auth.smtp.host", "auth.smtp.port"),
			systemConfigGroup(sectionCode, "smtp_security", items, visibleInSystemConfig("auth.notification_driver", "smtp"), true, "medium", "auth.smtp.security", "auth.smtp.username", "auth.smtp.password"),
			systemConfigGroup(sectionCode, "smtp_sender", items, visibleInSystemConfig("auth.notification_driver", "smtp"), false, "", "auth.smtp.from", "auth.smtp.from_name"),
			systemConfigGroup(sectionCode, "password_policy", items, nil, false, "", "auth.password_policy.min_length", "auth.password_reset_ttl_seconds", "auth.casbin_reload_interval_seconds"),
		}
	case "storage":
		return []systemmodel.ConfigGroup{
			systemConfigGroup(sectionCode, "driver", items, nil, true, "medium", "storage.driver"),
			systemConfigGroup(sectionCode, "local", items, visibleInSystemConfig("storage.driver", config.StorageDriverLocal, config.StorageDriverLocalS3, config.StorageDriverLocalMinIO), true, "", "storage.local.fsType", "storage.local.basePath", "storage.local.publicUrl", "storage.local.enableWatch", "storage.local.watchBufferSize"),
			systemConfigGroup(sectionCode, "s3", items, visibleInSystemConfig("storage.driver", config.StorageDriverS3, config.StorageDriverLocalS3), true, "medium", "storage.s3.endpoint", "storage.s3.region", "storage.s3.bucket", "storage.s3.accessKeyId", "storage.s3.secretAccessKey", "storage.s3.usePathStyle", "storage.s3.publicBaseUrl"),
			systemConfigGroup(sectionCode, "minio", items, visibleInSystemConfig("storage.driver", config.StorageDriverMinIO, config.StorageDriverLocalMinIO), true, "medium", "storage.minio.endpoint", "storage.minio.region", "storage.minio.bucket", "storage.minio.accessKeyId", "storage.minio.secretAccessKey", "storage.minio.usePathStyle", "storage.minio.publicBaseUrl"),
		}
	case "system":
		return []systemmodel.ConfigGroup{
			systemConfigGroup(sectionCode, "defaults", items, nil, false, "", "system.seed_defaults_on_start"),
			systemConfigGroup(sectionCode, "maintenance", items, nil, false, "medium", "system.maintenance_cleanup_interval_seconds", "system.maintenance_cleanup_batch_size"),
		}
	case "runtime":
		return []systemmodel.ConfigGroup{
			systemConfigGroup(sectionCode, "cors", items, nil, false, "", "cors.enabled", "cors.allow_origins", "cors.allow_methods", "cors.allow_headers", "cors.expose_headers", "cors.allow_credentials", "cors.max_age"),
			systemConfigGroup(sectionCode, "i18n", items, nil, false, "", "i18n.defaultLocale", "i18n.fallbackLocale", "i18n.supportedLocales", "i18n.resources.ui", "i18n.resources.api", "i18n.resources.validation", "i18n.resources.system"),
			systemConfigGroup(sectionCode, "migration", items, nil, false, "medium", "migration.auto_apply", "migration.dir"),
			systemConfigGroup(sectionCode, "executor", items, nil, false, "", append([]string{"executor.enabled"}, executorPoolItemKeys(items)...)...),
			systemConfigGroup(sectionCode, "rpc", items, nil, false, "", "rpc.enabled", "rpc.host", "rpc.port", "rpc.read_timeout", "rpc.write_timeout"),
		}
	default:
		keys := make([]string, 0, len(items))
		for _, item := range items {
			keys = append(keys, item.Key)
		}
		return []systemmodel.ConfigGroup{systemConfigGroup(sectionCode, "general", items, nil, false, "", keys...)}
	}
}

func systemConfigGroup(sectionCode string, key string, items []systemmodel.ConfigItem, visibleWhen *systemmodel.VisibilityCondition, testable bool, risk string, itemKeys ...string) systemmodel.ConfigGroup {
	group := systemmodel.ConfigGroup{
		Key:            key,
		LabelKey:       "system.config.groups." + sectionCode + "." + key + ".label",
		DescriptionKey: "system.config.groups." + sectionCode + "." + key + ".description",
		Testable:       testable,
		Risk:           risk,
		VisibleWhen:    visibleWhen,
		Items:          []systemmodel.ConfigItem{},
	}
	lookup := make(map[string]systemmodel.ConfigItem, len(items))
	for _, item := range items {
		lookup[item.Key] = item
	}
	for _, itemKey := range itemKeys {
		item, ok := lookup[itemKey]
		if !ok {
			continue
		}
		item.GroupKey = key
		if item.VisibleWhen == nil {
			item.VisibleWhen = visibleWhen
		}
		if item.Risk == "" {
			item.Risk = risk
		}
		item.Testable = testable
		group.Items = append(group.Items, item)
	}
	return group
}

func visibleInSystemConfig(field string, values ...string) *systemmodel.VisibilityCondition {
	return &systemmodel.VisibilityCondition{Field: field, In: append([]string(nil), values...)}
}

func executorPoolItemKeys(items []systemmodel.ConfigItem) []string {
	keys := []string{}
	for _, item := range items {
		if strings.HasPrefix(item.Key, "executor.pools.") {
			keys = append(keys, item.Key)
		}
	}
	return keys
}

func systemConfigItemEditor(item systemmodel.ConfigItem) string {
	switch {
	case item.Secret:
		return "password"
	case item.ValueType == systemmodel.ConfigValueTypeBoolean:
		return "switch"
	case item.ValueType == systemmodel.ConfigValueTypeNumber:
		return "number"
	case item.ValueType == systemmodel.ConfigValueTypeArray:
		return "textarea"
	default:
		return "text"
	}
}

func systemConfigItemOptions(key string) []systemmodel.ConfigOption {
	switch key {
	case "database.driver":
		return systemConfigOptions(key, config.DatabaseDriverSQLite, config.DatabaseDriverMySQL, config.DatabaseDriverPostgres)
	case "cache.driver":
		return systemConfigOptions(key, config.CacheDriverLocal, config.CacheDriverHybrid, config.CacheDriverRedis, config.CacheDriverDisabled)
	case "storage.driver":
		return systemConfigOptions(key, config.StorageDriverLocal, config.StorageDriverS3, config.StorageDriverMinIO, config.StorageDriverLocalS3, config.StorageDriverLocalMinIO, config.StorageDriverDisabled)
	case "storage.local.fsType":
		return systemConfigOptions(key, "basepath", "os", "memory", "readonly")
	case "auth.notification_driver":
		return systemConfigOptions(key, "debug", "smtp")
	case "auth.registration_mode":
		return systemConfigOptions(key, config.RegistrationModeDisabled, config.RegistrationModeDirect, config.RegistrationModeEmailVerification, config.RegistrationModeInviteOnly)
	case "auth.cookie.same_site":
		return systemConfigOptions(key, "lax", "strict", "none")
	case "auth.session.default_client_type":
		return systemConfigOptions(key, "pc_web", "mobile_web", "mobile_app")
	case "auth.smtp.security":
		return systemConfigOptions(key, config.SMTPSecurityNone, config.SMTPSecurityStartTLS, config.SMTPSecurityTLS)
	case "logger.level":
		return systemConfigOptions(key, "debug", "info", "warn", "error")
	case "logger.format", "logger.console_format", "logger.file_format":
		return systemConfigOptions(key, "json", "console")
	case "logger.output":
		return systemConfigOptions(key, "stdout", "file", "both")
	default:
		return nil
	}
}

func systemConfigOptions(key string, values ...string) []systemmodel.ConfigOption {
	options := make([]systemmodel.ConfigOption, 0, len(values))
	for _, value := range values {
		options = append(options, systemmodel.ConfigOption{
			Value:    value,
			Label:    value,
			LabelKey: "system.config.options." + key + "." + sanitizeSystemConfigKeyPart(value) + ".label",
		})
	}
	return options
}

func sanitizeSystemConfigKeyPart(value string) string {
	out := make([]rune, 0, len(value))
	for _, r := range value {
		switch {
		case r >= 'a' && r <= 'z':
			out = append(out, r)
		case r >= 'A' && r <= 'Z':
			out = append(out, r+('a'-'A'))
		case r >= '0' && r <= '9':
			out = append(out, r)
		default:
			out = append(out, '_')
		}
	}
	return string(out)
}

// runtimeConfigItems 收集不属于单一业务模块的运行期策略配置项。
//
// executor pools 使用索引生成稳定 key，并用池名称增强标签，方便前端在动态列表中展示和提交。
func runtimeConfigItems(cfg *config.Config) []systemmodel.ConfigItem {
	items := []systemmodel.ConfigItem{
		configItem("cors.enabled", "启用 CORS", cfg.CORS.Enabled),
		configItem("cors.allow_origins", "允许来源", cfg.CORS.AllowOrigins),
		configItem("cors.allow_methods", "允许方法", cfg.CORS.AllowMethods),
		configItem("cors.allow_headers", "允许请求头", cfg.CORS.AllowHeaders),
		configItem("cors.expose_headers", "暴露响应头", cfg.CORS.ExposeHeaders),
		configItem("cors.allow_credentials", "允许凭证", cfg.CORS.AllowCredentials),
		configItem("cors.max_age", "预检缓存(秒)", cfg.CORS.MaxAge),
		configItem("i18n.defaultLocale", "默认语言", cfg.I18n.DefaultLocale),
		configItem("i18n.fallbackLocale", "回退语言", cfg.I18n.FallbackLocale),
		configItem("i18n.supportedLocales", "支持语言", cfg.I18n.Supported),
		configItem("i18n.resources.ui", "UI 语言目录", cfg.I18n.Resources["ui"]),
		configItem("i18n.resources.api", "API 语言目录", cfg.I18n.Resources["api"]),
		configItem("i18n.resources.validation", "校验语言目录", cfg.I18n.Resources["validation"]),
		configItem("i18n.resources.system", "系统语言目录", cfg.I18n.Resources["system"]),
		configItem("migration.auto_apply", "自动迁移", cfg.Migration.AutoApply),
		configItem("migration.dir", "迁移目录", cfg.Migration.Dir),
		configItem("executor.enabled", "执行器", cfg.Executor.Enabled),
	}

	for index, pool := range cfg.Executor.Pools {
		prefix := fmt.Sprintf("executor.pools.%d", index)
		label := strings.TrimSpace(pool.Name)
		if label == "" {
			label = fmt.Sprintf("#%d", index+1)
		}
		items = append(items,
			configItem(prefix+".name", fmt.Sprintf("执行器池 %s 名称", label), pool.Name),
			configItem(prefix+".size", fmt.Sprintf("执行器池 %s 容量", label), pool.Size),
			configItem(prefix+".expiry", fmt.Sprintf("执行器池 %s 过期(秒)", label), pool.Expiry),
			configItem(prefix+".non_blocking", fmt.Sprintf("执行器池 %s 非阻塞", label), pool.NonBlocking),
		)
	}

	items = append(items,
		configItem("rpc.enabled", "RPC 入口", cfg.RPC.Enabled),
		configItem("rpc.host", "RPC 主机", cfg.RPC.Host),
		configItem("rpc.port", "RPC 端口", cfg.RPC.Port),
		configItem("rpc.read_timeout", "RPC 读取超时(秒)", cfg.RPC.ReadTimeout),
		configItem("rpc.write_timeout", "RPC 写入超时(秒)", cfg.RPC.WriteTimeout),
	)
	return items
}

// configItem 根据原始值推断前端编辑器所需的值类型和可编辑性。
func configItem(key string, label string, value any) systemmodel.ConfigItem {
	if !strings.HasPrefix(key, "executor.pools.") {
		label = ""
	}
	return systemmodel.ConfigItem{
		Editable:  configItemEditable(key, value),
		Key:       key,
		Label:     label,
		LabelKey:  "system.config.items." + key + ".label",
		Source:    "runtime",
		Value:     value,
		ValueType: configItemValueType(value),
	}
}

// secretConfigItem 创建敏感配置项的展示模型。
//
// 返回值只包含配置状态，不携带真实密文，避免系统配置页面泄露密码、Token 或密钥。
func secretConfigItem(key string, label string, value string) systemmodel.ConfigItem {
	item := configItem(key, label, secretPresence(value))
	item.Editable = true
	item.Secret = true
	item.ValueType = systemmodel.ConfigValueTypeString
	return item
}

// secretPresence 将敏感值折叠为稳定状态，展示文案由 system i18n 资源派生。
func secretPresence(value string) string {
	if strings.TrimSpace(value) == "" {
		return "unconfigured"
	}
	return "configured"
}

// readonlyConfigItemKeys 预留只读配置项集合，便于后续在不改变展示模型的情况下收紧编辑范围。
var readonlyConfigItemKeys = map[string]struct{}{}

// configItemEditable 判断配置项是否适合通过系统配置页面直接编辑。
//
// 只有前端具备明确输入控件的标量或字符串数组允许编辑；对象类型默认只展示，避免提交结构不完整的数据。
func configItemEditable(key string, value any) bool {
	if _, ok := readonlyConfigItemKeys[key]; ok {
		return false
	}
	switch configItemValueType(value) {
	case systemmodel.ConfigValueTypeArray, systemmodel.ConfigValueTypeBoolean, systemmodel.ConfigValueTypeNumber, systemmodel.ConfigValueTypeString:
		return true
	default:
		return false
	}
}

// configItemValueType 将 Go 值映射为系统配置页面理解的值类型。
//
// 该映射保持保守：未知结构统一归为 object，由前端按只读复杂值处理。
func configItemValueType(value any) string {
	switch value.(type) {
	case bool:
		return systemmodel.ConfigValueTypeBoolean
	case int, int8, int16, int32, int64, uint, uint8, uint16, uint32, uint64, float32, float64:
		return systemmodel.ConfigValueTypeNumber
	case string:
		return systemmodel.ConfigValueTypeString
	case []string:
		return systemmodel.ConfigValueTypeArray
	case nil:
		return systemmodel.ConfigValueTypeUnknown
	default:
		return systemmodel.ConfigValueTypeObject
	}
}
