import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";
import { loadProjectLayout, resolveLayoutPaths } from "../scripts/project-layout.mjs";

const registrySource = readFileSync(resolveLayoutPaths(loadProjectLayout()).registryOutput, "utf8");
const webuiRevision = registrySource.match(/webuiRevision = "([^"]+)"/)?.[1];
if (!webuiRevision) throw new Error("generated WebUI revision is missing");

const session = {
  identity: { accountId: "user-1", username: "operator", displayName: "Operator", permissions: ["iam:account:self:read"], mustChangePassword: false, securityRevision: 1 },
  csrfToken: "csrf-test-token",
  createdAt: "2026-08-21T00:00:00Z",
  idleExpiresAt: "2026-08-21T01:00:00Z",
  absoluteExpiresAt: "2026-08-22T00:00:00Z",
};

function manifest(authenticated: boolean, availability: "available" | "degraded" | "unavailable" = "available", accessOverride?: "allowed" | "denied", navigationEnabled = true, navigationRevision = "e2e-navigation-revision") {
  const access = authenticated ? (accessOverride ?? "allowed") : "authentication-required";
  return {
    catalogRevision: webuiRevision,
    navigationRevision,
    routes: [
      { moduleId: "iam", id: "iam.setup", path: "/setup", entryId: "iam.setup", titleMessageId: "webui.iam.setup.title", layout: "blank", deliveryState: "implemented", default: false, unauthenticatedDefault: false, access: "allowed", availability: "available", availableCapabilities: [] },
      { moduleId: "iam", id: "iam.login", path: "/login", entryId: "iam.login", titleMessageId: "webui.iam.login.title", layout: "blank", deliveryState: "implemented", default: false, unauthenticatedDefault: true, access: "allowed", availability: "available", availableCapabilities: [] },
      { moduleId: "iam", id: "iam.security", path: "/account/security", entryId: "iam.security", titleMessageId: "webui.iam.security.title", layout: "app", deliveryState: "implemented", default: false, unauthenticatedDefault: false, access, availability: "available", availableCapabilities: [] },
      { moduleId: "iam", id: "iam.accounts", path: "/admin/accounts", entryId: "iam.accounts", titleMessageId: "webui.iam.accounts.title", layout: "app", deliveryState: "implemented", default: false, unauthenticatedDefault: false, access, availability: "available", availableCapabilities: [] },
      { moduleId: "iam", id: "iam.roles", path: "/admin/roles", entryId: "iam.roles", titleMessageId: "webui.iam.roles.title", layout: "app", deliveryState: "implemented", default: false, unauthenticatedDefault: false, access, availability: "available", availableCapabilities: [] },
      { moduleId: "iam", id: "iam.permissions", path: "/admin/permissions", entryId: "iam.permissions", titleMessageId: "webui.iam.permissions.title", layout: "app", deliveryState: "implemented", default: false, unauthenticatedDefault: false, access, availability: "available", availableCapabilities: [] },
      { moduleId: "organization", id: "organization.departments", path: "/admin/departments", entryId: "organization.departments", titleMessageId: "webui.organization.departments.title", layout: "app", deliveryState: "implemented", default: false, unauthenticatedDefault: false, access, availability: "available", availableCapabilities: [] },
      { moduleId: "organization", id: "organization.positions", path: "/admin/positions", entryId: "organization.positions", titleMessageId: "webui.organization.positions.title", layout: "app", deliveryState: "implemented", default: false, unauthenticatedDefault: false, access, availability: "available", availableCapabilities: [] },
      { moduleId: "organization", id: "organization.assignments", path: "/admin/account-organization", entryId: "organization.assignments", titleMessageId: "webui.organization.assignments.title", layout: "app", deliveryState: "implemented", default: false, unauthenticatedDefault: false, access, availability: "available", availableCapabilities: [] },
      { moduleId: "navigation", id: "navigation.menus", path: "/admin/menus", entryId: "navigation.menus", titleMessageId: "webui.navigation.menus.title", layout: "app", deliveryState: "implemented", default: false, unauthenticatedDefault: false, access, availability: "available", availableCapabilities: [] },
      { moduleId: "ops", id: "ops.dashboard", path: "/dashboard", entryId: "ops.dashboard", titleMessageId: "webui.ops.dashboard.title", layout: "app", deliveryState: "implemented", default: true, unauthenticatedDefault: false, access, availability, availableCapabilities: availability === "unavailable" ? [] : ["diagnostics", "metrics"] },
      { moduleId: "ops", id: "ops.capabilities", path: "/dashboard/capabilities", entryId: "ops.capabilities", titleMessageId: "webui.ops.capabilities.title", layout: "app", deliveryState: "implemented", default: false, unauthenticatedDefault: false, access, availability, availableCapabilities: availability === "unavailable" ? [] : ["diagnostics"] },
      { moduleId: "settings", id: "settings.profile", path: "/settings/profile", entryId: "settings.profile", titleMessageId: "webui.settings.profile.title", layout: "app", groupLayoutId: "settings.layout", deliveryState: "implemented", default: false, unauthenticatedDefault: false, access, availability: "available", availableCapabilities: [] },
      { moduleId: "settings", id: "settings.account", path: "/settings/account", entryId: "settings.account", titleMessageId: "webui.settings.account.title", layout: "app", groupLayoutId: "settings.layout", deliveryState: "implemented", default: false, unauthenticatedDefault: false, access, availability: "available", availableCapabilities: [] },
      { moduleId: "settings", id: "settings.appearance", path: "/settings/appearance", entryId: "settings.appearance", titleMessageId: "webui.settings.appearance.title", layout: "app", groupLayoutId: "settings.layout", deliveryState: "implemented", default: false, unauthenticatedDefault: false, access, availability: "available", availableCapabilities: [] },
      { moduleId: "settings", id: "settings.notifications", path: "/settings/notifications", entryId: "settings.notifications", titleMessageId: "webui.settings.notifications.title", layout: "app", groupLayoutId: "settings.layout", deliveryState: "implemented", default: false, unauthenticatedDefault: false, access, availability: "available", availableCapabilities: [] },
      { moduleId: "settings", id: "settings.security", path: "/settings/security", entryId: "settings.security", titleMessageId: "webui.settings.security.title", layout: "app", groupLayoutId: "settings.layout", deliveryState: "implemented", default: false, unauthenticatedDefault: false, access, availability: "available", availableCapabilities: [] },
      { moduleId: "settings", id: "settings.language", path: "/settings/language", entryId: "settings.language", titleMessageId: "webui.settings.language.title", layout: "app", groupLayoutId: "settings.layout", deliveryState: "implemented", default: false, unauthenticatedDefault: false, access, availability: "available", availableCapabilities: [] },
      { moduleId: "settings", id: "settings.about", path: "/settings/about", entryId: "settings.about", titleMessageId: "webui.settings.about.title", layout: "app", groupLayoutId: "settings.layout", deliveryState: "implemented", default: false, unauthenticatedDefault: false, access, availability: "available", availableCapabilities: [] },
      { moduleId: "settings", id: "settings.acknowledgement", path: "/settings/acknowledgement", entryId: "settings.acknowledgement", titleMessageId: "webui.settings.acknowledgement.title", layout: "app", groupLayoutId: "settings.layout", deliveryState: "implemented", default: false, unauthenticatedDefault: false, access, availability: "available", availableCapabilities: [] },
      { moduleId: "openapi", id: "openapi.docs", path: "/openapi", entryId: "openapi.docs", titleMessageId: "webui.openapi.docs.title", layout: "app", deliveryState: "implemented", default: false, unauthenticatedDefault: false, access, availability: "available", availableCapabilities: [] },
    ],
    menu: authenticated && access !== "denied" ? [
      { moduleId: "ops", id: "ops.dashboard", routeId: "ops.dashboard", titleMessageId: "webui.ops.dashboard.title", iconId: "activity", order: 10 },
      { moduleId: "ops", id: "ops.capabilities", parentId: "ops.dashboard", routeId: "ops.capabilities", titleMessageId: "webui.ops.capabilities.title", iconId: "activity", order: 20 },
      { moduleId: "iam", id: "iam.security", parentId: "iam.access", routeId: "iam.security", titleMessageId: "webui.iam.security.title", iconId: "user", order: 30 },
      { moduleId: "iam", id: "iam.accounts", routeId: "iam.accounts", titleMessageId: "webui.iam.accounts.title", iconId: "users", order: 40 },
      { moduleId: "iam", id: "iam.roles", routeId: "iam.roles", titleMessageId: "webui.iam.roles.title", iconId: "shield", order: 50 },
      { moduleId: "iam", id: "iam.permissions", routeId: "iam.permissions", titleMessageId: "webui.iam.permissions.title", iconId: "key", order: 60 },
      { moduleId: "organization", id: "organization.departments", routeId: "organization.departments", titleMessageId: "webui.organization.departments.title", iconId: "building", order: 70 },
      { moduleId: "organization", id: "organization.positions", routeId: "organization.positions", titleMessageId: "webui.organization.positions.title", iconId: "briefcase", order: 80 },
      { moduleId: "organization", id: "organization.assignments", routeId: "organization.assignments", titleMessageId: "webui.organization.assignments.title", iconId: "users", order: 90 },
      { moduleId: "settings", id: "settings.center", routeId: "settings.profile", titleMessageId: "webui.settings.center.title", iconId: "settings", order: 20 },
      { moduleId: "settings", id: "settings.profile", parentId: "settings.center", routeId: "settings.profile", titleMessageId: "webui.settings.profile.title", iconId: "user", order: 26 },
      { moduleId: "settings", id: "settings.account", parentId: "settings.center", routeId: "settings.account", titleMessageId: "webui.settings.account.title", iconId: "shield", order: 27 },
      { moduleId: "settings", id: "settings.appearance", parentId: "settings.center", routeId: "settings.appearance", titleMessageId: "webui.settings.appearance.title", iconId: "palette", order: 99 },
      { moduleId: "settings", id: "settings.notifications", parentId: "settings.center", routeId: "settings.notifications", titleMessageId: "webui.settings.notifications.title", iconId: "bell", order: 100 },
      { moduleId: "settings", id: "settings.language", parentId: "settings.center", routeId: "settings.language", titleMessageId: "webui.settings.language.title", iconId: "languages", order: 101 },
      { moduleId: "settings", id: "settings.about", parentId: "settings.center", routeId: "settings.about", titleMessageId: "webui.settings.about.title", iconId: "info", order: 102 },
      { moduleId: "settings", id: "settings.acknowledgement", parentId: "settings.center", routeId: "settings.acknowledgement", titleMessageId: "webui.settings.acknowledgement.title", iconId: "star", order: 103 },
      { moduleId: "openapi", id: "openapi.docs", routeId: "openapi.docs", titleMessageId: "webui.openapi.docs.title", iconId: "book", order: 130 },
      ...(navigationEnabled ? [{ moduleId: "navigation", id: "navigation.menus", routeId: "navigation.menus", titleMessageId: "webui.navigation.menus.title", iconId: "menu", order: 110 }] : []),
    ] : [],
  };
}

test.beforeEach(async ({ page }) => {
  let authenticated = false;
  let availability: "available" | "degraded" | "unavailable" = "available";
  let accessOverride: "allowed" | "denied" | undefined;
  let managementRequestCount = 0;
  let navigationEnabled = true;
  let navigationRevision = "e2e-navigation-revision-1";

  await page.route("**/api/v1/webui/manifest", async (route) => {
    await route.fulfill({ json: manifest(authenticated, availability, accessOverride, navigationEnabled, navigationRevision) });
  });
  await page.route("**/api/v1/iam/session", async (route) => {
    if (authenticated) await route.fulfill({ json: session });
    else await route.fulfill({ status: 401, contentType: "application/json", body: JSON.stringify({ code: "unauthenticated" }) });
  });
  await page.route("**/api/v1/iam/login", async (route) => {
    authenticated = true;
    await route.fulfill({ json: session });
  });
  await page.route("**/api/v1/iam/setup", async (route) => {
    authenticated = true;
    await route.fulfill({ json: session });
  });
  await page.route("**/api/v1/iam/logout", async (route) => {
    authenticated = false;
    await route.fulfill({ status: 204, body: "" });
  });
  await page.route("**/api/v1/iam/self/profile", async (route) => {
    const body = route.request().postDataJSON() as { nickname?: string; bio?: string; birthDate?: string; expectedVersion?: number };
    await route.fulfill({ json: { username: "operator", nickname: body.nickname ?? "", bio: body.bio ?? "", birthDate: body.birthDate ?? "", version: (body.expectedVersion ?? 0) + 1 } });
  });
  await page.route("**/api/v1/iam/self/archive", async (route) => {
    if (route.request().url().endsWith("/confirm")) {
      await route.fulfill({ status: 204, body: "" });
      return;
    }
    await route.fulfill({ json: { confirmationId: "e2e-confirmation" } });
  });
  await page.route("**/api/v1/iam/accounts?*", async (route) => {
    await route.fulfill({ json: { items: [{ id: "user-1", username: "operator", displayName: "Operator", status: "active", mustChangePassword: false, securityRevision: 1, version: 1 }], offset: 0, limit: 100, total: 1 } });
  });
  await page.route("**/api/v1/iam/accounts/user-1/roles", async (route) => { await route.fulfill({ json: { accountId: "user-1", accountVersion: 1, authorizationRevision: 1, roleIds: ["role-owner"] } }); });
  await page.route("**/api/v1/iam/roles?*", async (route) => {
    await route.fulfill({ json: { items: [{ id: "role-owner", code: "owner", name: "System owner", description: "", active: true, archived: false, system: true, version: 1 }], offset: 0, limit: 100, total: 1 } });
  });
  await page.route("**/api/v1/iam/roles/role-owner/permissions", async (route) => { await route.fulfill({ json: { roleId: "role-owner", roleVersion: 1, authorizationRevision: 1, permissionKeys: ["iam:account:read"] } }); });
  await page.route("**/api/v1/iam/permissions", async (route) => { await route.fulfill({ json: [{ key: "iam:account:read", ownerModuleId: "iam", descriptionMessageId: "permission.iam.account.read" }] }); });
  await page.route("**/api/v1/organization/departments?*", async (route) => { await route.fulfill({ json: { items: [{ id: "dept-root", code: "engineering", name: "Engineering", active: true, archived: false, version: 1 }], offset: 0, limit: 100, total: 1 } }); });
  await page.route("**/api/v1/organization/departments/tree", async (route) => { await route.fulfill({ json: [{ id: "dept-root", code: "engineering", name: "Engineering", active: true, archived: false, version: 1, children: [{ id: "dept-child", code: "platform", name: "Platform", parentId: "dept-root", active: true, archived: false, version: 1, children: [] }] }] }); });
  await page.route("**/api/v1/organization/positions?*", async (route) => { await route.fulfill({ json: { items: [{ id: "position-manager", code: "manager", name: "Manager", active: true, archived: false, version: 1 }], offset: 0, limit: 100, total: 1 } }); });
  await page.route("**/api/v1/organization/accounts/user-1/assignment", async (route) => { await route.fulfill({ json: { accountId: "user-1", departmentId: "dept-root", positionIds: ["position-manager"], version: 1 } }); });
  await page.route("**/api/v1/navigation/menus**", async (route) => {
    if (route.request().method() === "PUT") {
      const body = route.request().postDataJSON() as { enabled: boolean };
      navigationEnabled = body.enabled;
      navigationRevision = "e2e-navigation-revision-2";
      await route.fulfill({ json: { catalogRevision: webuiRevision, navigationRevision } });
      return;
    }
    await route.fulfill({ json: { catalogRevision: webuiRevision, navigationRevision, items: [
      { id: "ops.dashboard", moduleId: "ops", routeId: "ops.dashboard", titleMessageId: "webui.ops.dashboard.title", iconId: "activity", defaultParentId: "", defaultOrder: 10, enabled: true, parentId: "", order: 10, version: 0, overridden: false, parentOverridden: false, orderOverridden: false },
      { id: "navigation.menus", moduleId: "navigation", routeId: "navigation.menus", titleMessageId: "webui.navigation.menus.title", iconId: "menu", defaultParentId: "", defaultOrder: 100, enabled: navigationEnabled, parentId: "", order: 100, version: navigationRevision.endsWith("2") ? 1 : 0, overridden: navigationRevision.endsWith("2"), parentOverridden: false, orderOverridden: false },
    ] } });
  });
  await page.route("**/management/**", async (route) => {
    managementRequestCount += 1;
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith("/metrics")) await route.fulfill({ status: 200, contentType: "text/plain", body: "community_go_requests_total 1\n" });
    else await route.fulfill({ json: { status: "ok", path } });
  });

  await page.addInitScript(({ revision }) => {
    window.localStorage.setItem("community-go-webui-language", "en-US");
    (window as unknown as { __webuiTestState?: unknown }).__webuiTestState = revision;
  }, { revision: webuiRevision });

  (page as unknown as { setWebUIState: (state: { authenticated?: boolean; availability?: "available" | "degraded" | "unavailable"; access?: "allowed" | "denied" }) => void }).setWebUIState = (state) => {
    authenticated = state.authenticated ?? authenticated;
    availability = state.availability ?? availability;
    accessOverride = state.access;
  };
  (page as unknown as { managementRequestCount: () => number }).managementRequestCount = () => managementRequestCount;
});

test("login loads a module-owned dashboard and captures desktop/mobile visual evidence", async ({ page }, testInfo) => {
  await page.goto("/login");
  await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath("auth-login-desktop.png"), fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: testInfo.outputPath("auth-login-mobile.png"), fullPage: true });
  await page.setViewportSize({ width: 1440, height: 1000 });

  await page.getByLabel("Username").fill("operator");
  await page.getByLabel("Password").fill("safe-test-password");
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL("**/dashboard");
  await expect(page.getByRole("heading", { name: "Runtime status" })).toBeVisible();
  await expect(page.getByText("Runtime diagnostics available")).toBeVisible();

  await page.screenshot({ path: testInfo.outputPath("dashboard-desktop.png"), fullPage: true });
  await page.getByRole("button", { name: "Toggle theme mode" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-color-scheme", "dark");
  await page.screenshot({ path: testInfo.outputPath("dashboard-dark-desktop.png"), fullPage: true });
  await page.getByRole("button", { name: "Toggle theme mode" }).click();
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByRole("heading", { name: "Runtime status" })).toBeVisible();
  await expect(page.locator(".app-sidebar")).not.toHaveClass(/mobile-open/);
  await page.screenshot({ path: testInfo.outputPath("dashboard-mobile.png"), fullPage: true });
});

test("059 shell interactions keep sidebar, search, theme and reduced-motion consistent", async ({ page }, testInfo) => {
  (page as unknown as { setWebUIState: (state: { authenticated: boolean }) => void }).setWebUIState({ authenticated: true });
  await page.goto("/dashboard");
  await expect(page.getByRole("heading", { name: "Runtime status" })).toBeVisible();

  await page.setViewportSize({ width: 1024, height: 768 });
  await page.screenshot({ path: testInfo.outputPath("shell-1024.png"), fullPage: true });

  // desktop sidebar 展开/收起共用同一布局 token：收起后 sidebar 宽度变化且不出现网格跳动。
  const sidebar = page.locator(".app-sidebar");
  const expandedWidth = await sidebar.evaluate((element) => getComputedStyle(element).width);
  await page.getByRole("button", { name: "Collapse sidebar" }).click();
  const collapsedWidth = await sidebar.evaluate((element) => getComputedStyle(element).width);
  expect(Number.parseFloat(collapsedWidth)).toBeLessThan(Number.parseFloat(expandedWidth));
  await page.screenshot({ path: testInfo.outputPath("shell-sidebar-collapsed.png"), fullPage: true });
  await page.getByRole("button", { name: "Expand sidebar" }).click();

  // 递归子菜单：展开子菜单容器常驻 DOM 并保持可见。
  await page.getByRole("button", { name: "Expand submenu" }).first().click();
  await expect(page.getByRole("link", { name: "Capability list" })).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath("shell-submenu.png"), fullPage: true });

  // route search 提供 dialog 语义并可跳转。
  await page.getByRole("button", { name: "Search pages Ctrl K" }).click();
  await expect(page.getByRole("dialog", { name: "Search pages" })).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath("shell-search.png"), fullPage: true });
  await page.keyboard.press("Escape");

  // theme drawer 可打开并记录外观面板。
  await page.getByRole("button", { name: "Theme settings" }).click();
  await expect(page.getByRole("dialog", { name: "Theme settings" })).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath("shell-theme-drawer.png"), fullPage: true });
  await page.keyboard.press("Escape");

  // 显式减少动效：data-motion 切换到 reduce，CSS 层统一降级。
  await page.getByRole("button", { name: "Theme settings" }).click();
  const themeDialog = page.getByRole("dialog", { name: "Theme settings" });
  await themeDialog.getByRole("tab", { name: "General" }).click();
  await themeDialog.getByRole("switch", { name: "Reduce page motion" }).press("Space");
  await expect(page.locator("html")).toHaveAttribute("data-motion", "reduce");
  await page.screenshot({ path: testInfo.outputPath("shell-reduced-motion.png"), fullPage: true });
  await page.keyboard.press("Escape");
  // 069：主题抽屉为 RAC 受控 Modal，关闭后不再挂载（portal）。
  await expect(page.getByRole("dialog", { name: "Theme settings" })).toHaveCount(0);

  // mobile：打开抽屉后背景锁定（inert），关闭恢复触发按钮。
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: "Open menu" }).click();
  await expect(page.locator(".app-sidebar")).toHaveClass(/mobile-open/);
  await page.screenshot({ path: testInfo.outputPath("shell-mobile-drawer.png"), fullPage: true });
  await page.locator(".app-sidebar").getByRole("button", { name: "Close menu" }).click();
  await expect(page.locator(".app-sidebar")).not.toHaveClass(/mobile-open/);
});

test("unavailable route stops business management requests", async ({ page }) => {
  const state = page as unknown as { setWebUIState: (state: { authenticated?: boolean; availability?: "available" | "degraded" | "unavailable"; access?: "allowed" | "denied" }) => void; managementRequestCount: () => number };
  state.setWebUIState({ authenticated: true, availability: "unavailable" });
  await page.goto("/dashboard");
  await expect(page.getByRole("heading", { name: "Page unavailable" })).toBeVisible();
  expect(state.managementRequestCount()).toBe(0);
});

test("setup creates the session and reaches the default module route", async ({ page }) => {
  await page.goto("/setup");
  await expect(page.getByRole("heading", { name: "Initialize system owner" })).toBeVisible();
  await page.getByLabel("Setup token").fill("setup-token");
  await page.getByLabel("Username").fill("operator");
  await page.getByLabel("Display name").fill("Operator");
  await page.getByLabel("Password").fill("safe-test-password");
  await page.getByRole("button", { name: "Initialize" }).click();
  await page.waitForURL("**/dashboard");
  await expect(page.getByRole("heading", { name: "Runtime status" })).toBeVisible();
});

test("supported degraded route only runs declared management capabilities", async ({ page }) => {
  const state = page as unknown as { setWebUIState: (state: { authenticated?: boolean; availability?: "available" | "degraded" | "unavailable"; access?: "allowed" | "denied" }) => void; managementRequestCount: () => number };
  state.setWebUIState({ authenticated: true, availability: "degraded" });
  await page.goto("/dashboard");
  await expect(page.getByRole("heading", { name: "Runtime status" })).toBeVisible();
  expect(state.managementRequestCount()).toBe(2);
});

test("security page and host logout preserve the private session boundary", async ({ page }) => {
  const state = page as unknown as { setWebUIState: (state: { authenticated?: boolean; availability?: "available" | "degraded" | "unavailable"; access?: "allowed" | "denied" }) => void };
  state.setWebUIState({ authenticated: true });
  await page.goto("/account/security");
  await expect(page.getByRole("heading", { name: "Account security" })).toBeVisible();
  await page.getByRole("button", { name: "operator" }).click();
  await page.getByRole("menuitem", { name: "Log out" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.getByRole("dialog").getByRole("button", { name: "Sign out" }).click();
  await page.waitForURL("**/login");
  await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
});

test("denied route renders host access state without loading its entry", async ({ page }) => {
  const state = page as unknown as { setWebUIState: (state: { authenticated?: boolean; availability?: "available" | "degraded" | "unavailable"; access?: "allowed" | "denied" }) => void; managementRequestCount: () => number };
  state.setWebUIState({ authenticated: true, access: "denied" });
  await page.goto("/dashboard");
  await expect(page.getByRole("heading", { name: "Access denied" })).toBeVisible();
  expect(state.managementRequestCount()).toBe(0);
});

test("account role and permission management pages render module-owned evidence", async ({ page }, testInfo) => {
  (page as unknown as { setWebUIState: (state: { authenticated: boolean }) => void }).setWebUIState({ authenticated: true });
  await page.goto("/admin/accounts");
  await expect(page.getByRole("heading", { name: "Users" })).toBeVisible();
  await expect(page.getByText("Operator", { exact: true })).toBeVisible();
  await expect(page.getByText("Runtime status", { exact: true })).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath("iam-accounts.png"), fullPage: true });
  await page.goto("/admin/roles");
  await expect(page.getByRole("heading", { name: "Roles" })).toBeVisible();
  await expect(page.getByText("System owner", { exact: true })).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath("iam-roles.png"), fullPage: true });
  await page.goto("/admin/permissions");
  await expect(page.getByRole("heading", { name: "Permissions" })).toBeVisible();
  await expect(page.getByText("iam:account:read", { exact: true })).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath("iam-permissions.png"), fullPage: true });
});

test("organization management pages render tree, position and assignment evidence", async ({ page }, testInfo) => {
  (page as unknown as { setWebUIState: (state: { authenticated: boolean }) => void }).setWebUIState({ authenticated: true });
  await page.goto("/admin/departments");
  await expect(page.getByRole("heading", { name: "Departments" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Platform" })).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath("organization-departments.png"), fullPage: true });
  await page.goto("/admin/positions");
  await expect(page.getByRole("heading", { name: "Positions" })).toBeVisible();
  await expect(page.getByText("Manager", { exact: true })).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath("organization-positions.png"), fullPage: true });
  await page.goto("/admin/account-organization");
  await expect(page.getByRole("heading", { name: "Account organization", exact: true })).toBeVisible();
  // 068：主部门选择为 HeroUI Select（触发按钮 + option 列表），断言触发值。
  await expect(page.getByRole("button", { name: "Primary department" })).toContainText("Engineering");
  await page.screenshot({ path: testInfo.outputPath("organization-assignment.png"), fullPage: true });
});

test("075 openapi docs render the generated contract with swagger ui", async ({ page }, testInfo) => {
  (page as unknown as { setWebUIState: (state: { authenticated: boolean }) => void }).setWebUIState({ authenticated: true });
  await page.goto("/openapi");
  await expect(page.getByRole("heading", { name: "API Docs", exact: true })).toBeVisible();
  // Swagger UI 真实渲染：契约标题来自生成快照（Swagger UI 在 h1 中合并渲染
  // info.title + version + OAS 徽标，故用包含断言）。
  await expect(page.locator(".swagger-ui")).toBeVisible();
  await expect(page.locator(".swagger-ui .info .title")).toContainText("go-scaffold-template HTTP API");
  await expect(page.locator(".swagger-ui .opblock-tag").first()).toBeVisible();
  // 菜单已进入全局侧边栏（顶级平铺，图标语义 book）。
  await expect(page.locator(".app-sidebar").getByText("API Docs", { exact: true })).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath("075-openapi-docs.png"), fullPage: true });
});

test("navigation policy refreshes the manifest while keeping the registered route", async ({ page }, testInfo) => {
  (page as unknown as { setWebUIState: (state: { authenticated: boolean }) => void }).setWebUIState({ authenticated: true });
  await page.goto("/admin/menus");
  await expect(page.getByRole("heading", { name: "Menus", exact: true, level: 1 })).toBeVisible();
  const card = page.locator(".policy-card").filter({ hasText: "navigation.menus" });
  await expect(card.getByText("navigation.menus", { exact: true })).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath("navigation-menus.png"), fullPage: true });
  await card.getByRole("checkbox").press("Space");
  await card.getByRole("button", { name: "Save" }).click();
  await expect(page.getByRole("heading", { name: "Menus", exact: true, level: 1 })).toBeVisible();
  await expect(page.locator(".app-sidebar").getByText("Menus", { exact: true })).toHaveCount(0);
  await expect(page.locator(".revision code")).toContainText("e2e-navigat");
});

test("067 experience defaults reserve a stable scrollbar slot and reveal content", async ({ page }, testInfo) => {
  (page as unknown as { setWebUIState: (state: { authenticated: boolean }) => void }).setWebUIState({ authenticated: true });
  await page.goto("/admin/accounts");
  await expect(page.getByRole("heading", { name: "Users" })).toBeVisible();
  // 派生配置默认：稳定插槽（预留右侧）+ 阻尼平滑滚动开 + 弹入响应开
  await expect(page.locator("html")).toHaveAttribute("data-experience-scrollbar", "stable");
  await expect(page.locator("html")).toHaveAttribute("data-experience-smooth-scroll", "true");
  await expect(page.locator("html")).toHaveAttribute("data-experience-reveal", "true");
  // scrollbar-gutter 实际生效，Windows 实体滚动条不会挤压布局
  const gutter = await page.locator(".page-viewport").evaluate((element) => getComputedStyle(element).scrollbarGutter);
  expect(gutter).toBe("stable");
  // 新布局骨架：首屏区块卡片本身可见且弹入完成；列表项随滚动进入视口再断言
  await expect(page.locator(".page-section").first()).toHaveAttribute("data-reveal", "shown");
  await page.screenshot({ path: testInfo.outputPath("067-accounts-layout.png"), fullPage: true });
  await page.locator(".page-section").nth(2).scrollIntoViewIfNeeded();
  await expect(page.locator(".card-grid [data-reveal]").first()).toHaveAttribute("data-reveal", "shown");
  await page.goto("/dashboard");
  await expect(page.getByRole("heading", { name: "Runtime status" })).toBeVisible();
  await expect(page.locator(".stat-card").first()).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath("067-dashboard-layout.png"), fullPage: true });
});

test("067 theme drawer experience panel drives derived configuration", async ({ page }, testInfo) => {
  (page as unknown as { setWebUIState: (state: { authenticated: boolean }) => void }).setWebUIState({ authenticated: true });
  await page.goto("/dashboard");
  await expect(page.getByRole("heading", { name: "Runtime status" })).toBeVisible();
  await page.getByRole("button", { name: "Theme settings" }).click();
  const dialog = page.getByRole("dialog", { name: "Theme settings" });
  await dialog.getByRole("tab", { name: "Experience" }).click();
  await dialog.getByRole("switch", { name: "Damped smooth scroll" }).press("Space");
  await expect(page.locator("html")).toHaveAttribute("data-experience-smooth-scroll", "false");
  await dialog.getByRole("button", { name: "Page scrollbar slot" }).click();
  await page.getByRole("option", { name: "Overlay" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-experience-scrollbar", "overlay");
  await dialog.getByRole("switch", { name: "Damped smooth scroll" }).press("Space");
  await dialog.getByRole("button", { name: "Page scrollbar slot" }).click();
  await page.getByRole("option", { name: "Stable slot" }).click();
  await page.screenshot({ path: testInfo.outputPath("067-experience-drawer.png"), fullPage: true });
  await page.keyboard.press("Escape");
});

test("067 organization pages never render missing translation placeholders", async ({ page }, testInfo) => {
  (page as unknown as { setWebUIState: (state: { authenticated: boolean }) => void }).setWebUIState({ authenticated: true });
  await page.goto("/admin/account-organization");
  await expect(page.getByRole("heading", { name: "Account organization", exact: true })).toBeVisible();
  await expect(page.getByText("Translation resource missing")).toHaveCount(0);
  await expect(page.getByText("assignment version")).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath("067-organization-assignment.png"), fullPage: true });
  await page.goto("/admin/departments");
  await expect(page.getByRole("heading", { name: "Platform" })).toBeVisible();
  await expect(page.getByText("Translation resource missing")).toHaveCount(0);
  await page.screenshot({ path: testInfo.outputPath("067-organization-departments.png"), fullPage: true });
  await page.goto("/admin/positions");
  await expect(page.getByText("Manager", { exact: true })).toBeVisible();
  await expect(page.getByText("Translation resource missing")).toHaveCount(0);
});

test("068 heroui adoption renders across shell and business pages", async ({ page }, testInfo) => {
  (page as unknown as { setWebUIState: (state: { authenticated: boolean }) => void }).setWebUIState({ authenticated: true });
  await page.goto("/admin/accounts");
  await expect(page.getByRole("heading", { name: "Users" })).toBeVisible();
  // HeroUI 组件标记：Button（button--primary）与 Card（.card / data-slot="card"）
  await expect(page.locator(".button--primary").first()).toBeVisible();
  await expect(page.locator(".card").first()).toBeVisible();
  // 主题切换联动 HeroUI dark class
  await page.getByRole("button", { name: "Toggle theme mode" }).click();
  await expect(page.locator("html")).toHaveClass(/dark/);
  await page.screenshot({ path: testInfo.outputPath("068-hero-accounts-dark.png"), fullPage: true });
  await page.goto("/admin/account-organization");
  await expect(page.getByText("Account", { exact: true }).first()).toBeVisible();
  // HeroUI Select 触发器与 Card 布局
  await expect(page.locator(".select__trigger").first()).toBeVisible();
  await page.getByRole("button", { name: "Toggle theme mode" }).click();
  await expect(page.locator("html")).not.toHaveClass(/dark/);
  await page.screenshot({ path: testInfo.outputPath("068-hero-assignment.png"), fullPage: true });
});

test("069 shell is assembled from heroui/rac controls with dark and mobile evidence", async ({ page }, testInfo) => {
  (page as unknown as { setWebUIState: (state: { authenticated: boolean }) => void }).setWebUIState({ authenticated: true });
  await page.goto("/dashboard");
  await expect(page.getByRole("heading", { name: "Runtime status" })).toBeVisible();
  // 069 骨架拼装标记：RAC 账号菜单 menuitem、页签/搜索触发器为 HeroUI Button
  await page.getByRole("button", { name: "operator" }).click();
  await expect(page.getByRole("menuitem", { name: "Log out" })).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath("069-rac-account-menu.png"), fullPage: true });
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Toggle theme mode" }).click();
  await expect(page.locator("html")).toHaveClass(/dark/);
  await page.screenshot({ path: testInfo.outputPath("069-shell-dark.png"), fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: testInfo.outputPath("069-shell-mobile.png"), fullPage: true });
});

test("069 theme preset drives heroui semantic colors and persists", async ({ page }, testInfo) => {
  (page as unknown as { setWebUIState: (state: { authenticated: boolean }) => void }).setWebUIState({ authenticated: true });
  await page.goto("/admin/accounts");
  await expect(page.getByRole("heading", { name: "Users" })).toBeVisible();
  await page.getByRole("button", { name: "Theme settings" }).click();
  const dialog = page.getByRole("dialog", { name: "Theme settings" });
  await dialog.getByRole("tab", { name: "Presets" }).click();
  await dialog.getByRole("button", { name: "Cyan" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme-preset", "cyan");
  // HeroUI 语义色已由 preset 覆写（--heroui-primary 与 --primary 同步）
  const primary = await page.locator("html").evaluate((element) => getComputedStyle(element).getPropertyValue("--heroui-primary"));
  expect(primary.trim()).toContain("188");
  await page.screenshot({ path: testInfo.outputPath("069-preset-cyan.png"), fullPage: true });
  await page.keyboard.press("Escape");
});

test("070 settings center renders with bidirectional menu hierarchy", async ({ page }, testInfo) => {
  (page as unknown as { setWebUIState: (state: { authenticated: boolean }) => void }).setWebUIState({ authenticated: true });
  await page.goto("/settings/profile");
  await expect(page.getByRole("heading", { name: "Profile", exact: true })).toBeVisible();
  // 074 菜单一致性：全局设置组子项与页内 SectionNav 完全一致（8 分区）；
  // iam.security 归位 iam.access（页内不含该 iam 页面）。
  await expect(page.locator(".app-sidebar").getByText("Settings", { exact: true })).toBeVisible();
  await expect(page.locator(".app-sidebar").getByText("Management center")).toHaveCount(0);
  const navLabels = await page.locator("nav.section-nav .section-nav-item").allTextContents();
  expect(navLabels).toEqual(["Profile", "Account", "Security", "Appearance", "Notifications", "Language", "About", "Acknowledgements"]);
  await expect(page.locator(".app-sidebar").getByText("Account security")).toHaveCount(1);
  await expect(page.locator("nav.section-nav").getByText("Account security")).toHaveCount(0);
  await page.screenshot({ path: testInfo.outputPath("074-settings-menu-parity.png"), fullPage: true });
  await page.goto("/settings/account");
  await expect(page.getByRole("heading", { name: "Account", exact: true })).toBeVisible();
  await page.goto("/settings/appearance");
  await expect(page.getByRole("heading", { name: "Appearance", exact: true })).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath("070-settings-appearance.png"), fullPage: true });
  await page.goto("/settings/notifications");
  await expect(page.getByRole("heading", { name: "Notifications", exact: true })).toBeVisible();
  await expect(page.getByText("These preferences are stored locally.", { exact: false })).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath("070-settings-notifications.png"), fullPage: true });
});

test("071 settings in-page section navigation switches sections with active highlight", async ({ page }, testInfo) => {
  (page as unknown as { setWebUIState: (state: { authenticated: boolean }) => void }).setWebUIState({ authenticated: true });
  await page.goto("/settings/profile");
  await expect(page.getByRole("heading", { name: "Profile", exact: true })).toBeVisible();
  // 071 页内侧边栏：分区导航存在、当前分区高亮（aria-current）
  await expect(page.locator("nav.section-nav")).toBeVisible();
  await expect(page.locator("nav.section-nav [aria-current=page]")).toHaveText("Profile");
  await page.screenshot({ path: testInfo.outputPath("071-settings-profile.png"), fullPage: true });
  await page.locator("nav.section-nav").getByText("Account", { exact: true }).click();
  await expect(page).toHaveURL(/\/settings\/account/);
  await expect(page.getByRole("heading", { name: "Account", exact: true })).toBeVisible();
  await expect(page.locator("nav.section-nav [aria-current=page]")).toHaveText("Account");
  await page.goto("/settings/appearance");
  await expect(page.getByRole("heading", { name: "Appearance", exact: true })).toBeVisible();
  await expect(page.locator("nav.section-nav [aria-current=page]")).toHaveText("Appearance");
  await page.screenshot({ path: testInfo.outputPath("071-settings-appearance.png"), fullPage: true });
  await page.goto("/settings/notifications");
  await expect(page.getByRole("heading", { name: "Notifications", exact: true })).toBeVisible();
  await expect(page.getByText("These preferences are stored locally.", { exact: false })).toBeVisible();
  // 移动视口：页内导航折叠为横向分区条
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: testInfo.outputPath("071-settings-mobile.png"), fullPage: true });
});

test("072 settings section switches stay SPA with profile save, closure, language and about pages", async ({ page }, testInfo) => {
  (page as unknown as { setWebUIState: (state: { authenticated: boolean }) => void }).setWebUIState({ authenticated: true });
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/settings/profile");
  await expect(page.getByRole("heading", { name: "Profile", exact: true })).toBeVisible();
  // 071 页内侧边栏：分区导航存在、当前分区高亮（aria-current）
  // 073 固定页内导航 + 行布局回归：导航在内容左侧（flex row），不在顶部堆叠。
  await expect(page.locator("nav.section-nav")).toBeVisible();
  const navDirection = await page.locator(".settings-inner").evaluate((element) => getComputedStyle(element).flexDirection);
  expect(navDirection).toBe("row");
  // 073 固定页内导航：给导航节点打标记，切换分区后标记保留（卸载重挂则丢失）。
  await page.locator("nav.section-nav").evaluate((element) => { element.setAttribute("data-fixed-nav", "persistent"); });
  let fullLoads = 0;
  const onLoad = () => { fullLoads += 1; };
  page.on("load", onLoad);
  try {
    // SPA 分区切换：URL 与内容变化，且不发生整页 reload（load 计数不变）。
    await page.locator("nav.section-nav").getByText("Security", { exact: true }).click();
    await expect(page).toHaveURL(/\/settings\/security/);
    await expect(page.getByRole("heading", { name: "Security", exact: true })).toBeVisible();
    await expect(page.locator("nav.section-nav [aria-current=page]")).toHaveText("Security");
    expect(fullLoads).toBe(0);
    // 导航固定：同一节点仍是之前的导航（dataset 标记保留）
    await expect(page.locator("nav.section-nav[data-fixed-nav=persistent]")).toBeVisible();
    // 资料保存（PATCH self/profile mock）
    await page.locator("nav.section-nav").getByText("Profile", { exact: true }).click();
    await expect(page).toHaveURL(/\/settings\/profile/);
    const nickname = page.getByLabel("Nickname");
    await nickname.fill("Community");
    await page.getByRole("button", { name: "Save profile" }).click();
    await expect(page.getByText("Profile saved.", { exact: false })).toBeVisible();
    // 注销两步入口（对话框出现，取消保持会话）
    await page.locator("nav.section-nav").getByText("Account", { exact: true }).click();
    await expect(page).toHaveURL(/\/settings\/account/);
    await page.getByRole("button", { name: "Close account", exact: true }).first().click();
    await expect(page.getByRole("dialog", { name: "Close this account?" })).toBeVisible();
    await page.getByRole("button", { name: "Keep account", exact: true }).click();
    await expect(page.getByRole("dialog", { name: "Close this account?" })).toHaveCount(0);
    // 语言页与关于/鸣谢页渲染
    await page.locator("nav.section-nav").getByText("Language", { exact: true }).click();
    await expect(page).toHaveURL(/\/settings\/language/);
    await expect(page.getByRole("heading", { name: "Language", exact: true })).toBeVisible();
    await page.screenshot({ path: testInfo.outputPath("072-settings-language.png"), fullPage: true });
    await page.locator("nav.section-nav").getByText("About", { exact: true }).click();
    await expect(page.getByRole("heading", { name: "About", exact: true })).toBeVisible();
    await expect(page.getByText("Technology stack", { exact: false })).toBeVisible();
    await page.screenshot({ path: testInfo.outputPath("072-settings-about.png"), fullPage: true });
    await page.locator("nav.section-nav").getByText("Acknowledgements", { exact: true }).click();
    await expect(page.getByRole("heading", { name: "Acknowledgements", exact: true })).toBeVisible();
    expect(fullLoads).toBe(0);
    await page.screenshot({ path: testInfo.outputPath("072-settings-acknowledgement.png"), fullPage: true });
  } finally {
    page.off("load", onLoad);
  }
});
