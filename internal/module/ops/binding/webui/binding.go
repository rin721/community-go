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
			{ID: "ops.capabilities", SourcePath: "CapabilitiesPage.tsx"},
			{ID: "ops.dashboard", SourcePath: "DashboardPage.tsx"},
		},
		Routes: []webuicontract.Route{
			{ID: "ops.dashboard", Path: "/dashboard", EntryID: "ops.dashboard", TitleMessageID: "webui.ops.dashboard.title", ViewOperationID: "ops.diagnostics", Layout: webuicontract.RouteLayoutApp, DeliveryState: webuicontract.DeliveryImplemented, DegradedCapabilities: []string{"diagnostics", "metrics"}, Default: true},
			{ID: "ops.capabilities", Path: "/dashboard/capabilities", EntryID: "ops.capabilities", TitleMessageID: "webui.ops.capabilities.title", ViewOperationID: "ops.diagnostics", Layout: webuicontract.RouteLayoutApp, DeliveryState: webuicontract.DeliveryImplemented, DegradedCapabilities: []string{"diagnostics"}},
		},
		Navigation: []webuicontract.Navigation{
			{ID: "ops.dashboard", RouteID: "ops.dashboard", TitleMessageID: "webui.ops.dashboard.title", IconID: "activity", Order: 10},
			{ID: "ops.capabilities", ParentID: "ops.dashboard", RouteID: "ops.capabilities", TitleMessageID: "webui.ops.capabilities.title", IconID: "activity", Order: 20},
		},
		Locales: []webuicontract.Locale{
			{Language: "en-US", Namespace: "webui.ops", SourcePath: "locale/en-US.json"},
			{Language: "zh-CN", Namespace: "webui.ops", SourcePath: "locale/zh-CN.json"},
		},
		Requires: []webuicontract.SDKRequirement{
			{ID: "runtime", MajorVersion: 1},
			{ID: "http", MajorVersion: 1},
			{ID: "i18n", MajorVersion: 1},
			{ID: "query", MajorVersion: 1},
			{ID: "ui", MajorVersion: 1},
		},
	}
}
