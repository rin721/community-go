// Auth module browser-side mock data source: shapes match api.ts types and are
// used only when the WebUI explicitly declares VITE_WEBUI_DATA_SOURCE=mock.
import type { WebUIMockRoute } from "@webui/sdk/mock";

const events = [
  { operation: "iam.accounts.list", action: "list", actorKind: "service", subjectHash: "a1b2c3d4", resourceType: "account", resourceHash: "e5f6a7b8", decision: "allowed", outcome: "succeeded", occurredAt: "2026-01-28T09:12:00.000Z" },
  { operation: "iam.sessions.revoke", action: "revoke", actorKind: "service", subjectHash: "a1b2c3d4", resourceType: "account", resourceHash: "e5f6a7b8", decision: "rbac_denied", outcome: "denied", occurredAt: "2026-01-27T18:04:00.000Z" },
  { operation: "organization.departments.update", action: "update", actorKind: "user", subjectHash: "acct1hash", resourceType: "department", resourceHash: "dept2hash", decision: "allowed", outcome: "succeeded", occurredAt: "2026-01-27T12:30:00.000Z" },
  { operation: "iam.roles.permissions.replace", action: "grant", actorKind: "user", subjectHash: "acct1hash", resourceType: "role", resourceHash: "role3hash", decision: "allowed", outcome: "succeeded", occurredAt: "2026-01-26T16:40:00.000Z" },
  { operation: "iam.accounts.archive", action: "archive", actorKind: "user", subjectHash: "acct4hash", resourceType: "account", resourceHash: "acct7hash", decision: "allowed", outcome: "succeeded", occurredAt: "2026-01-25T10:22:00.000Z" },
  { operation: "iam.accounts.archive", action: "archive", actorKind: "user", subjectHash: "acct3hash", resourceType: "account", resourceHash: "acct2hash", decision: "rbac_denied", outcome: "denied", occurredAt: "2026-01-24T09:05:00.000Z" },
  { operation: "iam.api-tokens.rotate", action: "rotate", actorKind: "user", subjectHash: "acct1hash", resourceType: "api-token", resourceHash: "tok2hash", decision: "allowed", outcome: "succeeded", occurredAt: "2026-01-23T14:55:00.000Z" },
  { operation: "iam.api-tokens.create", action: "create", actorKind: "user", subjectHash: "acct6hash", resourceType: "api-token", resourceHash: "tok6hash", decision: "allowed", outcome: "succeeded", occurredAt: "2026-01-22T08:10:00.000Z" },
];

export const webuiMockRoutes: ReadonlyArray<WebUIMockRoute> = [
  { method: "GET", pattern: "/api/v1/auth/audit", handler: () => ({ items: events, offset: 0, limit: 20, total: events.length }) },
];

export default webuiMockRoutes;