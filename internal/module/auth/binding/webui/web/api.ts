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

export type AuditListResult = { items: AuditEventView[]; offset: number; limit: number; total: number };

export type AuditFilter = { correlationId?: string; operation?: string; action?: string; outcome?: AuditOutcome; actorKind?: string; subjectHash?: string; resourceType?: string; since?: string; until?: string };

export const listAuditEvents = (filter: AuditFilter, offset: number, limit: number) => {
  const params = new URLSearchParams({ offset: String(offset), limit: String(limit) });
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
