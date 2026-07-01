package gate

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/open-console/console-platform/internal/modules/deploy/ipc"
)

// ErrRestartRequired 表示新进程收到旧进程通知：当前版本已过期，需重新热启动。
var ErrRestartRequired = errors.New("startup gate: restart required, current build is not the latest")

// Config 控制 StartupGate 的等待参数。
type Config struct {
	// IPCAddr 是旧进程 IPC 服务端地址；空字符串表示非热启动模式，直接通过。
	IPCAddr string
	// HeartbeatInterval 是旧进程发送心跳的间隔（新进程等待至少 HeartbeatInterval + GateBuffer）。
	HeartbeatInterval time.Duration
	// GateBuffer 是等待窗口的额外缓冲（应 > 一个心跳周期）。
	GateBuffer time.Duration
}

// Run 在新进程进入业务生命周期前执行等待逻辑。
//
// - IPCAddr 为空 → 直接返回 nil（非热启动路径）
// - 收到 MsgRestartRequired → 返回 ErrRestartRequired（调用方重新触发热启动）
// - 等待超时且无 restart_required → 向旧进程发送 MsgReady，返回 nil
func Run(ctx context.Context, cfg Config) error {
	if cfg.IPCAddr == "" {
		return nil
	}

	client, err := ipc.Dial(cfg.IPCAddr)
	if err != nil {
		// 连接失败：旧进程可能已退出，视为"无心跳"路径，直接进入
		return nil
	}
	defer client.Close()

	waitDuration := cfg.HeartbeatInterval + cfg.GateBuffer
	if waitDuration <= 0 {
		waitDuration = 25 * time.Second // fallback default
	}

	timeout := time.NewTimer(waitDuration)
	defer timeout.Stop()

	for {
		select {
		case <-ctx.Done():
			return ctx.Err()
		case msg, ok := <-client.Messages():
			if !ok {
				// 连接断开（旧进程退出）→ 视为超时，直接进入
				return nil
			}
			if msg.Type == ipc.MsgRestartRequired {
				_ = client.Send(ipc.Message{Type: ipc.MsgAbort, SentAt: time.Now()})
				return ErrRestartRequired
			}
		case <-timeout.C:
			// 超时无 restart_required：当前版本是最新的
			err = client.Send(ipc.Message{Type: ipc.MsgReady, SentAt: time.Now()})
			if err != nil {
				return fmt.Errorf("failed to send ready message: %w", err)
			}
			return nil
		}
	}
}
