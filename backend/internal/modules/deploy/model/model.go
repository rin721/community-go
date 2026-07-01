// Package model 定义 deploy 模块的核心领域类型。
package model

import "time"

// DeployStatus 描述一次部署任务的运行状态。
type DeployStatus string

const (
	// DeployStatusPending 任务已创建，等待执行器获取。
	DeployStatusPending DeployStatus = "pending"
	// DeployStatusRunning 部署流水线正在执行中。
	DeployStatusRunning DeployStatus = "running"
	// DeployStatusSuccess 部署流水线全部步骤已成功完成。
	DeployStatusSuccess DeployStatus = "success"
	// DeployStatusFailed 部署流水线某步骤失败，已中止。
	DeployStatusFailed DeployStatus = "failed"
	// DeployStatusSkipped 当前环境为 development，跳过部署，不执行任何操作。
	DeployStatusSkipped DeployStatus = "skipped"
	// DeployStatusWaiting 新进程正在等待 StartupGate 确认。
	DeployStatusWaiting DeployStatus = "waiting"
	// DeployStatusHandingOff 正在进行心跳广播和流量切换。
	DeployStatusHandingOff DeployStatus = "handing_off"
)

// OrchestratorState 描述热启动状态机的当前状态。
type OrchestratorState string

const (
	StateIdle       OrchestratorState = "idle"
	StateSyncing    OrchestratorState = "syncing"
	StateBuilding   OrchestratorState = "building"
	StateLaunching  OrchestratorState = "launching"
	StateHandingOff OrchestratorState = "handing_off"
	StateFailed     OrchestratorState = "failed"
)

// DeployStep 描述部署流水线中的单个步骤。
type DeployStep string

const (
	DeployStepGitSync  DeployStep = "git_sync"  // git pull / git clone
	DeployStepBuild    DeployStep = "build"      // 编译
	DeployStepStop     DeployStep = "stop"       // 停止旧进程
	DeployStepStart    DeployStep = "start"      // 启动新进程
)

// PushPayload 描述从 Git Webhook 解析出的 Push 事件数据。
type PushPayload struct {
	// Ref 是完整引用，如 refs/heads/main。
	Ref string
	// CommitID 是最新 commit 的 SHA。
	CommitID string
	// CommitMsg 是最新 commit 的提交信息。
	CommitMsg string
	// Pusher 是推送者的用户名或邮箱。
	Pusher string
	// Repository 是仓库全名，如 owner/repo。
	Repository string
}

// DeployRecord 记录一次完整的部署任务信息。
// 目前使用内存存储；如需持久化可添加 repository 层。
type DeployRecord struct {
	// ID 是本次部署的唯一标识（基于触发时间戳）。
	ID string
	// CommitID 是触发本次部署的 commit SHA。
	CommitID string
	// Branch 是触发本次部署的分支。
	Branch string
	// Pusher 是本次 Push 操作的执行者。
	Pusher string
	// Status 是当前部署状态。
	Status DeployStatus
	// StartedAt 是部署任务开始时间。
	StartedAt time.Time
	// EndedAt 是部署任务结束时间；nil 表示仍在进行中。
	EndedAt *time.Time
	// Logs 是按时间顺序追加的部署日志行。
	Logs []string
	// Error 是导致部署失败的错误信息；成功或跳过时为空字符串。
	Error string
}

// WebhookStatusResponse 是 GET /webhook/status 接口的响应体。
type WebhookStatusResponse struct {
	Enabled bool              `json:"enabled"`
	Env     string            `json:"env"`
	State   OrchestratorState `json:"state"` // 状态机当前状态
	Latest  *DeployRecord     `json:"latest,omitempty"`
}
