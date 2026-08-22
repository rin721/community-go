// Auth module browser-side mock data source: shapes match api.ts types and are
// used only when the WebUI explicitly declares VITE_WEBUI_DATA_SOURCE=mock.
import type { WebUIMockRoute } from "@webui/sdk/mock";

const now = "2026-08-24T00:00:00.000Z";

const events = [
  { operation: "iam.accounts.list", action: "list", actorKind: "service", subjectHash: "a1b2c3d4", resourceType: "account", resourceHash: "e5f6a7b8", decision: "allowed", outcome: "succeeded", occurredAt: now },
  { operation: "iam.sessions.revoke", action: "revoke", actorKind: "service", subjectHash: "a1b2c3d4", resourceType: "account", resourceHash: "e5f6a7b8", decision: "rbac_denied", outcome: "denied", occurredAt: now },
];

export const webuiMockRoutes: ReadonlyArray<WebUIMockRoute> = [
  { method: "GET", pattern: "/api/v1/auth/audit", handler: () => ({ items: events, offset: 0, limit: 20, total: events.length }) },
];

export default webuiMockRoutes;