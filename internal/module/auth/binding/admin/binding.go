// Package admin 提供 Auth module 按需贡献的 Admin 页面声明。
package admin

import (
	"github.com/rin721/go-scaffold-template/internal/admin"
	"github.com/rin721/go-scaffold-template/internal/module"
)

// Binding 返回 Auth 的首次设置、登录和会话页面声明。
func Binding() admin.Binding {
	return admin.Binding{
		ModuleID: string(module.ID("auth")),
		Entries: []admin.Entry{
			{ID: "auth.setup", SourcePath: "internal/module/auth/binding/admin/web/SetupPage.tsx"},
			{ID: "auth.login", SourcePath: "internal/module/auth/binding/admin/web/LoginPage.tsx"},
			{ID: "auth.session", SourcePath: "internal/module/auth/binding/admin/web/SessionPage.tsx"},
		},
		Routes: []admin.Route{
			{ID: "auth.setup", Path: "/setup", EntryID: "auth.setup", TitleMessageID: "admin.auth.setup.title", State: admin.StateAvailable},
			{ID: "auth.login", Path: "/login", EntryID: "auth.login", TitleMessageID: "admin.auth.login.title", State: admin.StateAvailable},
			{ID: "auth.session", Path: "/account/session", EntryID: "auth.session", TitleMessageID: "admin.auth.session.title", State: admin.StateAvailable},
		},
		Locales: []admin.Locale{{Language: "zh-CN", Namespace: "admin.auth", SourcePath: "internal/module/auth/binding/admin/web/locale/zh-CN.json"}},
	}
}
