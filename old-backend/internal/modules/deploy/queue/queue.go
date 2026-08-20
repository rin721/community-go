package queue

import "sync"

// DeployQueue 是一个只保留最新 commit 的单槽通知队列。
// 写入时覆盖旧值，确保最终执行的是最新版本；不会积压中间版本。
type DeployQueue struct {
	mu     sync.Mutex
	latest string        // 最新 commit hash，"" 表示无待处理
	notify chan struct{} // 有新事件时通知状态机循环
}

// New 创建一个新的 DeployQueue。
func New() *DeployQueue {
	return &DeployQueue{
		notify: make(chan struct{}, 1),
	}
}

// Push 覆盖写最新 commit，确保不丢。
func (q *DeployQueue) Push(commitHash string) {
	q.mu.Lock()
	q.latest = commitHash
	q.mu.Unlock()
	select {
	case q.notify <- struct{}{}:
	default: // 已有待处理通知，覆盖 latest 即可
	}
}

// Pop 取出最新 commit 并清空；返回 "" 和 false 表示无待处理。
func (q *DeployQueue) Pop() (string, bool) {
	q.mu.Lock()
	defer q.mu.Unlock()
	if q.latest == "" {
		return "", false
	}
	c := q.latest
	q.latest = ""
	return c, true
}

// HasPending 检查是否有待处理的 commit。
func (q *DeployQueue) HasPending() bool {
	q.mu.Lock()
	defer q.mu.Unlock()
	return q.latest != ""
}

// Notify 返回只读通道，状态机在此阻塞等待新事件。
func (q *DeployQueue) Notify() <-chan struct{} {
	return q.notify
}
