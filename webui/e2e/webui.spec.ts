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

function manifest(authenticated: boolean, availability: "available" | "degraded" | "unavailable" = "available", accessOverride?: "allowed" | "denied") {
  const access = authenticated ? (accessOverride ?? "allowed") : "authentication-required";
  return {
    catalogRevision: webuiRevision,
    navigationRevision: "e2e-navigation-revision",
    routes: [
      { moduleId: "iam", id: "iam.setup", path: "/setup", entryId: "iam.setup", titleMessageId: "webui.iam.setup.title", layout: "blank", deliveryState: "implemented", default: false, unauthenticatedDefault: false, access: "allowed", availability: "available", availableCapabilities: [] },
      { moduleId: "iam", id: "iam.login", path: "/login", entryId: "iam.login", titleMessageId: "webui.iam.login.title", layout: "blank", deliveryState: "implemented", default: false, unauthenticatedDefault: true, access: "allowed", availability: "available", availableCapabilities: [] },
      { moduleId: "iam", id: "iam.security", path: "/account/security", entryId: "iam.security", titleMessageId: "webui.iam.security.title", layout: "app", deliveryState: "implemented", default: false, unauthenticatedDefault: false, access, availability: "available", availableCapabilities: [] },
      { moduleId: "iam", id: "iam.accounts", path: "/admin/accounts", entryId: "iam.accounts", titleMessageId: "webui.iam.accounts.title", layout: "app", deliveryState: "implemented", default: false, unauthenticatedDefault: false, access, availability: "available", availableCapabilities: [] },
      { moduleId: "iam", id: "iam.roles", path: "/admin/roles", entryId: "iam.roles", titleMessageId: "webui.iam.roles.title", layout: "app", deliveryState: "implemented", default: false, unauthenticatedDefault: false, access, availability: "available", availableCapabilities: [] },
      { moduleId: "iam", id: "iam.permissions", path: "/admin/permissions", entryId: "iam.permissions", titleMessageId: "webui.iam.permissions.title", layout: "app", deliveryState: "implemented", default: false, unauthenticatedDefault: false, access, availability: "available", availableCapabilities: [] },
      { moduleId: "ops", id: "ops.dashboard", path: "/dashboard", entryId: "ops.dashboard", titleMessageId: "webui.ops.dashboard.title", layout: "app", deliveryState: "implemented", default: true, unauthenticatedDefault: false, access, availability, availableCapabilities: availability === "unavailable" ? [] : ["diagnostics", "metrics"] },
      { moduleId: "ops", id: "ops.capabilities", path: "/dashboard/capabilities", entryId: "ops.capabilities", titleMessageId: "webui.ops.capabilities.title", layout: "app", deliveryState: "implemented", default: false, unauthenticatedDefault: false, access, availability, availableCapabilities: availability === "unavailable" ? [] : ["diagnostics"] },
    ],
    menu: authenticated && access !== "denied" ? [
      { moduleId: "ops", id: "ops.dashboard", routeId: "ops.dashboard", titleMessageId: "webui.ops.dashboard.title", iconId: "activity", order: 10 },
      { moduleId: "ops", id: "ops.capabilities", parentId: "ops.dashboard", routeId: "ops.capabilities", titleMessageId: "webui.ops.capabilities.title", iconId: "activity", order: 20 },
      { moduleId: "iam", id: "iam.security", routeId: "iam.security", titleMessageId: "webui.iam.security.title", iconId: "user", order: 30 },
      { moduleId: "iam", id: "iam.accounts", routeId: "iam.accounts", titleMessageId: "webui.iam.accounts.title", iconId: "users", order: 40 },
      { moduleId: "iam", id: "iam.roles", routeId: "iam.roles", titleMessageId: "webui.iam.roles.title", iconId: "shield", order: 50 },
      { moduleId: "iam", id: "iam.permissions", routeId: "iam.permissions", titleMessageId: "webui.iam.permissions.title", iconId: "key", order: 60 },
    ] : [],
  };
}

test.beforeEach(async ({ page }) => {
  let authenticated = false;
  let availability: "available" | "degraded" | "unavailable" = "available";
  let accessOverride: "allowed" | "denied" | undefined;
  let managementRequestCount = 0;

  await page.route("**/api/v1/webui/manifest", async (route) => {
    await route.fulfill({ json: manifest(authenticated, availability, accessOverride) });
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
  await page.route("**/api/v1/iam/accounts?*", async (route) => {
    await route.fulfill({ json: { items: [{ id: "user-1", username: "operator", displayName: "Operator", status: "active", mustChangePassword: false, securityRevision: 1, version: 1 }], offset: 0, limit: 100, total: 1 } });
  });
  await page.route("**/api/v1/iam/accounts/user-1/roles", async (route) => { await route.fulfill({ json: ["role-owner"] }); });
  await page.route("**/api/v1/iam/roles?*", async (route) => {
    await route.fulfill({ json: { items: [{ id: "role-owner", code: "owner", name: "System owner", description: "", active: true, archived: false, system: true, version: 1 }], offset: 0, limit: 100, total: 1 } });
  });
  await page.route("**/api/v1/iam/roles/role-owner/permissions", async (route) => { await route.fulfill({ json: ["iam:account:read"] }); });
  await page.route("**/api/v1/iam/permissions", async (route) => { await route.fulfill({ json: [{ key: "iam:account:read", ownerModuleId: "iam", descriptionMessageId: "permission.iam.account.read" }] }); });
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
  await page.locator(".account-menu summary").click();
  await page.getByRole("button", { name: "Log out" }).click();
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
