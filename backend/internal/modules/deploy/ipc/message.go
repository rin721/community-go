package ipc

import "time"

type MessageType string

const (
	// 旧进程 → 新进程
	MsgRestartRequired MessageType = "restart_required" // 当前版本已过期，请重新热启动
	MsgHeartbeat       MessageType = "heartbeat"        // 心跳，携带 pending 状态

	// 新进程 → 旧进程
	MsgReady MessageType = "ready" // 新进程已完成初始化，可接管流量
	MsgAbort MessageType = "abort" // 新进程主动放弃（收到 restart_required）
)

type Message struct {
	Type       MessageType `json:"type"`
	CommitHash string      `json:"commit_hash,omitempty"`
	HasPending bool        `json:"has_pending,omitempty"` // 是否有更新版本待处理
	SentAt     time.Time   `json:"sent_at"`
}
