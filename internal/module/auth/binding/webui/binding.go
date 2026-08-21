// Package webui 提供 Auth module 按需贡献的 WebUI 页面声明。
package webui

import (
	"github.com/rin721/go-scaffold-template/internal/module"
	authmodel "github.com/rin721/go-scaffold-template/internal/module/auth/model"
	"github.com/rin721/go-scaffold-template/internal/webui"
)

// Binding 返回 Auth 的首次设置、登录和会话页面声明。
func Binding() webui.Binding {
	return webui.Binding{
		ModuleID: string(module.ID("auth")),
		Entries: []webui.Entry{
			{ID: "auth.setup", SourcePath: "SetupPage.tsx"},
			{ID: "auth.login", SourcePath: "LoginPage.tsx"},
			{ID: "auth.session", SourcePath: "SessionPage.tsx"},
		},
		Routes: []webui.Route{
			{ID: "auth.setup", Path: "/setup", EntryID: "auth.setup", TitleMessageID: "webui.auth.setup.title", Layout: webui.RouteLayoutBlank, DeliveryState: webui.DeliveryImplemented},
			{ID: "auth.login", Path: "/login", EntryID: "auth.login", TitleMessageID: "webui.auth.login.title", Layout: webui.RouteLayoutBlank, DeliveryState: webui.DeliveryImplemented, UnauthenticatedDefault: true},
			{ID: "auth.session", Path: "/account/session", EntryID: "auth.session", TitleMessageID: "webui.auth.session.title", ViewOperationID: authmodel.OperationWebUISession, Layout: webui.RouteLayoutApp, DeliveryState: webui.DeliveryImplemented},
		},
		Navigation: []webui.Navigation{
			{ID: "auth.session", RouteID: "auth.session", TitleMessageID: "webui.auth.session.title", IconID: "user", Order: 30},
		},
		Locales: []webui.Locale{
			{Language: "en-US", Namespace: "webui.auth", SourcePath: "locale/en-US.json"},
			{Language: "zh-CN", Namespace: "webui.auth", SourcePath: "locale/zh-CN.json"},
		},
		Requires: []webui.SDKRequirement{
			{ID: "runtime", MajorVersion: 1},
			{ID: "http", MajorVersion: 1},
			{ID: "i18n", MajorVersion: 1},
			{ID: "ui", MajorVersion: 1},
		},
	}
}
