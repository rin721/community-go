import { beforeEach, describe, expect, it } from "vitest";
import { mockRequestJSON, mockRequestText, resetMockRouterCache } from "./router";
import { webuiMockManifest, webuiRevision } from "../generated/webui-registry";

describe("mock transport", () => {
  beforeEach(() => {
    resetMockRouterCache();
  });

  it("serves the host manifest whose catalogRevision matches the generated revision", async () => {
    const manifest = await mockRequestJSON<{ catalogRevision: string; routes: unknown[] }>("/api/v1/webui/manifest");
    expect(manifest.catalogRevision).toBe(webuiRevision);
    expect(manifest.routes.length).toBeGreaterThan(0);
  });

  it("serves an authenticated host session", async () => {
    const session = await mockRequestJSON<{ identity: { permissions: string[] } }>("/api/v1/iam/session");
    expect(session.identity.permissions).toContain("*");
  });

  it("dispatches module routes by method and parameterized path", async () => {
    const accounts = await mockRequestJSON<{ items: unknown[] }>("/api/v1/iam/accounts?offset=0&limit=100");
    expect(accounts.items.length).toBeGreaterThan(0);
    const detail = await mockRequestJSON<{ activeSessionCount: number; roles: unknown[] }>("/api/v1/iam/accounts/acct-1");
    expect(detail.activeSessionCount).toBeGreaterThan(0);
    expect(detail.roles.length).toBeGreaterThan(0);
    const rolesView = await mockRequestJSON<{ roleIds: string[] }>("/api/v1/iam/accounts/acct-1/roles");
    expect(rolesView.roleIds.length).toBeGreaterThan(0);
    const roleDetail = await mockRequestJSON<{ assignedAccountCount: number; permissions: Array<{ risk: string }> }>("/api/v1/iam/roles/role-1");
    expect(roleDetail.assignedAccountCount).toBeGreaterThan(0);
    expect(roleDetail.permissions.every((permission) => Boolean(permission.risk))).toBe(true);
    const patched = await mockRequestJSON<void>("/api/v1/iam/accounts/acct-1/status", { method: "PATCH", body: "{}" });
    expect(patched).toBeUndefined();
  });

  it("serves ops management fixtures including plain-text metrics", async () => {
    const readiness = await mockRequestJSON<{ status: string }>("/management/readyz");
    expect(readiness.status).toBe("pass");
    const metrics = await mockRequestText("/management/metrics");
    expect(metrics).toContain("app_http_requests_total");
  });

  it("rejects unknown routes with the same error code a real 404 would carry", async () => {
    await expect(mockRequestJSON("/api/v1/does/not/exist")).rejects.toThrow("route_not_found");
    await expect(mockRequestText("/management/does/not/exist")).rejects.toThrow("route_not_found");
  });
});
