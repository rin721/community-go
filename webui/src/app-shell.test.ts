import { beforeAll, describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { AppShell } from "./components/AppShell";
import { ensureRouteLocale, initializeI18n, translateMessage } from "./i18n";
import type { Manifest } from "./contracts";

const manifest: Manifest = {
  revision: "test-revision",
  routes: [
    { moduleId: "ops", id: "ops.dashboard", path: "/ops", entryId: "ops.dashboard", titleMessageId: "webui.ops.dashboard.title", layout: "app", deliveryState: "implemented", default: true, unauthenticatedDefault: false, access: "allowed" },
    { moduleId: "auth", id: "auth.session", path: "/account/session", entryId: "auth.session", titleMessageId: "webui.auth.session.title", layout: "app", deliveryState: "implemented", default: false, unauthenticatedDefault: false, access: "allowed" },
  ],
  menu: [
    { moduleId: "ops", id: "ops.dashboard", routeId: "ops.dashboard", titleMessageId: "webui.ops.dashboard.title", iconId: "activity", order: 1 },
    { moduleId: "auth", id: "auth.session", routeId: "auth.session", titleMessageId: "webui.auth.session.title", iconId: "user", order: 30 },
  ],
};

describe("宿主 AppShell", () => {
  beforeAll(async () => {
    await initializeI18n();
  });

  it("keeps logout confirmation and failure feedback in the host i18n shell", () => {
    const markup = renderToStaticMarkup(createElement(MemoryRouter, { initialEntries: ["/ops"] }, createElement(AppShell, { manifest, principal: { id: "user-1", username: "operator", scopes: [] }, onLogout: async () => undefined })));

    expect(markup).toContain("确认退出登录？");
    expect(markup).toContain("退出登录");
    expect(markup).toContain('role="dialog"');
    expect(translateMessage("webui.host.logout.failed.title")).toBe("退出登录失败");
  });

  it("从 manifest 渲染模块提供的会话导航入口", async () => {
    await ensureRouteLocale(manifest.routes[0]);
    await ensureRouteLocale(manifest.routes[1]);
    const markup = renderToStaticMarkup(createElement(MemoryRouter, { initialEntries: ["/ops"] }, createElement(AppShell, { manifest, principal: undefined, onLogout: async () => undefined })));

    expect(markup).toContain('href="/account/session"');
    expect(markup).toContain("当前会话");
  });
});
