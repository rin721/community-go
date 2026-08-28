import { beforeAll, describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { AppShell } from "./components/AppShell";
import { WorkspaceProvider } from "./workspace/WorkspaceProvider";
import { ensureRouteLocale, initializeI18n, translateMessage } from "./i18n";
import type { Manifest } from "./contracts";

const manifest: Manifest = {
  catalogRevision: "test-catalog-revision",
  navigationRevision: "test-navigation-revision",
  routes: [
    { moduleId: "ops", id: "ops.dashboard", path: "/ops", entryId: "ops.dashboard", titleMessageId: "webui.ops.dashboard.title", layout: "app", deliveryState: "implemented", default: true, unauthenticatedDefault: false, access: "allowed" },
    { moduleId: "iam", id: "iam.security", path: "/account/security", entryId: "iam.security", titleMessageId: "webui.iam.security.title", layout: "app", deliveryState: "implemented", default: false, unauthenticatedDefault: false, access: "allowed" },
  ],
  menu: [
    { moduleId: "ops", id: "ops.dashboard", routeId: "ops.dashboard", titleMessageId: "webui.ops.dashboard.title", iconId: "activity", order: 1 },
    { moduleId: "iam", id: "iam.security", routeId: "iam.security", titleMessageId: "webui.iam.security.title", iconId: "user", order: 30 },
  ],
};

describe("宿主 AppShell", () => {
  beforeAll(async () => {
    await initializeI18n();
  });

  // renderShell 以宿主装配顺序包裹 WorkspaceProvider（App.tsx 同源装配）。
  function renderShell(principal: { id: string; username: string; scopes: string[] } | undefined, entry = "/ops") {
    return renderToStaticMarkup(
      <MemoryRouter initialEntries={[entry]}>
        <WorkspaceProvider manifest={manifest} principalID={principal?.id} navigateToDefault={() => undefined}>
          <AppShell manifest={manifest} principal={principal} onLogout={async () => undefined} />
        </WorkspaceProvider>
      </MemoryRouter>,
    );
  }

  it("keeps logout confirmation and failure feedback in the host i18n shell", () => {
    const markup = renderShell({ id: "user-1", username: "operator", scopes: [] });

    // 069：确认弹窗为 RAC 受控 Modal，关闭态不渲染 DOM；宿主 i18n 契约在翻译层验证。
    expect(markup).not.toContain('role="dialog"');
    expect(markup).toContain("operator");
    expect(translateMessage("webui.host.logout.confirm.title")).toBe("确认退出登录？");
    expect(translateMessage("webui.host.logout.confirm.confirm")).toBe("退出登录");
    expect(translateMessage("webui.host.logout.failed.title")).toBe("退出登录失败");
  });

  it("从 manifest 渲染模块提供的会话导航入口", async () => {
    await ensureRouteLocale(manifest.routes[0]);
    await ensureRouteLocale(manifest.routes[1]);
    const markup = renderShell(undefined);

    expect(markup).toContain('href="/account/security"');
    expect(markup).toContain("账号安全");
  });
});
