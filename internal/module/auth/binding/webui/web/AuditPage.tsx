import { useCallback, useEffect, useMemo, useState } from "react";
import { Button, CodeText, CodeViewer, DataTable, DetailDrawer, EmptyState, ErrorState, FilterBar, formatDateTime, formatRelativeTime, PageHeader, PageSection, Pagination, StatusBadge } from "@webui/sdk/ui";
import { useListQueryParams } from "@webui/sdk/query";
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
export function auditDetailFields(item: AuditEventView): Array<{ label: string; value: string; mono?: boolean }> {
  return [
    { label: "occurredAt", value: formatDateTime(item.occurredAt), mono: true },
    { label: "operation", value: item.operation ?? "", mono: true },
    { label: "action", value: item.action ?? "", mono: true },
    { label: "actorKind", value: item.actorKind ?? "", mono: true },
    { label: "subjectHash", value: item.subjectHash ?? "", mono: true },
    { label: "resourceType", value: item.resourceType ?? "", mono: true },
    { label: "resourceHash", value: item.resourceHash ?? "", mono: true },
    { label: "decision", value: item.decision, mono: true },
    { label: "outcome", value: item.outcome, mono: true },
  ];
}

export default function AuditPage() {
  const { t } = useWebUITranslation("webui.auth");
  const { t: hostT } = useWebUITranslation("webui.host");
  const PAGE_SIZE = 50;
  // 082 REQ-082-002/016: filters URL-ized (operation/action/outcome/resourceType).
  const listQuery = useListQueryParams<{ operation: string; action: string; outcome: string; resourceType: string }>({
    filters: {
      operation: { queryKey: "operation", defaultValue: "" },
      action: { queryKey: "action", defaultValue: "" },
      outcome: { queryKey: "outcome", defaultValue: "" },
      resourceType: { queryKey: "resourceType", defaultValue: "" },
    },
  });
  const [items, setItems] = useState<AuditEventView[]>([]);
  const [total, setTotal] = useState(0);
  const [selected, setSelected] = useState<AuditEventView | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const refresh = useCallback(() => {
    setLoading(true);
    setLoadError(false);
    const filter: AuditFilter = {};
    if (listQuery.filters.operation) filter.operation = listQuery.filters.operation;
    if (listQuery.filters.action) filter.action = listQuery.filters.action;
    if (listQuery.filters.outcome) filter.outcome = listQuery.filters.outcome as AuditOutcome;
    if (listQuery.filters.resourceType) filter.resourceType = listQuery.filters.resourceType;
    const offset = (listQuery.page - 1) * PAGE_SIZE;
    return listAuditEvents(filter, offset, PAGE_SIZE).then((result) => { setItems(result.items); setTotal(result.total); }).catch(() => { setItems([]); setTotal(0); setLoadError(true); }).finally(() => setLoading(false));
  }, [listQuery.filters.operation, listQuery.filters.action, listQuery.filters.outcome, listQuery.filters.resourceType, listQuery.page]);
  useEffect(() => { void refresh(); }, [refresh]);
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const selectedJSON = useMemo(() => selected ? JSON.stringify(auditDetailFields(selected), null, 2) : "", [selected]);
  return <div className={`${styles.authModule} module-page`}>
    <PageHeader eyebrow={t("webui.auth.audit.title")} title={t("webui.auth.audit.title")} description={t("webui.auth.audit.description")} />
    <div className="page-sections">
      <PageSection kicker={t("webui.auth.audit.filter.kicker")} title={t("webui.auth.audit.filter.title")}>
        <FilterBar
          ariaLabel={t("webui.auth.audit.filter.kicker")}
          fields={[
            { key: "operation", label: t("webui.auth.audit.operation"), control: "input", value: listQuery.filters.operation, onValueChange: (next) => listQuery.setFilters({ ...listQuery.filters, operation: String(next) }) },
            { key: "action", label: t("webui.auth.audit.action"), control: "input", value: listQuery.filters.action, onValueChange: (next) => listQuery.setFilters({ ...listQuery.filters, action: String(next) }) },
            { key: "outcome", label: t("webui.auth.audit.outcome"), control: "select", options: [
              { value: "", label: t("webui.auth.audit.outcomeAll") },
              { value: "succeeded", label: t("webui.auth.audit.succeeded") },
              { value: "denied", label: t("webui.auth.audit.denied") },
              { value: "failed", label: t("webui.auth.audit.failed") },
            ], value: listQuery.filters.outcome, onValueChange: (next) => listQuery.setFilters({ ...listQuery.filters, outcome: String(next) }) },
            { key: "resourceType", label: t("webui.auth.audit.resourceType"), control: "input", value: listQuery.filters.resourceType, onValueChange: (next) => listQuery.setFilters({ ...listQuery.filters, resourceType: String(next) }) },
          ]}
          onClear={() => listQuery.clearFilters()}
          clearLabel={t("webui.auth.audit.clear")}
          resultCount={total}
          resultCountLabel={(count) => t("webui.auth.audit.total", { total: count })}
        />
      </PageSection>
      <PageSection kicker={t("webui.auth.audit.list.kicker")} title={t("webui.auth.audit.list.title")}>
        {loadError && <ErrorState kind="connectivity" title={hostT("webui.host.route.error.title")} detail={hostT("webui.host.route.error.detail")} action={<Button variant="secondary" onClick={() => void refresh()}>{hostT("webui.host.retry")}</Button>} />}
        <DataTable<AuditEventView>
          columns={[
            { id: "occurredAt", header: t("webui.auth.audit.occurredAt"), cell: (item) => <span title={formatDateTime(item.occurredAt)}>{formatRelativeTime(item.occurredAt, t)}</span> },
            { id: "operation", header: t("webui.auth.audit.operation"), cell: (item) => <CodeText value={item.operation ?? ""} /> },
            { id: "action", header: t("webui.auth.audit.action"), cell: (item) => <CodeText value={item.action ?? ""} /> },
            { id: "resource", header: t("webui.auth.audit.resourceType"), cell: (item) => item.resourceType ?? "" },
            { id: "subject", header: t("webui.auth.audit.subjectHash"), cell: (item) => <CodeText value={item.subjectHash ?? ""} /> },
            { id: "outcome", header: t("webui.auth.audit.outcome"), cell: (item) => outcomeCell(item, t) },
          ]}
          rows={items}
          ariaLabel={t("webui.auth.audit.list.title")}
          getRowKey={(item, index) => `${item.occurredAt}-${index}`}
          loading={loading}
          loadingLabel={t("webui.host.page.loading.label")}
          emptyState={loadError ? null : <EmptyState title={t("webui.auth.audit.empty")} />}
          enhancements={{
            density: "compact",
            stickyHeader: true,
            columnVisibility: { persistedKey: "auth-audit" },
            renderRowMenu: (item, _index) => [{ key: "detail", label: t("webui.auth.audit.detail"), onSelect: () => setSelected(item) }],
            columnMenuLabel: t("webui.auth.audit.columns"),
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
          {auditDetailFields(selected).map((field) => (
            <div className="detail-field" key={field.label}>
              <span className="detail-field-label">{field.label}</span>
              {field.mono ? <CodeText value={field.value} copyable /> : <span className="detail-field-value">{field.value}</span>}
            </div>
          ))}
          <CodeViewer value={selectedJSON} language="json" />
        </div>
      )}
    </DetailDrawer>
  </div>;
}
