// Package webui 提供 Auth module 按需贡献的 WebUI 页面声明。
package webui

import (
	"github.com/rin721/go-scaffold-template/internal/module"
	"github.com/rin721/go-scaffold-template/internal/webui"
)

// Binding 返回 Auth 的首次设置、登录和会话页面声明。
func Binding() webui.Binding {
	return webui.Binding{
		ModuleID: string(module.ID("auth")),
		Entries: []webui.Entry{
			{ID: "auth.setup", SourcePath: "internal/module/auth/binding/webui/web/SetupPage.tsx"},
			{ID: "auth.login", SourcePath: "internal/module/auth/binding/webui/web/LoginPage.tsx"},
			{ID: "auth.session", SourcePath: "internal/module/auth/binding/webui/web/SessionPage.tsx"},
		},
		Routes: []webui.Route{
			{ID: "auth.setup", Path: "/setup", EntryID: "auth.setup", TitleMessageID: "webui.auth.setup.title", Layout: webui.RouteLayoutBlank, DeliveryState: webui.DeliveryImplemented},
			{ID: "auth.login", Path: "/login", EntryID: "auth.login", TitleMessageID: "webui.auth.login.title", Layout: webui.RouteLayoutBlank, DeliveryState: webui.DeliveryImplemented, UnauthenticatedDefault: true},
			{ID: "auth.session", Path: "/account/session", EntryID: "auth.session", TitleMessageID: "webui.auth.session.title", Layout: webui.RouteLayoutApp, DeliveryState: webui.DeliveryImplemented},
		},
		Locales: []webui.Locale{
			{Language: "en-US", Namespace: "webui.auth", SourcePath: "internal/module/auth/binding/webui/web/locale/en-US.json"},
			{Language: "zh-CN", Namespace: "webui.auth", SourcePath: "internal/module/auth/binding/webui/web/locale/zh-CN.json"},
		},
	}
}
