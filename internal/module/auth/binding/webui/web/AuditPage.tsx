import { useCallback, useEffect, useMemo, useState } from "react";
import { Button, CodeText, CodeViewer, DataTable, DetailDrawer, EmptyState, ErrorState, FilterBar, formatDateTime, formatRelativeTime, PageFrame, PageHeader, PageSection, Pagination, ResourceIndex, StatusBadge } from "@webui/sdk/ui";
import { useListQueryParams, type ProblemError } from "@webui/sdk/query";
import { useWebUITranslation } from "@webui/sdk/i18n";
import { listAuditEvents, type AuditEventView, type AuditFilter, type AuditOutcome } from "./api";
import styles from "./auth.module.css";

// outcomeTone maps audit outcomes to platform status tones: succeeded ->
// available, denied/failed -> degraded/unavailable.
export const outcomeTone = (outcome: AuditEventView["outcome"]): "available" | "degraded" | "unavailable" =>
  outcome === "succeeded" ? "available" : outcome === "denied" ? "degraded" : "unavailable";

// 082 REQ-082-016: outcome cell render (no inline ternaries in JSX).
type Translate = (key: string, params?: Record<string, string | number>) => string;
export function outcomeCell(item: AuditEventView, t: Translate) {
  return (
    <StatusBadge
      status={item.outcome === "succeeded" ? "healthy" : item.outcome === "denied" ? "degraded" : "failed"}
    >
      {t(`webui.auth.audit.${item.outcome}`)}
    </StatusBadge>
  );
}

// 082 REQ-082-016: detail fields presented in the drawer (low-sensitivity only).
// Optional translation keeps JSON output stable while localizing drawer labels.
export function auditDetailFields(item: AuditEventView, t?: Translate): Array<{ label: string; value: string; mono?: boolean }> {
  const label = (key: string, fallback: string) => t?.(`webui.auth.audit.${key}`) || fallback;
  return [
    { label: label("id", "ID"), value: String(item.eventId), mono: true },
    { label: label("correlationId", "correlationId"), value: item.correlationId ?? "", mono: true },
    { label: label("occurredAt", "occurredAt"), value: formatDateTime(item.occurredAt), mono: true },
    { label: label("operation", "operation"), value: item.operation ?? "", mono: true },
    { label: label("action", "action"), value: item.action ?? "", mono: true },
    { label: label("actorKind", "actorKind"), value: item.actorKind ?? "", mono: true },
    { label: label("subjectHash", "subjectHash"), value: item.subjectHash ?? "", mono: true },
    { label: label("resourceType", "resourceType"), value: item.resourceType ?? "", mono: true },
    { label: label("resourceHash", "resourceHash"), value: item.resourceHash ?? "", mono: true },
    { label: label("decision", "decision"), value: item.decision, mono: true },
    { label: label("outcome", "outcome"), value: item.outcome, mono: true },
  ];
}

function toRFC3339(value: string): string {
  const timestamp = new Date(value).getTime();
  return Number.isNaN(timestamp) ? value : new Date(timestamp).toISOString();
}

export default function AuditPage() {
  const { t } = useWebUITranslation("webui.auth");
  const { t: hostT } = useWebUITranslation("webui.host");
  const PAGE_SIZE = 50;
  // Reuse the existing server-side since/until query capability; convert local
  // datetime input to RFC3339 only at the HTTP boundary.
  const listQuery = useListQueryParams<{ operation: string; action: string; outcome: string; actorKind: string; subjectHash: string; resourceType: string; correlationId: string; since: string; until: string }>({
    filters: {
      operation: { queryKey: "operation", defaultValue: "" },
      action: { queryKey: "action", defaultValue: "" },
      outcome: { queryKey: "outcome", defaultValue: "" },
      actorKind: { queryKey: "actorKind", defaultValue: "" },
      subjectHash: { queryKey: "subjectHash", defaultValue: "" },
      resourceType: { queryKey: "resourceType", defaultValue: "" },
      correlationId: { queryKey: "correlationId", defaultValue: "" },
      since: { queryKey: "since", defaultValue: "" },
      until: { queryKey: "until", defaultValue: "" },
    },
  });
  const [items, setItems] = useState<AuditEventView[]>([]);
  const [total, setTotal] = useState(0);
  const [selected, setSelected] = useState<AuditEventView | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<ProblemError | null>(null);
  const refresh = useCallback(() => {
    setLoading(true);
    setLoadError(null);
    const filter: AuditFilter = {};
    if (listQuery.filters.operation) filter.operation = listQuery.filters.operation;
    if (listQuery.filters.action) filter.action = listQuery.filters.action;
    if (listQuery.filters.outcome) filter.outcome = listQuery.filters.outcome as AuditOutcome;
    if (listQuery.filters.actorKind) filter.actorKind = listQuery.filters.actorKind;
    if (listQuery.filters.subjectHash) filter.subjectHash = listQuery.filters.subjectHash;
    if (listQuery.filters.resourceType) filter.resourceType = listQuery.filters.resourceType;
    if (listQuery.filters.correlationId) filter.correlationId = listQuery.filters.correlationId;
    if (listQuery.filters.since) filter.since = toRFC3339(listQuery.filters.since);
    if (listQuery.filters.until) filter.until = toRFC3339(listQuery.filters.until);
    const offset = (listQuery.page - 1) * PAGE_SIZE;
    return listAuditEvents(filter, offset, PAGE_SIZE).then((result) => { setItems(result.items); setTotal(result.total); }).catch((error) => { setItems([]); setTotal(0); setLoadError(error as ProblemError); }).finally(() => setLoading(false));
  }, [listQuery.filters.operation, listQuery.filters.action, listQuery.filters.outcome, listQuery.filters.actorKind, listQuery.filters.subjectHash, listQuery.filters.resourceType, listQuery.filters.correlationId, listQuery.filters.since, listQuery.filters.until, listQuery.page]);
  useEffect(() => { void refresh(); }, [refresh]);
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const selectedJSON = useMemo(() => selected ? JSON.stringify(auditDetailFields(selected), null, 2) : "", [selected]);
  return <PageFrame variant="index" className={styles.authModule}>
    <PageHeader eyebrow={t("webui.auth.audit.title")} title={t("webui.auth.audit.title")} description={t("webui.auth.audit.description")} />
    <div className="page-sections">
      <PageSection kicker={t("webui.auth.audit.list.kicker")} title={t("webui.auth.audit.list.title")}>
        <ResourceIndex toolbar={<FilterBar
          ariaLabel={t("webui.auth.audit.filter.kicker")}
          fields={[
            { key: "operation", label: t("webui.auth.audit.operation"), placeholder: t("webui.auth.audit.operationPh"), control: "input", value: listQuery.filters.operation, onValueChange: (next) => listQuery.setFilters({ ...listQuery.filters, operation: String(next) }) },
            { key: "action", label: t("webui.auth.audit.action"), placeholder: t("webui.auth.audit.actionPh"), control: "input", value: listQuery.filters.action, onValueChange: (next) => listQuery.setFilters({ ...listQuery.filters, action: String(next) }) },
            { key: "outcome", label: t("webui.auth.audit.outcome"), control: "select", options: [
              { value: "", label: t("webui.auth.audit.outcomeAll") },
              { value: "succeeded", label: t("webui.auth.audit.succeeded") },
              { value: "denied", label: t("webui.auth.audit.denied") },
              { value: "failed", label: t("webui.auth.audit.failed") },
            ], value: listQuery.filters.outcome, onValueChange: (next) => listQuery.setFilters({ ...listQuery.filters, outcome: String(next) }) },
            { key: "actorKind", label: t("webui.auth.audit.actorKind"), placeholder: t("webui.auth.audit.actorKind"), control: "input", value: listQuery.filters.actorKind, onValueChange: (next) => listQuery.setFilters({ ...listQuery.filters, actorKind: String(next) }) },
            { key: "subjectHash", label: t("webui.auth.audit.subjectHash"), placeholder: t("webui.auth.audit.subjectHash"), control: "input", value: listQuery.filters.subjectHash, onValueChange: (next) => listQuery.setFilters({ ...listQuery.filters, subjectHash: String(next) }) },
            { key: "resourceType", label: t("webui.auth.audit.resourceType"), placeholder: t("webui.auth.audit.resourcePh"), control: "input", value: listQuery.filters.resourceType, onValueChange: (next) => listQuery.setFilters({ ...listQuery.filters, resourceType: String(next) }) },
            { key: "correlationId", label: t("webui.auth.audit.correlationId"), placeholder: t("webui.auth.audit.correlationPh"), control: "input", value: listQuery.filters.correlationId, onValueChange: (next) => listQuery.setFilters({ ...listQuery.filters, correlationId: String(next) }) },
            { key: "since", label: `${t("webui.auth.audit.occurredAt")} ≥`, inputType: "datetime-local", control: "input", value: listQuery.filters.since, onValueChange: (next) => listQuery.setFilters({ ...listQuery.filters, since: String(next) }) },
            { key: "until", label: `${t("webui.auth.audit.occurredAt")} ≤`, inputType: "datetime-local", control: "input", value: listQuery.filters.until, onValueChange: (next) => listQuery.setFilters({ ...listQuery.filters, until: String(next) }) },
          ]}
          onClear={() => listQuery.clearFilters()}
          clearLabel={t("webui.auth.audit.clear")}
          resultCount={total}
          resultCountLabel={(count) => t("webui.auth.audit.total", { total: count })}
        />}>
          {loadError && <ErrorState kind="connectivity" title={hostT("webui.host.route.error.title")} detail={hostT("webui.host.route.error.detail")} requestId={loadError.requestId} action={<Button variant="secondary" onClick={() => void refresh()}>{hostT("webui.host.retry")}</Button>} />}
          <DataTable<AuditEventView>
          columns={[
            { id: "eventId", header: "ID", className: "audit-event-id-col", cell: (item) => <CodeText value={String(item.eventId)} /> },
            { id: "occurredAt", header: t("webui.auth.audit.occurredAt"), cell: (item) => <span title={formatDateTime(item.occurredAt)}>{formatRelativeTime(item.occurredAt, hostT)}</span> },
            { id: "operation", header: t("webui.auth.audit.operation"), className: "audit-operation-col", cell: (item) => <CodeText value={item.operation ?? ""} /> },
            { id: "action", header: t("webui.auth.audit.action"), cell: (item) => <CodeText value={item.action ?? ""} /> },
            { id: "resource", header: t("webui.auth.audit.resourceType"), cell: (item) => item.resourceType ?? "" },
            { id: "correlationId", header: t("webui.auth.audit.correlationId"), cell: (item) => <CodeText value={item.correlationId ?? ""} /> },
            { id: "subject", header: t("webui.auth.audit.subjectHash"), cell: (item) => <CodeText value={item.subjectHash ?? ""} /> },
            { id: "outcome", header: t("webui.auth.audit.outcome"), cell: (item) => outcomeCell(item, t) },
          ]}
          rows={items}
          ariaLabel={t("webui.auth.audit.list.title")}
          getRowKey={(item) => String(item.eventId)}
          loading={loading}
          loadingLabel={t("webui.host.page.loading.label")}
          emptyState={loadError ? null : <EmptyState title={t("webui.auth.audit.empty")} />}
          enhancements={{
            density: "compact",
            stickyHeader: true,
            rowMenuHeader: t("webui.auth.audit.actions"),
            renderRowMenu: (item, _index) => [{ key: "detail", label: t("webui.auth.audit.detail"), onSelect: () => setSelected(item) }],
          }}
          />
          <Pagination
          page={listQuery.page}
          pageCount={pages}
          total={total}
          totalLabel={(count) => t("webui.auth.audit.total", { total: count })}
          pageLabel={(current) => `Page ${current}`}
          previousLabel={t("webui.auth.audit.previous")}
          nextLabel={t("webui.auth.audit.next")}
          paginationLabel={t("webui.auth.audit.pagination")}
          pageSize={PAGE_SIZE}
          pageSizeOptions={[20, 50, 100]}
          pageSizeLabel={t("webui.auth.audit.pageSize")}
          onPageChange={listQuery.setPage}
            onPageSizeChange={(size) => listQuery.setPageSize(size)}
          />
        </ResourceIndex>
      </PageSection>
    </div>
    <DetailDrawer
      open={Boolean(selected)}
      onClose={() => setSelected(null)}
      title={t("webui.auth.audit.detailTitle")}
      status={selected ? outcomeCell(selected, t) : undefined}
      width={640}
    >
      {selected && (
        <div className="audit-detail">
          {auditDetailFields(selected, t).map((field) => (
            <div className="detail-field" key={field.label}>
              <span className="detail-field-label">{field.label}</span>
              {field.mono ? <CodeText value={field.value} copyable /> : <span className="detail-field-value">{field.value}</span>}
            </div>
          ))}
          {selected.correlationId && (
            <Button
              variant="secondary"
              onClick={() => {
                listQuery.setFilters({ ...listQuery.filters, correlationId: selected.correlationId ?? "" });
                setSelected(null);
              }}
            >
              {t("webui.auth.audit.related")}
            </Button>
          )}
          <CodeViewer value={selectedJSON} language="json" />
        </div>
      )}
    </DetailDrawer>
  </PageFrame>;
}
