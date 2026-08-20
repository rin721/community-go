// Package admin 提供 Ops module 按需贡献的 Admin 页面声明。
package admin

import (
	admincontract "github.com/rin721/go-scaffold-template/internal/admin"
	"github.com/rin721/go-scaffold-template/internal/module"
)

// Binding 返回 Ops 真实运行状态看板声明。
func Binding() admincontract.Binding {
	return admincontract.Binding{
		ModuleID:   string(module.ID("ops")),
		Entries:    []admincontract.Entry{{ID: "ops.dashboard", SourcePath: "internal/module/ops/binding/admin/web/DashboardPage.tsx"}},
		Routes:     []admincontract.Route{{ID: "ops.dashboard", Path: "/dashboard", EntryID: "ops.dashboard", TitleMessageID: "admin.ops.dashboard.title", ViewOperationID: "ops.diagnostics", State: admincontract.StateAvailable, Default: true}},
		Navigation: []admincontract.Navigation{{ID: "ops.dashboard", RouteID: "ops.dashboard", TitleMessageID: "admin.ops.dashboard.title", IconID: "activity", Order: 10}},
		Locales:    []admincontract.Locale{{Language: "zh-CN", Namespace: "admin.ops", SourcePath: "internal/module/ops/binding/admin/web/locale/zh-CN.json"}},
	}
}
