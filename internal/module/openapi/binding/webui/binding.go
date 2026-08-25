// Package webui 声明 OpenAPI 模块的 WebUI 页面（075-007）：四个静态路由共享
// 分组布局，按分类（tag）组织的层级多页面 API 文档 + 在线调试。
package webui

import (
	"github.com/rin721/go-scaffold-template/internal/module"
	webuicontract "github.com/rin721/go-scaffold-template/internal/webui"
)

// Binding 返回 OpenAPI 契约可视化页面的 WebUI 声明：总览（分类卡片）→ 分类接口
// 列表（?tag=）→ 接口文档/调试（?op=&mode=），数据模型独立成页（?model=）。
// 页面渲染 `webui generate` 生成的契约快照（openapi-spec.ts），不做任何请求，
// 因此 mock 源为空路由表；动态选择全部走 query 深链（路由集合静态冻结，
// validPath 拒绝路径参数）。
func Binding() webuicontract.Binding {
	return webuicontract.Binding{ModuleID: string(module.ID("openapi")), Entries: []webuicontract.Entry{
		// 073：族群共享布局入口（GroupLayoutID 引用，不单独承载路由）。
		{ID: "openapi.layout", SourcePath: "OpenAPILayout.tsx"},
		{ID: "openapi.overview", SourcePath: "OpenAPIOverviewPage.tsx"},
		{ID: "openapi.tags", SourcePath: "OpenAPITagPage.tsx"},
		{ID: "openapi.operation", SourcePath: "OpenAPIOperationPage.tsx"},
		{ID: "openapi.models", SourcePath: "OpenAPIModelsPage.tsx"},
	}, Routes: []webuicontract.Route{
		// 075-007：层级分类多页面（沿用 settings 073 范式）；契约是公开仓库产物，
		// 页面不绑定服务端 operation（无 ViewOperationID）。
		{ID: "openapi.overview", Path: "/openapi", EntryID: "openapi.overview", GroupLayoutID: "openapi.layout", TitleMessageID: "webui.openapi.docs.title", Layout: webuicontract.RouteLayoutApp, DeliveryState: webuicontract.DeliveryImplemented},
		{ID: "openapi.tags", Path: "/openapi/tags", EntryID: "openapi.tags", GroupLayoutID: "openapi.layout", TitleMessageID: "webui.openapi.tags.title", Layout: webuicontract.RouteLayoutApp, DeliveryState: webuicontract.DeliveryImplemented},
		{ID: "openapi.operation", Path: "/openapi/operation", EntryID: "openapi.operation", GroupLayoutID: "openapi.layout", TitleMessageID: "webui.openapi.operation.title", Layout: webuicontract.RouteLayoutApp, DeliveryState: webuicontract.DeliveryImplemented},
		{ID: "openapi.models", Path: "/openapi/models", EntryID: "openapi.models", GroupLayoutID: "openapi.layout", TitleMessageID: "webui.openapi.models.title", Layout: webuicontract.RouteLayoutApp, DeliveryState: webuicontract.DeliveryImplemented},
	}, Navigation: []webuicontract.Navigation{
		{ID: "openapi.docs", RouteID: "openapi.overview", TitleMessageID: "webui.openapi.docs.title", IconID: "book", Order: 130},
	}, Locales: []webuicontract.Locale{{Language: "en-US", Namespace: "webui.openapi", SourcePath: "locale/en-US.json"}, {Language: "zh-CN", Namespace: "webui.openapi", SourcePath: "locale/zh-CN.json"}}, MockSource: "mock.ts", Requires: []webuicontract.SDKRequirement{{ID: "runtime", MajorVersion: 1}, {ID: "i18n", MajorVersion: 1}, {ID: "ui", MajorVersion: 1}, {ID: "mock", MajorVersion: 1}}}
}