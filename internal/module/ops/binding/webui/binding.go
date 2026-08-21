// Package webui 提供 Ops module 按需贡献的 WebUI 页面声明。
package webui

import (
	"github.com/rin721/go-scaffold-template/internal/module"
	webuicontract "github.com/rin721/go-scaffold-template/internal/webui"
)

// Binding 返回 Ops 真实运行状态看板声明。
func Binding() webuicontract.Binding {
	return webuicontract.Binding{
		ModuleID: string(module.ID("ops")),
		Entries: []webuicontract.Entry{
			{ID: "ops.capabilities", SourcePath: "internal/module/ops/binding/webui/web/CapabilitiesPage.tsx"},
			{ID: "ops.dashboard", SourcePath: "internal/module/ops/binding/webui/web/DashboardPage.tsx"},
		},
		Routes: []webuicontract.Route{
			{ID: "ops.dashboard", Path: "/dashboard", EntryID: "ops.dashboard", TitleMessageID: "webui.ops.dashboard.title", ViewOperationID: "ops.diagnostics", Layout: webuicontract.RouteLayoutApp, DeliveryState: webuicontract.DeliveryImplemented, Default: true},
			{ID: "ops.capabilities", Path: "/dashboard/capabilities", EntryID: "ops.capabilities", TitleMessageID: "webui.ops.capabilities.title", ViewOperationID: "ops.diagnostics", Layout: webuicontract.RouteLayoutApp, DeliveryState: webuicontract.DeliveryImplemented},
		},
		Navigation: []webuicontract.Navigation{
			{ID: "ops.dashboard", RouteID: "ops.dashboard", TitleMessageID: "webui.ops.dashboard.title", IconID: "activity", Order: 10},
			{ID: "ops.capabilities", ParentID: "ops.dashboard", RouteID: "ops.capabilities", TitleMessageID: "webui.ops.capabilities.title", IconID: "activity", Order: 20},
		},
		Locales: []webuicontract.Locale{
			{Language: "en-US", Namespace: "webui.ops", SourcePath: "internal/module/ops/binding/webui/web/locale/en-US.json"},
			{Language: "zh-CN", Namespace: "webui.ops", SourcePath: "internal/module/ops/binding/webui/web/locale/zh-CN.json"},
		},
	}
}
