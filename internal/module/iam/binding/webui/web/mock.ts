// IAM module browser-side mock data source: shapes match api.ts types and are used
// only when the WebUI explicitly declares VITE_WEBUI_DATA_SOURCE=mock. They never
// impersonate the real service state.
import type { WebUIMockRoute } from "@webui/sdk/mock";
import type { PermissionDefinition } from "./api";

const createdAt = "2026-01-01T00:00:00.000Z";
const expiresAt = "2026-01-31T00:00:00.000Z";

const mockSession = {
  identity: {
    accountId: "mock-admin",
    username: "admin",
    displayName: "Mock Administrator",
    permissions: ["*", "iam:account:read", "iam:account:write", "iam:role:read", "iam:role:write", "iam:api-token:read", "iam:api-token:write", "iam:session:read", "iam:session:revoke"],
    mustChangePassword: false,
    securityRevision: 1,
  },
  csrfToken: "mock-csrf-token",
  createdAt,
  idleExpiresAt: expiresAt,
  absoluteExpiresAt: expiresAt,
};

const accounts = [
  { id: "acct-1", username: "admin", displayName: "Mock Administrator", status: "active" as const, archived: false, mustChangePassword: false, securityRevision: 1, version: 1 },
  { id: "acct-2", username: "ops.reader", displayName: "Ops Reader", status: "active" as const, archived: false, mustChangePassword: true, securityRevision: 2, version: 1 },
  { id: "acct-3", username: "finance.lead", displayName: "Finance Lead", status: "active" as const, archived: false, mustChangePassword: false, securityRevision: 3, version: 1 },
  { id: "acct-4", username: "security.auditor", displayName: "Security Auditor", status: "active" as const, archived: false, mustChangePassword: false, securityRevision: 1, version: 1 },
  { id: "acct-5", username: "hr.manager", displayName: "HR Manager", status: "disabled" as const, archived: false, mustChangePassword: false, securityRevision: 2, version: 1 },
  { id: "acct-6", username: "q.engineer", displayName: "QA Engineer", status: "active" as const, archived: false, mustChangePassword: false, securityRevision: 4, version: 1 },
  { id: "acct-7", username: "rel.mgr", displayName: "Release Manager", status: "disabled" as const, archived: true, mustChangePassword: false, securityRevision: 2, version: 1 },
  { id: "acct-8", username: "support.team", displayName: "Support Team", status: "active" as const, archived: false, mustChangePassword: false, securityRevision: 1, version: 1 },
];

const roles = [
  { id: "role-1", code: "admin", name: "Administrator", description: "Full platform access", active: true, archived: false, system: true, version: 1 },
  { id: "role-2", code: "viewer", name: "Viewer", description: "Read-only access", active: true, archived: false, system: false, version: 1 },
  { id: "role-3", code: "sec.admin", name: "Security Admin", description: "Manage accounts, sessions and audit", active: true, archived: false, system: false, version: 1 },
  { id: "role-4", code: "org.admin", name: "Organization Admin", description: "Manage departments and positions", active: true, archived: false, system: false, version: 1 },
  { id: "role-5", code: "fin.reader", name: "Finance Reader", description: "Read finance dashboards", active: true, archived: false, system: false, version: 1 },
  { id: "role-6", code: "ex.support", name: "External Support", description: "Limited support scope", active: false, archived: false, system: false, version: 1 },
  { id: "role-7", code: "legacy.api", name: "Legacy API Role", description: "Retired service account role", active: true, archived: true, system: false, version: 1 },
  { id: "role-8", code: "release.mgr", name: "Release Manager", description: "Deployment and rollback rights", active: true, archived: false, system: false, version: 1 },
];

const permissions: PermissionDefinition[] = [
  { key: "iam.accounts.list", ownerModuleId: "iam", descriptionMessageId: "permission.iam.account.read", risk: "elevated" as const },
  { key: "iam.roles.list", ownerModuleId: "iam", descriptionMessageId: "permission.iam.role.read", risk: "elevated" as const },
  { key: "iam.permissions.list", ownerModuleId: "iam", descriptionMessageId: "permission.iam.permission.read", risk: "elevated" as const },
  { key: "iam.sessions.list", ownerModuleId: "iam", descriptionMessageId: "permission.iam.session.read", risk: "elevated" as const },
  { key: "ops.diagnostics", ownerModuleId: "ops", descriptionMessageId: "permission.ops.diagnostics", risk: "elevated" as const },
  { key: "ops.metrics", ownerModuleId: "ops", descriptionMessageId: "permission.ops.metrics", risk: "elevated" as const },
  { key: "auth.audit.list", ownerModuleId: "auth", descriptionMessageId: "permission.auth.audit.read", risk: "elevated" as const },
  { key: "organization.departments.list", ownerModuleId: "organization", descriptionMessageId: "permission.organization.department.read", risk: "standard" as const },
  { key: "organization.positions.list", ownerModuleId: "organization", descriptionMessageId: "permission.organization.position.read", risk: "standard" as const },
  { key: "navigation.menus.list", ownerModuleId: "navigation", descriptionMessageId: "permission.navigation.menu.read", risk: "standard" as const },
  { key: "todo.item.read", ownerModuleId: "todo", descriptionMessageId: "permission.todo.read", risk: "standard" as const },
];

export const webuiMockRoutes: ReadonlyArray<WebUIMockRoute> = [
  { method: "GET", pattern: "/api/v1/iam/session", handler: () => mockSession },
  { method: "POST", pattern: "/api/v1/iam/login", handler: () => mockSession },
  { method: "POST", pattern: "/api/v1/iam/setup", handler: () => mockSession },
  { method: "POST", pattern: "/api/v1/iam/self/password", handler: () => undefined },
  { method: "GET", pattern: "/api/v1/iam/accounts", handler: () => ({ items: accounts, offset: 0, limit: 100, total: accounts.length }) },
  { method: "GET", pattern: "/api/v1/iam/accounts/{id}", handler: (request) => {
    const accountID = request.path.split("/").at(-1);
    const account = accounts.find((item) => item.id === accountID) ?? accounts[0];
    return { account, roles, authorizationRevision: 2, activeSessionCount: 1, totalSessionCount: 2, activeApiTokenCount: 1, createdAt: "2026-08-01T08:00:00Z", updatedAt: "2026-08-29T08:00:00Z" };
  } },
  { method: "POST", pattern: "/api/v1/iam/accounts", handler: (request) => {
    const body = (request.body ?? {}) as { username?: string; displayName?: string };
    return { id: `acct-${accounts.length + 1}`, username: body.username ?? "new.account", displayName: body.displayName ?? "New Account", status: "active" as const, archived: false, mustChangePassword: false, securityRevision: 1, version: 1 };
  } },
  { method: "PATCH", pattern: "/api/v1/iam/accounts/{id}/status", handler: () => undefined },
  { method: "PATCH", pattern: "/api/v1/iam/accounts/{id}", handler: () => undefined },
  { method: "POST", pattern: "/api/v1/iam/accounts/{id}/archive", handler: () => undefined },
  { method: "POST", pattern: "/api/v1/iam/accounts/batch-status", handler: (request) => {
    const body = (request.body ?? {}) as { accountIds?: string[] };
    const accountIds = body.accountIds ?? [];
    return { requestedCount: accountIds.length, processedCount: accountIds.length, succeeded: accountIds.map((resourceId) => ({ resourceId })), failed: [] };
  } },
  { method: "POST", pattern: "/api/v1/iam/accounts/batch-archive", handler: (request) => {
    const body = (request.body ?? {}) as { accountIds?: string[] };
    const accountIds = body.accountIds ?? [];
    return { requestedCount: accountIds.length, processedCount: accountIds.length, succeeded: accountIds.map((resourceId) => ({ resourceId })), failed: [] };
  } },
  { method: "POST", pattern: "/api/v1/iam/accounts/{id}/password-reset", handler: () => undefined },
  { method: "GET", pattern: "/api/v1/iam/accounts/{id}/roles", handler: () => ({ accountId: "acct-1", accountVersion: 1, authorizationRevision: 2, roleIds: roles.map((role) => role.id) }) },
  { method: "PUT", pattern: "/api/v1/iam/accounts/{id}/roles", handler: (request) => {
    const body = (request.body ?? {}) as { roleIds?: string[] };
    return { entityId: "acct-1", entityVersion: 1, authorizationRevision: 2, added: body.roleIds?.length ?? 0, removed: 0 };
  } },
  { method: "GET", pattern: "/api/v1/iam/roles", handler: () => ({ items: roles, offset: 0, limit: 100, total: roles.length }) },
  { method: "GET", pattern: "/api/v1/iam/roles/{id}", handler: (request) => {
    const roleID = request.path.split("/").at(-1);
    const role = roles.find((item) => item.id === roleID) ?? roles[0];
    return { role, permissions, authorizationRevision: 2, assignedAccountCount: 3, ownerModuleCount: new Set(permissions.map((permission) => permission.ownerModuleId)).size, elevatedPermissionCount: permissions.filter((permission) => permission.risk === "elevated").length, criticalPermissionCount: permissions.filter((permission) => permission.risk === "critical").length, createdAt: "2026-08-01T08:00:00Z", updatedAt: "2026-08-29T08:00:00Z" };
  } },
  { method: "POST", pattern: "/api/v1/iam/roles", handler: (request) => {
    const body = (request.body ?? {}) as { code?: string; name?: string; description?: string };
    return { id: `role-${roles.length + 1}`, code: body.code ?? "custom", name: body.name ?? "Custom Role", description: body.description ?? "", active: true, archived: false, system: false, version: 1 };
  } },
  { method: "PATCH", pattern: "/api/v1/iam/roles/{id}", handler: () => ({ ...roles[1], version: 2 }) },
  { method: "POST", pattern: "/api/v1/iam/roles/{id}/archive", handler: () => undefined },
  { method: "GET", pattern: "/api/v1/iam/roles/{id}/permissions", handler: () => ({ roleId: "role-1", roleVersion: 1, authorizationRevision: 2, permissionKeys: permissions.map((permission) => permission.key) }) },
  { method: "PUT", pattern: "/api/v1/iam/roles/{id}/permissions", handler: () => ({ entityId: "role-1", entityVersion: 1, authorizationRevision: 2, added: 1, removed: 0 }) },
  { method: "GET", pattern: "/api/v1/iam/permissions", handler: () => permissions },
  { method: "GET", pattern: "/api/v1/iam/permissions/roles", handler: () => ({ items: roles.slice(0, 2), offset: 0, limit: 100, total: 2 }) },
  { method: "GET", pattern: "/api/v1/iam/sessions", handler: () => ({
    items: [
      { idHash: "abc123def456", accountId: "acct-1", createdAt: "2026-01-01T00:00:00.000Z", lastSeenAt: "2026-01-28T09:12:00.000Z", idleExpiresAt: "2026-01-28T09:27:00.000Z", absoluteExpiresAt: "2026-03-01T00:00:00.000Z" },
      { idHash: "fed456cba321", accountId: "acct-2", createdAt: "2026-01-02T08:30:00.000Z", lastSeenAt: "2026-01-27T18:04:00.000Z", idleExpiresAt: "2026-01-27T18:19:00.000Z", absoluteExpiresAt: "2026-03-02T00:00:00.000Z", revokedAt: "2026-01-20T10:00:00.000Z" },
      { idHash: "77aa88bb99cc", accountId: "acct-3", createdAt: "2026-01-05T11:20:00.000Z", lastSeenAt: "2026-01-28T07:55:00.000Z", idleExpiresAt: "2026-01-28T08:10:00.000Z", absoluteExpiresAt: "2026-03-05T00:00:00.000Z" },
      { idHash: "12ab34cd56ef", accountId: "acct-4", createdAt: "2026-01-08T14:45:00.000Z", lastSeenAt: "2026-01-25T22:31:00.000Z", idleExpiresAt: "2026-01-25T22:46:00.000Z", absoluteExpiresAt: "2026-03-08T00:00:00.000Z", revokedAt: "2026-01-26T09:00:00.000Z" },
      { idHash: "deadbeef0001", accountId: "acct-5", createdAt: "2026-01-10T10:10:00.000Z", lastSeenAt: "2026-01-10T10:15:00.000Z", idleExpiresAt: "2026-01-10T10:30:00.000Z", absoluteExpiresAt: "2026-03-10T00:00:00.000Z", revokedAt: "2026-01-15T12:00:00.000Z" },
      { idHash: "cafe1234beef", accountId: "acct-6", createdAt: "2026-01-12T16:00:00.000Z", lastSeenAt: "2026-01-28T11:02:00.000Z", idleExpiresAt: "2026-01-28T11:17:00.000Z", absoluteExpiresAt: "2026-03-12T00:00:00.000Z" },
      { idHash: "0badc0de0007", accountId: "acct-7", createdAt: "2026-01-15T09:05:00.000Z", lastSeenAt: "2026-01-18T19:44:00.000Z", idleExpiresAt: "2026-01-18T19:59:00.000Z", absoluteExpiresAt: "2026-03-15T00:00:00.000Z", revokedAt: "2026-01-22T08:30:00.000Z" },
      { idHash: "ffee00112233", accountId: "acct-8", createdAt: "2026-01-20T13:22:00.000Z", lastSeenAt: "2026-01-27T20:10:00.000Z", idleExpiresAt: "2026-01-27T20:25:00.000Z", absoluteExpiresAt: "2026-03-20T00:00:00.000Z" },
    ],
    offset: 0,
    limit: 100,
    total: 8,
  }) },
  { method: "POST", pattern: "/api/v1/iam/sessions/revoke", handler: () => undefined },

  { method: "GET", pattern: "/api/v1/iam/api-tokens", handler: () => ({ items: [
      { id: "tok-1", name: "mock-ci", description: "", scopes: ["management:read"], status: "active" as const, createdAt, lastUsedAt: createdAt },
      { id: "tok-2", name: "ops-export", description: "Nightly ops export", scopes: ["ops:metrics:read"], status: "active" as const, createdAt: "2025-12-20T00:00:00.000Z", lastUsedAt: "2026-01-27T23:59:00.000Z" },
      { id: "tok-3", name: "legacy-upload", description: "Retired upload client", scopes: ["todo:item:write"], status: "revoked" as const, createdAt: "2025-11-11T00:00:00.000Z", revokedAt: "2026-01-05T00:00:00.000Z" },
      { id: "tok-4", name: "beta-dashboard", description: "Beta dashboard widget", scopes: ["management:read"], status: "disabled" as const, createdAt: "2025-12-01T00:00:00.000Z", disabledAt: "2026-01-10T00:00:00.000Z" },
      { id: "tok-5", name: "short-lived", description: "Short-lived deploy token", scopes: ["iam:role:read"], status: "expired" as const, createdAt: "2025-12-15T00:00:00.000Z", expiresAt: "2026-01-15T00:00:00.000Z" },
      { id: "tok-6", name: "audit-reader", description: "Audit log consumer", scopes: ["auth:audit:read"], status: "active" as const, createdAt: "2026-01-02T00:00:00.000Z", lastUsedAt: "2026-01-28T06:00:00.000Z" },
    ], offset: 0, limit: 50, total: 6 }) },
  { method: "POST", pattern: "/api/v1/iam/api-tokens", handler: (request) => {
    const body = (request.body ?? {}) as { name?: string; scopes?: string[]; description?: string };
    return { id: "tok-new", name: body.name ?? "new", description: body.description ?? "", scopes: body.scopes ?? [], status: "active" as const, createdAt, secret: "iam_mock-api-token-secret" };
  } },
  { method: "PATCH", pattern: "/api/v1/iam/api-tokens/{id}", handler: () => undefined },
  { method: "POST", pattern: "/api/v1/iam/api-tokens/{id}/rotate", handler: () => ({ id: "tok-1", name: "mock-ci", description: "", scopes: ["management:read"], status: "active" as const, createdAt, secret: "iam_mock-rotated-secret" }) },
  { method: "POST", pattern: "/api/v1/iam/api-tokens/{id}/disable", handler: () => undefined },
  { method: "POST", pattern: "/api/v1/iam/api-tokens/{id}/enable", handler: () => undefined },
  { method: "POST", pattern: "/api/v1/iam/api-tokens/{id}/revoke", handler: () => undefined },
  // 090 PAGE-090-002: batch revoke returns per-item success/failure like the server.
  { method: "POST", pattern: "/api/v1/iam/api-tokens/batch-revoke", handler: (request) => {
    const body = (request.body ?? {}) as { tokenIds?: string[] };
    const tokenIds = body.tokenIds ?? [];
    return { requestedCount: tokenIds.length, processedCount: tokenIds.length, succeeded: tokenIds.map((tokenId) => ({ resourceId: tokenId })), failed: [], correlationId: "mock-corr-batch-revoke" };
  } },
];

export default webuiMockRoutes;
