// Package webui 声明 OpenAPI 模块的 WebUI 页面（075）：单路由 /openapi + 顶级菜单项。
package webui

import (
	"github.com/rin721/go-scaffold-template/internal/module"
	webuicontract "github.com/rin721/go-scaffold-template/internal/webui"
)

// Binding 返回 OpenAPI 契约可视化页面的 WebUI 声明：页面渲染 `webui generate`
// 生成的契约快照（openapi-spec.ts），不做任何请求，因此 mock 源为空路由表。
func Binding() webuicontract.Binding {
	return webuicontract.Binding{ModuleID: string(module.ID("openapi")), Entries: []webuicontract.Entry{
		{ID: "openapi.docs", SourcePath: "OpenAPIPage.tsx"},
	}, Routes: []webuicontract.Route{
		// 契约是公开仓库产物，页面不绑定服务端 operation（无 ViewOperationID，与 settings 同语义）。
		{ID: "openapi.docs", Path: "/openapi", EntryID: "openapi.docs", TitleMessageID: "webui.openapi.docs.title", Layout: webuicontract.RouteLayoutApp, DeliveryState: webuicontract.DeliveryImplemented},
	}, Navigation: []webuicontract.Navigation{
		{ID: "openapi.docs", RouteID: "openapi.docs", TitleMessageID: "webui.openapi.docs.title", IconID: "book", Order: 130},
	}, Locales: []webuicontract.Locale{{Language: "en-US", Namespace: "webui.openapi", SourcePath: "locale/en-US.json"}, {Language: "zh-CN", Namespace: "webui.openapi", SourcePath: "locale/zh-CN.json"}}, MockSource: "mock.ts", Requires: []webuicontract.SDKRequirement{{ID: "runtime", MajorVersion: 1}, {ID: "i18n", MajorVersion: 1}, {ID: "ui", MajorVersion: 1}, {ID: "mock", MajorVersion: 1}}}
}