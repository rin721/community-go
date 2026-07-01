// Package handler 将 Git Webhook HTTP 请求转换为部署服务层输入，并统一处理响应和错误映射。
package handler

import (
	"errors"
	"io"
	"net/http"

	"github.com/open-console/console-platform/internal/modules/deploy/model"
	"github.com/open-console/console-platform/internal/modules/deploy/service"
	"github.com/open-console/console-platform/internal/ports"
	"github.com/open-console/console-platform/types/result"
)

// Logger 定义 handler 所需的日志接口。
type Logger interface {
	Error(msg string, keysAndValues ...any)
}

// Handler 是 deploy 模块的 HTTP 适配器。
// handler 层只做输入适配与输出映射，不承载业务规则。
type Handler struct {
	svc    service.Service
	logger Logger
}

// New 创建并返回 Handler 实例。
func New(svc service.Service, logger Logger) *Handler {
	return &Handler{svc: svc, logger: logger}
}

// Push 接收 Git Webhook Push 事件。
//
// 流程：
//  1. 读取原始 body（保留用于 HMAC 校验）
//  2. 收集所有请求头
//  3. 调用 service.HandleWebhook
//  4. 同步返回 202 Accepted（部署异步执行）
//
// 错误映射：
//   - 签名无效 → 401 Unauthorized
//   - 并发部署锁 → 409 Conflict
//   - payload 格式错误 → 400 Bad Request
//   - 其他内部错误 → 500 Internal Server Error
func (h *Handler) Push(c ports.HTTPContext) {
	// 必须先完整读取 body，再用于 HMAC 校验
	rawBody, err := io.ReadAll(c.Request().Body)
	if err != nil {
		result.Fail(c, http.StatusBadRequest, "api.common.invalidRequest")
		return
	}

	// 收集请求头（转小写 key，与 verifier 保持一致）
	headers := collectHeaders(c.Request())

	record, err := h.svc.HandleWebhook(c.RequestContext(), rawBody, headers)
	if err != nil {
		h.writeError(c, err)
		return
	}

	// 202 Accepted：部署已触发（或已跳过），详情通过 /webhook/status 查询
	c.JSON(http.StatusAccepted, deployRecordView(record))
}

// Status 返回最近一次部署记录的状态快照，供运维监控使用。
func (h *Handler) Status(c ports.HTTPContext) {
	resp := &model.WebhookStatusResponse{
		Enabled: true,
		Env:     h.svc.Env(),
		State:   model.OrchestratorState(h.svc.State()),
		Latest:  h.svc.LatestStatus(),
	}
	result.OK(c, resp)
}

// ─── Error mapping ────────────────────────────────────────────────────────────

func (h *Handler) writeError(c ports.HTTPContext, err error) {
	switch {
	case errors.Is(err, service.ErrSignatureInvalid), errors.Is(err, service.ErrSignatureMissing):
		result.Fail(c, http.StatusUnauthorized, "api.common.unauthorized")
	case errors.Is(err, service.ErrDeployBusy):
		result.Fail(c, http.StatusConflict, "api.deploy.busy")
	default:
		if h.logger != nil {
			h.logger.Error("webhook handler error", "error", err)
		}
		result.InternalError(c, result.MessageKeyInternalError)
	}
}

// ─── View helpers ─────────────────────────────────────────────────────────────

// deployRecordView 返回适合对外序列化的部署记录视图。
func deployRecordView(r *model.DeployRecord) map[string]any {
	if r == nil {
		return nil
	}
	v := map[string]any{
		"id":        r.ID,
		"commitId":  r.CommitID,
		"branch":    r.Branch,
		"pusher":    r.Pusher,
		"status":    r.Status,
		"startedAt": r.StartedAt,
		"logs":      r.Logs,
	}
	if r.EndedAt != nil {
		v["endedAt"] = r.EndedAt
	}
	if r.Error != "" {
		v["error"] = r.Error
	}
	return v
}

// collectHeaders 从 HTTP 请求中提取所有头，key 统一转小写方便签名校验查找。
func collectHeaders(req *http.Request) map[string]string {
	headers := make(map[string]string, len(req.Header))
	for k, vals := range req.Header {
		if len(vals) > 0 {
			headers[http.CanonicalHeaderKey(k)] = vals[0]
			// 同时保留小写版本供 verifier 查找
			headers[http.CanonicalHeaderKey(k)] = vals[0]
		}
	}
	// 补充小写版本
	for k, vals := range req.Header {
		if len(vals) > 0 {
			lk := ""
			for _, r := range k {
				if r >= 'A' && r <= 'Z' {
					lk += string(r + 32)
				} else {
					lk += string(r)
				}
			}
			if _, exists := headers[lk]; !exists {
				headers[lk] = vals[0]
			}
		}
	}
	return headers
}
