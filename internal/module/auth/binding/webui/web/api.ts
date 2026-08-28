import { requestJSON } from "@webui/sdk/http";

export type AuditOutcome = "succeeded" | "denied" | "failed";
export type AuditDecision = "allowed" | "public" | "unauthenticated" | "missing_policy" | "missing_scope" | "rbac_denied" | "owner_mismatch";

export type AuditEventView = {
  eventId: number;
  correlationId?: string;
  operation?: string;
  action?: string;
  actorKind?: string;
  subjectHash?: string;
  resourceType?: string;
  resourceHash?: string;
  decision: AuditDecision;
  outcome: AuditOutcome;
  occurredAt: string;
};

export type AuditListResult = { items: AuditEventView[]; limit: number; total: number; nextCursor?: string; hasMore: boolean };

export type AuditFilter = { correlationId?: string; operation?: string; action?: string; outcome?: AuditOutcome; actorKind?: string; subjectHash?: string; resourceType?: string; since?: string; until?: string };

export const listAuditEvents = (filter: AuditFilter, cursor: string | undefined, limit: number) => {
  const params = new URLSearchParams({ limit: String(limit) });
  if (cursor) params.set("cursor", cursor);
  if (filter.correlationId) params.set("correlationId", filter.correlationId);
  if (filter.operation) params.set("operation", filter.operation);
  if (filter.action) params.set("action", filter.action);
  if (filter.outcome) params.set("outcome", filter.outcome);
  if (filter.actorKind) params.set("actorKind", filter.actorKind);
  if (filter.subjectHash) params.set("subjectHash", filter.subjectHash);
  if (filter.resourceType) params.set("resourceType", filter.resourceType);
  if (filter.since) params.set("since", filter.since);
  if (filter.until) params.set("until", filter.until);
  return requestJSON<AuditListResult>(`/api/v1/auth/audit?${params.toString()}`);
};

export const auditEvent = (eventId: number) => requestJSON<AuditEventView>(`/api/v1/auth/audit/${eventId}`);
