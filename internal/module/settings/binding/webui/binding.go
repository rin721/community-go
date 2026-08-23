// Package webui 声明 Settings 设置中心的个人资料、账号安全、外观与通知偏好页面。
package webui

import (
	"github.com/rin721/go-scaffold-template/internal/module"
	webuicontract "github.com/rin721/go-scaffold-template/internal/webui"
)

func Binding() webuicontract.Binding {
	return webuicontract.Binding{ModuleID: string(module.ID("settings")), Entries: []webuicontract.Entry{
		{ID: "settings.profile", SourcePath: "ProfilePage.tsx"},
		{ID: "settings.account", SourcePath: "AccountPage.tsx"},
		{ID: "settings.appearance", SourcePath: "AppearancePage.tsx"},
		{ID: "settings.notifications", SourcePath: "NotificationsPage.tsx"},
	}, Routes: []webuicontract.Route{
		{ID: "settings.profile", Path: "/settings/profile", EntryID: "settings.profile", TitleMessageID: "webui.settings.profile.title", Layout: webuicontract.RouteLayoutApp, DeliveryState: webuicontract.DeliveryImplemented},
		{ID: "settings.account", Path: "/settings/account", EntryID: "settings.account", TitleMessageID: "webui.settings.account.title", Layout: webuicontract.RouteLayoutApp, DeliveryState: webuicontract.DeliveryImplemented},
		{ID: "settings.appearance", Path: "/settings/appearance", EntryID: "settings.appearance", TitleMessageID: "webui.settings.appearance.title", Layout: webuicontract.RouteLayoutApp, DeliveryState: webuicontract.DeliveryImplemented},
		{ID: "settings.notifications", Path: "/settings/notifications", EntryID: "settings.notifications", TitleMessageID: "webui.settings.notifications.title", Layout: webuicontract.RouteLayoutApp, DeliveryState: webuicontract.DeliveryImplemented},
	}, Navigation: []webuicontract.Navigation{
		// 070 双向归属：settings.center 分组既收纳本模块四子页（见下），也可被其他
		// 模块页面引用为父级（如 iam.security 挂入设置组，见 iam binding）。
		{ID: "settings.center", ParentID: "host.center", RouteID: "settings.profile", TitleMessageID: "webui.settings.center.title", IconID: "settings", Order: 25},
		{ID: "settings.profile", ParentID: "settings.center", RouteID: "settings.profile", TitleMessageID: "webui.settings.profile.title", IconID: "user", Order: 26},
		{ID: "settings.account", ParentID: "settings.center", RouteID: "settings.account", TitleMessageID: "webui.settings.account.title", IconID: "shield", Order: 27},
		{ID: "settings.appearance", ParentID: "settings.center", RouteID: "settings.appearance", TitleMessageID: "webui.settings.appearance.title", IconID: "palette", Order: 28},
		{ID: "settings.notifications", ParentID: "settings.center", RouteID: "settings.notifications", TitleMessageID: "webui.settings.notifications.title", IconID: "bell", Order: 29},
	}, Locales: []webuicontract.Locale{{Language: "en-US", Namespace: "webui.settings", SourcePath: "locale/en-US.json"}, {Language: "zh-CN", Namespace: "webui.settings", SourcePath: "locale/zh-CN.json"}}, MockSource: "mock.ts", Requires: []webuicontract.SDKRequirement{{ID: "runtime", MajorVersion: 1}, {ID: "http", MajorVersion: 1}, {ID: "i18n", MajorVersion: 1}, {ID: "ui", MajorVersion: 1}, {ID: "mock", MajorVersion: 1}}}
}