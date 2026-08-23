// Package webui 声明 Settings 设置中心的八个分区页面与两级菜单。
package webui

import (
	"github.com/rin721/go-scaffold-template/internal/module"
	webuicontract "github.com/rin721/go-scaffold-template/internal/webui"
)

func Binding() webuicontract.Binding {
	return webuicontract.Binding{ModuleID: string(module.ID("settings")), Entries: []webuicontract.Entry{
		{ID: "settings.profile", SourcePath: "ProfilePage.tsx"},
		{ID: "settings.account", SourcePath: "AccountPage.tsx"},
		{ID: "settings.security", SourcePath: "SecurityPage.tsx"},
		{ID: "settings.appearance", SourcePath: "AppearancePage.tsx"},
		{ID: "settings.notifications", SourcePath: "NotificationsPage.tsx"},
		{ID: "settings.language", SourcePath: "LanguagePage.tsx"},
		{ID: "settings.about", SourcePath: "AboutPage.tsx"},
		{ID: "settings.acknowledgement", SourcePath: "AcknowledgementPage.tsx"},
	}, Routes: []webuicontract.Route{
		{ID: "settings.profile", Path: "/settings/profile", EntryID: "settings.profile", TitleMessageID: "webui.settings.profile.title", Layout: webuicontract.RouteLayoutApp, DeliveryState: webuicontract.DeliveryImplemented},
		{ID: "settings.account", Path: "/settings/account", EntryID: "settings.account", TitleMessageID: "webui.settings.account.title", Layout: webuicontract.RouteLayoutApp, DeliveryState: webuicontract.DeliveryImplemented},
		{ID: "settings.security", Path: "/settings/security", EntryID: "settings.security", TitleMessageID: "webui.settings.security.title", Layout: webuicontract.RouteLayoutApp, DeliveryState: webuicontract.DeliveryImplemented},
		{ID: "settings.appearance", Path: "/settings/appearance", EntryID: "settings.appearance", TitleMessageID: "webui.settings.appearance.title", Layout: webuicontract.RouteLayoutApp, DeliveryState: webuicontract.DeliveryImplemented},
		{ID: "settings.notifications", Path: "/settings/notifications", EntryID: "settings.notifications", TitleMessageID: "webui.settings.notifications.title", Layout: webuicontract.RouteLayoutApp, DeliveryState: webuicontract.DeliveryImplemented},
		{ID: "settings.language", Path: "/settings/language", EntryID: "settings.language", TitleMessageID: "webui.settings.language.title", Layout: webuicontract.RouteLayoutApp, DeliveryState: webuicontract.DeliveryImplemented},
		{ID: "settings.about", Path: "/settings/about", EntryID: "settings.about", TitleMessageID: "webui.settings.about.title", Layout: webuicontract.RouteLayoutApp, DeliveryState: webuicontract.DeliveryImplemented},
		{ID: "settings.acknowledgement", Path: "/settings/acknowledgement", EntryID: "settings.acknowledgement", TitleMessageID: "webui.settings.acknowledgement.title", Layout: webuicontract.RouteLayoutApp, DeliveryState: webuicontract.DeliveryImplemented},
	}, Navigation: []webuicontract.Navigation{
		// 070/072：settings.center 挂在宿主导航声明 host.center 分组之下；全局菜单
		// 子项保持五主分区，language/about/acknowledgement 仅在页内 SectionNav 全列。
		{ID: "settings.center", ParentID: "host.center", RouteID: "settings.profile", TitleMessageID: "webui.settings.center.title", IconID: "settings", Order: 25},
		{ID: "settings.profile", ParentID: "settings.center", RouteID: "settings.profile", TitleMessageID: "webui.settings.profile.title", IconID: "user", Order: 26},
		{ID: "settings.account", ParentID: "settings.center", RouteID: "settings.account", TitleMessageID: "webui.settings.account.title", IconID: "shield", Order: 27},
		{ID: "settings.security", ParentID: "settings.center", RouteID: "settings.security", TitleMessageID: "webui.settings.security.title", IconID: "key", Order: 28},
		{ID: "settings.appearance", ParentID: "settings.center", RouteID: "settings.appearance", TitleMessageID: "webui.settings.appearance.title", IconID: "palette", Order: 29},
		{ID: "settings.notifications", ParentID: "settings.center", RouteID: "settings.notifications", TitleMessageID: "webui.settings.notifications.title", IconID: "bell", Order: 30},
	}, Locales: []webuicontract.Locale{{Language: "en-US", Namespace: "webui.settings", SourcePath: "locale/en-US.json"}, {Language: "zh-CN", Namespace: "webui.settings", SourcePath: "locale/zh-CN.json"}}, MockSource: "mock.ts", Requires: []webuicontract.SDKRequirement{{ID: "runtime", MajorVersion: 1}, {ID: "http", MajorVersion: 1}, {ID: "i18n", MajorVersion: 1}, {ID: "ui", MajorVersion: 1}, {ID: "mock", MajorVersion: 1}}}
}