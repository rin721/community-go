// Package service 定义 deploy 模块的服务层接口与配置结构。
package service

import (
	"context"
	"errors"

	"github.com/open-console/console-platform/internal/modules/deploy/model"
)

// ErrDeployBusy 表示已有另一个部署任务正在进行，拒绝并发触发。
var ErrDeployBusy = errors.New("another deployment is already in progress")

// Logger 是 service 层声明的最小日志接口，避免直接依赖 internal/ports 基础设施包。
// 装配层通过类型兼容注入实际日志实现（如 ports.Logger 满足此接口）。
type Logger interface {
	Info(msg string, keysAndValues ...any)
	Error(msg string, keysAndValues ...any)
	Warn(msg string, keysAndValues ...any)
}
// Service 是 deploy 模块的核心能力接口。
// handler 层只能通过此接口与服务层交互，不感知任何实现细节。
type Service interface {
	// HandleWebhook 校验 Webhook 签名、解析 Push Payload，并按运行环境决定是否触发部署。
	//
	// 参数:
	//   ctx      - 请求上下文（用于超时传播）
	//   rawBody  - HTTP 请求原始 body 字节（用于 HMAC 校验，必须在读取前保存）
	//   headers  - HTTP 请求头 map（用于提取签名头）
	//
	// 返回:
	//   *model.DeployRecord - 本次触发的部署记录（即使跳过也会返回状态为 skipped 的记录）
	//   error               - 签名校验失败、payload 格式错误等硬错误；部署执行失败不在此返回
	HandleWebhook(ctx context.Context, rawBody []byte, headers map[string]string) (*model.DeployRecord, error)

	// LatestStatus 返回最近一次部署记录的快照。
	// 从未触发过部署时返回 nil。
	LatestStatus() *model.DeployRecord

	// Env 返回当前配置的部署环境标识（development / staging / production）。
	Env() string

	// State 返回部署状态机的当前状态。
	State() string
}

// Config 是服务层初始化所需的配置快照，由装配层从 config.DeployConfig 映射而来。
// service 层不直接依赖 config 包，以保持架构边界清晰。
type Config struct {
	// Env 是运行环境标识：development / staging / production。
	Env string

	// Provider 是 Git Webhook 提供商：github / gitlab / generic。
	Provider string

	// Secret 是 HMAC / 对比密钥。
	Secret string

	// RequireSecret 为 true 时，Secret 为空将拒绝所有 Webhook 请求。
	RequireSecret bool

	// Branch 是需要监听的分支；其他分支的 Push 会被忽略。
	Branch string

	// RepoURL 是 git clone 使用的仓库地址（首次部署时使用）。
	RepoURL string

	// WorkDir 是 git 操作的工作目录。
	WorkDir string

	// BuildCmd 是编译命令。
	BuildCmd string

	// BinaryPath 是编译产物路径。
	BinaryPath string

	// StopCmd 是停止旧进程的命令；空字符串表示跳过。
	StopCmd string

	// StartCmd 是启动新进程的命令；空字符串表示跳过。
	StartCmd string

	// TimeoutSeconds 是单步命令超时时间（秒）。
	TimeoutSeconds int

	// LogMaxLines 是内存中保留的最近日志行数上限。
	LogMaxLines int

	// HeartbeatIntervalSeconds 是旧进程发送心跳的间隔（秒）。
	HeartbeatIntervalSeconds int

	// GateBufferSeconds 是新进程等待窗口的额外缓冲时间（秒）。
	GateBufferSeconds int
}
