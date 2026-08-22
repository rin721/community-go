import { requestJSON } from "@webui/sdk/http";

export type AuditOutcome = "succeeded" | "denied" | "failed";
export type AuditDecision = "allowed" | "public" | "unauthenticated" | "missing_policy" | "missing_scope" | "rbac_denied" | "owner_mismatch";

export type AuditEventView = {
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

export type AuditFilter = { operation?: string; outcome?: AuditOutcome; actorKind?: string };

export const listAuditEvents = (filter: AuditFilter, offset: number, limit: number) => {
  const params = new URLSearchParams({ offset: String(offset), limit: String(limit) });
  if (filter.operation) params.set("operation", filter.operation);
  if (filter.outcome) params.set("outcome", filter.outcome);
  if (filter.actorKind) params.set("actorKind", filter.actorKind);
  return requestJSON<AuditListResult>(`/api/v1/auth/audit?${params.toString()}`);
};