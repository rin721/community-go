package rpcserver

import (
	"encoding/json"
	"errors"
	"io"
	"net/http"

	"github.com/open-console/console-platform/pkg/logger"
)

// NewHandler 创建包含 /rpc 和 /health 的 HTTP handler。
func NewHandler(registry *Registry, loggers ...logger.Logger) http.Handler {
	log := firstRPCLogger(loggers)
	mux := http.NewServeMux()
	mux.HandleFunc("/rpc", handleRPC(registry, log))
	mux.HandleFunc("/health", handleHealth(registry, log))
	return mux
}

// handleHealth 返回轻量健康信息，并暴露已注册方法数量用于部署侧探活和排障。
func handleHealth(registry *Registry, log logger.Logger) http.HandlerFunc {
	return func(w http.ResponseWriter, _ *http.Request) {
		writeJSONOrLog(log, w, http.StatusOK, "/health", map[string]any{
			"status":  "ok",
			"methods": len(registry.Methods()),
		})
	}
}

// handleRPC 实现最小 JSON-RPC 2.0 HTTP 入口：只接受单个 POST 请求，并用标准响应体表达业务错误。
func handleRPC(registry *Registry, log logger.Logger) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			writeJSONOrLog(log, w, http.StatusMethodNotAllowed, "/rpc", errorResponse(nil, CodeInvalidRequest, "method must be POST", nil))
			return
		}

		body, err := io.ReadAll(r.Body)
		if err != nil {
			writeJSONOrLog(log, w, http.StatusBadRequest, "/rpc", errorResponse(nil, CodeParseError, "parse error", nil))
			return
		}
		defer r.Body.Close()

		var raw any
		if err := json.Unmarshal(body, &raw); err != nil {
			writeJSONOrLog(log, w, http.StatusOK, "/rpc", errorResponse(nil, CodeParseError, "parse error", nil))
			return
		}
		// 暂不支持 batch，提前在原始 JSON 层拒绝数组可避免后续请求结构被误解析。
		if _, ok := raw.([]any); ok {
			writeJSONOrLog(log, w, http.StatusOK, "/rpc", errorResponse(nil, CodeInvalidRequest, "batch requests are not supported", nil))
			return
		}

		var req Request
		if err := json.Unmarshal(body, &req); err != nil {
			writeJSONOrLog(log, w, http.StatusOK, "/rpc", errorResponse(nil, CodeInvalidRequest, "invalid request", nil))
			return
		}
		if !validRequest(req) {
			writeJSONOrLog(log, w, http.StatusOK, "/rpc", errorResponse(req.ID, CodeInvalidRequest, "invalid request", nil))
			return
		}

		result, err := registry.Call(r.Context(), req.Method, req.Params)
		if err != nil {
			var rpcErr *RPCError
			if errors.As(err, &rpcErr) {
				writeJSONOrLog(log, w, http.StatusOK, "/rpc", errorResponse(req.ID, rpcErr.Code, rpcErr.Message, rpcErr.Data))
				return
			}
			writeJSONOrLog(log, w, http.StatusOK, "/rpc", errorResponse(req.ID, CodeInternalError, "internal error", nil))
			return
		}

		writeJSONOrLog(log, w, http.StatusOK, "/rpc", Response{
			JSONRPC: "2.0",
			ID:      req.ID,
			Result:  result,
		})
	}
}

// validRequest 保留最小协议校验，具体参数语义由注册方法自行判断。
func validRequest(req Request) bool {
	return req.JSONRPC == "2.0" && len(req.ID) > 0 && req.Method != ""
}

// errorResponse 统一 JSON-RPC 错误响应形态，避免不同分支返回不一致的 error 对象。
func errorResponse(id json.RawMessage, code int, message string, data any) Response {
	return Response{
		JSONRPC: "2.0",
		ID:      id,
		Error: &Error{
			Code:    code,
			Message: message,
			Data:    data,
		},
	}
}

func firstRPCLogger(loggers []logger.Logger) logger.Logger {
	if len(loggers) == 0 {
		return nil
	}
	return loggers[0]
}

// writeJSON 写出 JSON 响应；调用方负责处理写入失败。
func writeJSON(w http.ResponseWriter, status int, body any) error {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	return json.NewEncoder(w).Encode(body)
}

// writeJSONOrLog 记录无法再改写为响应体的写入失败，避免 RPC 响应丢失无迹可循。
func writeJSONOrLog(log logger.Logger, w http.ResponseWriter, status int, path string, body any) {
	if err := writeJSON(w, status, body); err != nil && log != nil {
		log.Warn("rpc response write failed", "path", path, "status", status, "error", err)
	}
}
