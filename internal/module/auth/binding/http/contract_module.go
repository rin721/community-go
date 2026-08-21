// Package httpbinding 暴露当前 Auth WebUI 的 typed HTTP 完成品。
package httpbinding

import (
	"github.com/rin721/go-scaffold-template/internal/module/auth/webuiauth"
	"github.com/rin721/go-scaffold-template/pkg/httpx/contract"
)

// ModuleContract 返回当前 Auth 模块拥有的真实 WebUI Auth operation。
func ModuleContract() contract.Module { return webuiauth.ModuleContract() }

// RuntimeHandlers 返回与 Auth HTTP 契约一一对应的运行时 handler。
func RuntimeHandlers(service *webuiauth.Service) map[contract.OperationID]contract.Handler {
	return webuiauth.RuntimeHandlers(service)
}
