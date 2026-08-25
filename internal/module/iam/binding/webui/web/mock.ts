// IAM module browser-side mock data source: shapes match api.ts types and are used
// only when the WebUI explicitly declares VITE_WEBUI_DATA_SOURCE=mock. They never
// impersonate the real service state.
import type { WebUIMockRoute } from "@webui/sdk/mock";

const createdAt = "2026-01-01T00:00:00.000Z";
const expiresAt = "2026-01-31T00:00:00.000Z";

const mockSession = {
  identity: {
    accountId: "mock-admin",
    username: "admin",
    displayName: "Mock Administrator",
    permissions: ["*"],
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
];

const roles = [
  { id: "role-1", code: "admin", name: "Administrator", description: "Full platform access", active: true, archived: false, system: true, version: 1 },
  { id: "role-2", code: "viewer", name: "Viewer", description: "Read-only access", active: true, archived: false, system: false, version: 1 },
];

const permissions = [
  { key: "iam.accounts.list", ownerModuleId: "iam", descriptionMessageId: "webui.iam.permissions.list" },
  { key: "iam.roles.list", ownerModuleId: "iam", descriptionMessageId: "webui.iam.permissions.list" },
  { key: "iam.permissions.list", ownerModuleId: "iam", descriptionMessageId: "webui.iam.permissions.list" },
  { key: "ops.diagnostics", ownerModuleId: "ops", descriptionMessageId: "webui.iam.permissions.list" },
  { key: "ops.metrics", ownerModuleId: "ops", descriptionMessageId: "webui.iam.permissions.list" },
];

export const webuiMockRoutes: ReadonlyArray<WebUIMockRoute> = [
  { method: "GET", pattern: "/api/v1/iam/session", handler: () => mockSession },
  { method: "POST", pattern: "/api/v1/iam/login", handler: () => mockSession },
  { method: "POST", pattern: "/api/v1/iam/setup", handler: () => mockSession },
  { method: "POST", pattern: "/api/v1/iam/self/password", handler: () => undefined },
  { method: "GET", pattern: "/api/v1/iam/accounts", handler: () => ({ items: accounts, offset: 0, limit: 100, total: accounts.length }) },
  { method: "POST", pattern: "/api/v1/iam/accounts", handler: (request) => {
    const body = (request.body ?? {}) as { username?: string; displayName?: string };
    return { id: `acct-${accounts.length + 1}`, username: body.username ?? "new.account", displayName: body.displayName ?? "New Account", status: "active" as const, archived: false, mustChangePassword: false, securityRevision: 1, version: 1 };
  } },
  { method: "PATCH", pattern: "/api/v1/iam/accounts/{id}/status", handler: () => undefined },
  { method: "PATCH", pattern: "/api/v1/iam/accounts/{id}", handler: () => undefined },
  { method: "POST", pattern: "/api/v1/iam/accounts/{id}/archive", handler: () => undefined },
  { method: "POST", pattern: "/api/v1/iam/accounts/{id}/password-reset", handler: () => undefined },
  { method: "GET", pattern: "/api/v1/iam/accounts/{id}/roles", handler: () => ({ accountId: "acct-1", accountVersion: 1, authorizationRevision: 2, roleIds: roles.map((role) => role.id) }) },
  { method: "PUT", pattern: "/api/v1/iam/accounts/{id}/roles", handler: (request) => {
    const body = (request.body ?? {}) as { roleIds?: string[] };
    return { entityId: "acct-1", entityVersion: 1, authorizationRevision: 2, added: body.roleIds?.length ?? 0, removed: 0 };
  } },
  { method: "GET", pattern: "/api/v1/iam/roles", handler: () => ({ items: roles, offset: 0, limit: 100, total: roles.length }) },
  { method: "POST", pattern: "/api/v1/iam/roles", handler: (request) => {
    const body = (request.body ?? {}) as { code?: string; name?: string; description?: string };
    return { id: `role-${roles.length + 1}`, code: body.code ?? "custom", name: body.name ?? "Custom Role", description: body.description ?? "", active: true, archived: false, system: false, version: 1 };
  } },
  { method: "PATCH", pattern: "/api/v1/iam/roles/{id}", handler: () => ({ ...roles[1], version: 2 }) },
  { method: "POST", pattern: "/api/v1/iam/roles/{id}/archive", handler: () => undefined },
  { method: "GET", pattern: "/api/v1/iam/roles/{id}/permissions", handler: () => ({ roleId: "role-1", roleVersion: 1, authorizationRevision: 2, permissionKeys: permissions.map((permission) => permission.key) }) },
  { method: "PUT", pattern: "/api/v1/iam/roles/{id}/permissions", handler: () => ({ entityId: "role-1", entityVersion: 1, authorizationRevision: 2, added: 1, removed: 0 }) },
  { method: "GET", pattern: "/api/v1/iam/permissions", handler: () => permissions },
  { method: "GET", pattern: "/api/v1/iam/sessions", handler: () => ({
    items: [
      { idHash: "abc123def456", accountId: "acct-1", createdAt, lastSeenAt: createdAt, idleExpiresAt: expiresAt, absoluteExpiresAt: expiresAt },
      { idHash: "fed456cba321", accountId: "acct-2", createdAt, lastSeenAt: createdAt, idleExpiresAt: expiresAt, absoluteExpiresAt: expiresAt, revokedAt: createdAt },
    ],
    offset: 0,
    limit: 100,
    total: 2,
  }) },
  { method: "POST", pattern: "/api/v1/iam/sessions/revoke", handler: () => undefined },

  { method: "GET", pattern: "/api/v1/iam/api-tokens", handler: () => ({ items: [
      { id: "tok-1", name: "mock-ci", description: "", scopes: ["management:read"], status: "active" as const, createdAt, lastUsedAt: createdAt },
    ], offset: 0, limit: 50, total: 1 }) },
  { method: "POST", pattern: "/api/v1/iam/api-tokens", handler: (request) => {
    const body = (request.body ?? {}) as { name?: string; scopes?: string[]; description?: string };
    return { id: "tok-new", name: body.name ?? "new", description: body.description ?? "", scopes: body.scopes ?? [], status: "active" as const, createdAt, secret: "iam_mock-api-token-secret" };
  } },
  { method: "PATCH", pattern: "/api/v1/iam/api-tokens/{id}", handler: () => undefined },
  { method: "POST", pattern: "/api/v1/iam/api-tokens/{id}/rotate", handler: () => ({ id: "tok-1", name: "mock-ci", description: "", scopes: ["management:read"], status: "active" as const, createdAt, secret: "iam_mock-rotated-secret" }) },
  { method: "POST", pattern: "/api/v1/iam/api-tokens/{id}/disable", handler: () => undefined },
  { method: "POST", pattern: "/api/v1/iam/api-tokens/{id}/enable", handler: () => undefined },
  { method: "POST", pattern: "/api/v1/iam/api-tokens/{id}/revoke", handler: () => undefined },
];

export default webuiMockRoutes;