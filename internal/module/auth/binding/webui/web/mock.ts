// Auth module browser-side mock data source: shapes match api.ts types and are
// used only when the WebUI explicitly declares VITE_WEBUI_DATA_SOURCE=mock.
import type { WebUIMockRoute } from "@webui/sdk/mock";

// Generate a stable desc-order event stream (eventId 1060..1001) so cursor
// pagination is exercisable with the default 50-per-page UI.
const operations = ["iam.accounts.list", "iam.sessions.revoke", "iam.accounts.update", "iam.roles.permissions.replace", "iam.accounts.archive", "iam.api-tokens.rotate", "iam.api-tokens.create", "organization.departments.update", "iam.roles.create", "iam.accounts.status"];
const actions = ["list", "revoke", "update", "grant", "archive", "rotate", "create", "update", "create", "update"];
const subjects = ["a1b2c3d4", "acct1hash", "acct3hash", "acct4hash", "acct6hash", "acct7hash"];
const outcomes = ["succeeded", "succeeded", "denied", "succeeded", "succeeded", "denied"];
const events = Array.from({ length: 60 }, (_, index) => {
  const eventId = 1060 - index;
  const operation = operations[index % operations.length] ?? "iam.accounts.list";
  const action = actions[index % actions.length] ?? "list";
  const subject = subjects[index % subjects.length] ?? "a1b2c3d4";
  const outcome = outcomes[index % outcomes.length] ?? "succeeded";
  const occurredAt = new Date(Date.UTC(2026, 0, 28, 9, 12) - index * 3_600_000).toISOString();
  return {
    eventId,
    operation,
    action,
    actorKind: "service",
    subjectHash: subject,
    resourceType: "account",
    resourceHash: `res-${subject}`,
    decision: outcome === "denied" ? "rbac_denied" : "allowed",
    outcome,
    correlationId: `request-${eventId}`,
    occurredAt,
  };
});

export const webuiMockRoutes: ReadonlyArray<WebUIMockRoute> = [
  { method: "GET", pattern: "/api/v1/auth/audit", handler: (request) => {
    // Simplified cursor semantics: cursor is an event id (desc order by eventId) with hasMore.
    const raw = new URLSearchParams(request.path.split("?")[1] ?? "");
    const limit = Number.parseInt(raw.get("limit") ?? "50", 10) || 50;
    const cursor = raw.get("cursor");
    const start = cursor ? events.findIndex((item) => String(item.eventId) === cursor) : -1;
    const from = start >= 0 ? start + 1 : 0;
    const page = events.slice(from, from + limit);
    const hasMore = from + page.length < events.length;
    const nextCursor = hasMore ? String(page[page.length - 1]?.eventId ?? "") : undefined;
    return { items: page, limit, total: events.length, nextCursor, hasMore };
  } },
  { method: "GET", pattern: "/api/v1/auth/audit/{eventId}", handler: (request) => events.find((item) => String(item.eventId) === request.path.split("/").at(-1)) ?? events[0] },
];

export default webuiMockRoutes;
