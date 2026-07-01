package config

// 本文件定义一个配置分区及其校验规则，是外部配置进入运行时基础设施前的类型化边界。

import (
	"fmt"
	"strings"
)

const (
	// DeployEnvDevelopment 开发环境标识；该值下 Webhook 请求会被静默忽略，不执行部署。
	DeployEnvDevelopment = "development"
	// DeployEnvStaging 预发布环境标识。
	DeployEnvStaging = "staging"
	// DeployEnvProduction 生产环境标识。
	DeployEnvProduction = "production"

	// DeployProviderGitHub GitHub Webhook 使用 HMAC-SHA256 签名头 X-Hub-Signature-256。
	DeployProviderGitHub = "github"
	// DeployProviderGitLab GitLab Webhook 使用 X-Gitlab-Token 对比密钥。
	DeployProviderGitLab = "gitlab"
	// DeployProviderGeneric 通用提供商：通过配置的自定义 header 进行 HMAC 校验。
	DeployProviderGeneric = "generic"

	DefaultDeployEnv            = DeployEnvDevelopment
	DefaultDeployBranch         = "main"
	DefaultDeployBuildCmd       = "go build -mod=readonly -o ./tmp/console-server ./cmd/console"
	DefaultDeployBinaryPath     = "./tmp/console-server"
	DefaultDeployTimeoutSeconds = 300
	DefaultDeployLogMaxLines    = 500
	DefaultDeployWebhookPath    = "/webhook/push"
	DefaultDeployProvider       = DeployProviderGitHub
)

// DeployConfig 控制 Git Webhook 触发的自动部署能力。
//
// 当 Enabled 为 false 时，deploy 模块不注册任何 HTTP 路由，对运行时无任何影响。
// 当 Env 为 "development" 时，路由注册正常，但接收到 Webhook 后不执行任何部署操作，
// 仅记录日志并返回 200 skipped，保证开发环境零副作用。
type DeployConfig struct {
	// Enabled 是模块总开关；false 时不注册 Webhook 路由。
	Enabled bool `mapstructure:"enabled" envname:"DEPLOY_ENABLED" json:"enabled" yaml:"enabled" toml:"enabled"`

	// Env 描述当前运行环境，决定是否执行真实部署。
	// 可选值: development（忽略部署）/ staging / production（执行部署）
	Env string `mapstructure:"env" envname:"DEPLOY_ENV" json:"env" yaml:"env" toml:"env"`

	// Webhook 控制 HTTP 接收端的鉴权与路径配置。
	Webhook DeployWebhookConfig `mapstructure:"webhook" json:"webhook" yaml:"webhook" toml:"webhook"`

	// RepoURL 是 Git 仓库地址，首次部署（work_dir 不存在时）执行 git clone 使用。
	RepoURL string `mapstructure:"repo_url" envname:"DEPLOY_REPO_URL" json:"repo_url" yaml:"repo_url" toml:"repo_url"`

	// Branch 是需要监听的 Git 分支；Push 到其他分支的事件会被忽略。
	Branch string `mapstructure:"branch" envname:"DEPLOY_BRANCH" json:"branch" yaml:"branch" toml:"branch"`

	// WorkDir 是 git clone / git pull 的根目录。
	WorkDir string `mapstructure:"work_dir" envname:"DEPLOY_WORK_DIR" json:"work_dir" yaml:"work_dir" toml:"work_dir"`

	// BuildCmd 是编译命令；默认值适用于本项目标准布局。
	BuildCmd string `mapstructure:"build_cmd" envname:"DEPLOY_BUILD_CMD" json:"build_cmd" yaml:"build_cmd" toml:"build_cmd"`

	// BinaryPath 是编译产物路径，用于替换正在运行的旧版本。
	BinaryPath string `mapstructure:"binary_path" envname:"DEPLOY_BINARY_PATH" json:"binary_path" yaml:"binary_path" toml:"binary_path"`

	// StopCmd 是停止当前进程的命令；留空时跳过该步骤（适合由外部 process manager 接管）。
	StopCmd string `mapstructure:"stop_cmd" envname:"DEPLOY_STOP_CMD" json:"stop_cmd" yaml:"stop_cmd" toml:"stop_cmd"`

	// StartCmd 是启动新进程的命令；留空时跳过该步骤（适合由外部 process manager 接管）。
	StartCmd string `mapstructure:"start_cmd" envname:"DEPLOY_START_CMD" json:"start_cmd" yaml:"start_cmd" toml:"start_cmd"`

	// TimeoutSeconds 是单条命令的超时时间（秒），超时后强制终止并标记部署失败。
	TimeoutSeconds int `mapstructure:"timeout_seconds" envname:"DEPLOY_TIMEOUT_SECONDS" json:"timeout_seconds" yaml:"timeout_seconds" toml:"timeout_seconds"`

	// LogMaxLines 是内存中保留的最近部署日志行数上限；超出后滚动丢弃最早的行。
	LogMaxLines int `mapstructure:"log_max_lines" envname:"DEPLOY_LOG_MAX_LINES" json:"log_max_lines" yaml:"log_max_lines" toml:"log_max_lines"`

	// HeartbeatIntervalSeconds 是旧进程向新进程发送心跳的间隔（秒）。
	HeartbeatIntervalSeconds int `mapstructure:"heartbeat_interval_seconds" envname:"DEPLOY_HEARTBEAT_INTERVAL_SECONDS" json:"heartbeat_interval_seconds" yaml:"heartbeat_interval_seconds" toml:"heartbeat_interval_seconds"`

	// GateBufferSeconds 是新进程等待窗口的额外缓冲（秒）。
	GateBufferSeconds int `mapstructure:"gate_buffer_seconds" envname:"DEPLOY_GATE_BUFFER_SECONDS" json:"gate_buffer_seconds" yaml:"gate_buffer_seconds" toml:"gate_buffer_seconds"`
}

// DeployWebhookConfig 控制 Webhook 接收端的鉴权配置。
type DeployWebhookConfig struct {
	// Secret 是用于签名校验的密钥；RequireSecret 为 true 时必须非空。
	// 通过环境变量注入，不得硬编码。
	Secret string `mapstructure:"secret" envname:"DEPLOY_WEBHOOK_SECRET" json:"secret" yaml:"secret" toml:"secret"`

	// Provider 决定签名校验方式：github / gitlab / generic。
	Provider string `mapstructure:"provider" envname:"DEPLOY_WEBHOOK_PROVIDER" json:"provider" yaml:"provider" toml:"provider"`

	// Path 是 Webhook 监听的 HTTP 路径，默认 /webhook/push。
	Path string `mapstructure:"path" envname:"DEPLOY_WEBHOOK_PATH" json:"path" yaml:"path" toml:"path"`

	// RequireSecret 为 true 时，Secret 为空会导致启动校验失败；
	// 设为 false 仅用于本地开发调试，生产环境务必保持 true。
	RequireSecret *bool `mapstructure:"require_secret" envname:"DEPLOY_WEBHOOK_REQUIRE_SECRET" json:"require_secret" yaml:"require_secret" toml:"require_secret"`
}

// ValidateName 返回当前配置分区在聚合校验错误中的稳定名称。
func (c *DeployConfig) ValidateName() string {
	return AppDeployName
}

// ValidateRequired 声明 deploy 配置分区是可选的（模块禁用时可完全省略）。
func (c *DeployConfig) ValidateRequired() bool {
	return false
}

// Validate 在模块启用时校验必要字段；禁用时直接返回 nil。
func (c *DeployConfig) Validate() error {
	if !c.Enabled {
		return nil
	}
	switch c.Env {
	case DeployEnvDevelopment, DeployEnvStaging, DeployEnvProduction:
	default:
		return fmt.Errorf("env must be one of: development, staging, production")
	}
	if c.RequireSecretValue() && strings.TrimSpace(c.Webhook.Secret) == "" {
		return fmt.Errorf("webhook.secret is required when webhook.require_secret is true")
	}
	switch c.Webhook.Provider {
	case DeployProviderGitHub, DeployProviderGitLab, DeployProviderGeneric:
	default:
		return fmt.Errorf("webhook.provider must be one of: github, gitlab, generic")
	}
	if strings.TrimSpace(c.Webhook.Path) == "" {
		return fmt.Errorf("webhook.path must not be empty")
	}
	if c.TimeoutSeconds <= 0 {
		return fmt.Errorf("timeout_seconds must be positive")
	}
	if c.LogMaxLines <= 0 {
		return fmt.Errorf("log_max_lines must be positive")
	}
	if c.HeartbeatIntervalSeconds < 0 {
		return fmt.Errorf("heartbeat_interval_seconds must be non-negative")
	}
	if c.GateBufferSeconds < 0 {
		return fmt.Errorf("gate_buffer_seconds must be non-negative")
	}
	return nil
}

// ApplyDefaults 为尚未设置的字段填充合理的默认值。
func (c *DeployConfig) ApplyDefaults() {
	if strings.TrimSpace(c.Env) == "" {
		c.Env = DefaultDeployEnv
	}
	if strings.TrimSpace(c.Branch) == "" {
		c.Branch = DefaultDeployBranch
	}
	if strings.TrimSpace(c.BuildCmd) == "" {
		c.BuildCmd = DefaultDeployBuildCmd
	}
	if strings.TrimSpace(c.BinaryPath) == "" {
		c.BinaryPath = DefaultDeployBinaryPath
	}
	if c.TimeoutSeconds <= 0 {
		c.TimeoutSeconds = DefaultDeployTimeoutSeconds
	}
	if c.LogMaxLines <= 0 {
		c.LogMaxLines = DefaultDeployLogMaxLines
	}
	if c.HeartbeatIntervalSeconds <= 0 {
		c.HeartbeatIntervalSeconds = 10
	}
	if c.GateBufferSeconds <= 0 {
		c.GateBufferSeconds = 15
	}
	if strings.TrimSpace(c.Webhook.Path) == "" {
		c.Webhook.Path = DefaultDeployWebhookPath
	}
	if strings.TrimSpace(c.Webhook.Provider) == "" {
		c.Webhook.Provider = DefaultDeployProvider
	}
}

// IsDevelopment 返回当前部署环境是否为 development，该值下不执行任何部署操作。
func (c DeployConfig) IsDevelopment() bool {
	return strings.EqualFold(strings.TrimSpace(c.Env), DeployEnvDevelopment)
}

// RequireSecretValue 返回是否要求 Secret 非空，默认为 true。
func (c DeployConfig) RequireSecretValue() bool {
	if c.Webhook.RequireSecret == nil {
		return true
	}
	return *c.Webhook.RequireSecret
}

// WebhookPathValue 返回 Webhook 监听路径，保证非空。
func (c DeployConfig) WebhookPathValue() string {
	if strings.TrimSpace(c.Webhook.Path) == "" {
		return DefaultDeployWebhookPath
	}
	return c.Webhook.Path
}
