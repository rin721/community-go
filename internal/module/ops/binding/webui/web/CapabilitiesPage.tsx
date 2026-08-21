import { useMemo, useState } from "react";
import { useGatedQueries, useQueryClient } from "@webui/sdk/query";
import { Button, CapabilityBanner, DataTable, DataToolbar, Drawer, EmptyState, Field, FilterPanel, PageHeader, Pagination, StatusPill, Toast } from "@webui/sdk/ui";
import { useWebUITranslation } from "@webui/sdk/i18n";
import type { CapabilityState } from "@webui/sdk/runtime";
import { filterOperationNames, operationCapabilityState, opsOperations, refreshNoticeTone, type OpsOperation } from "./operations";
import styles from "./ops.module.css";

type CapabilityFilter = "all" | "core" | "optional";
type CapabilityRow = { operation: OpsOperation; state: CapabilityState; result: string; value: unknown; pending: boolean; failed: boolean };

function resultPreview(value: unknown): string {
  const serialized = typeof value === "string" ? value : JSON.stringify(value);
  return serialized.length > 96 ? `${serialized.slice(0, 96)}…` : serialized;
}

export default function CapabilitiesPage() {
  const { t } = useWebUITranslation("webui.ops");
  const queryClient = useQueryClient();
  const queries = useGatedQueries({ queries: opsOperations.map((operation) => ({ capability: operation.name, queryKey: ["ops", operation.name], queryFn: operation.query })) });
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [scope, setScope] = useState<CapabilityFilter>("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);
  const [refreshNotice, setRefreshNotice] = useState<"success" | "danger">();
  const [refreshing, setRefreshing] = useState(false);
  const [selectedOperation, setSelectedOperation] = useState<string>();
  const filteredOperations = useMemo(() => opsOperations.filter((operation) => filterOperationNames(operation, search, scope, t(operation.titleMessageID))), [scope, search, t]);
  const rows: CapabilityRow[] = filteredOperations.map((operation) => {
    const query = queries[opsOperations.indexOf(operation)];
    const state = operationCapabilityState(operation.required, query.isPending, query.isError);
    return { operation, state, value: query.data, pending: query.isPending, failed: query.isError, result: query.isPending ? t("webui.ops.capabilities.loading") : query.isError ? t("webui.ops.capabilities.failed") : resultPreview(query.data) };
  });
  const pageCount = Math.max(1, Math.ceil(rows.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const visibleRows = rows.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const failedCount = rows.filter((row) => row.failed).length;
  const pendingCount = rows.filter((row) => row.pending).length;
  const overallState: CapabilityState = pendingCount > 0 ? "unavailable" : failedCount === 0 ? "available" : rows.some((row) => row.operation.required && row.failed) ? "unavailable" : "degraded";

  const refresh = async (queryKey: ReadonlyArray<string>) => {
    setRefreshing(true);
    try {
      await queryClient.invalidateQueries({ queryKey });
      const currentFailureCount = opsOperations.filter((operation) => queryClient.getQueryState(["ops", operation.name])?.status === "error").length;
      setRefreshNotice(refreshNoticeTone(currentFailureCount));
    } finally {
      setRefreshing(false);
    }
  };

  const columns = [
    { id: "operation", header: t("webui.ops.capabilities.columns.operation"), cell: (row: CapabilityRow) => <strong>{t(row.operation.titleMessageID)}</strong> },
    { id: "scope", header: t("webui.ops.capabilities.columns.scope"), cell: (row: CapabilityRow) => t(row.operation.required ? "webui.ops.capabilities.scope.core" : "webui.ops.capabilities.scope.optional") },
    { id: "state", header: t("webui.ops.capabilities.columns.state"), cell: (row: CapabilityRow) => <StatusPill state={row.state}>{t(`webui.ops.dashboard.${row.state}`)}</StatusPill> },
    { id: "result", header: t("webui.ops.capabilities.columns.result"), cell: (row: CapabilityRow) => <code className="capability-preview">{row.result}</code> },
    { id: "actions", header: t("webui.ops.capabilities.columns.actions"), cell: (row: CapabilityRow) => <div className="capability-row-actions"><Button variant="ghost" onClick={() => setSelectedOperation(row.operation.name)}>{t("webui.ops.capabilities.detail.view")}</Button>{row.failed && <Button variant="ghost" className="diagnostic-retry" onClick={() => void refresh(["ops", row.operation.name])}>{t("webui.ops.dashboard.retry")}</Button>}</div> },
  ] as const;

  const refreshMessageKey = refreshNotice === "danger" ? "failed" : "success";
  const selectedRow = selectedOperation ? rows.find((row) => row.operation.name === selectedOperation) : undefined;
  const selectedResult = selectedRow?.value === undefined ? selectedRow?.result : typeof selectedRow.value === "string" ? selectedRow.value : JSON.stringify(selectedRow.value, null, 2);
  return <div className={`${styles.opsModule} module-page`}><PageHeader eyebrow={t("webui.ops.capabilities.eyebrow")} title={t("webui.ops.capabilities.title")} description={t("webui.ops.capabilities.description")} actions={<Button variant="secondary" onClick={() => void refresh(["ops"])} disabled={refreshing} aria-busy={refreshing}>{t(refreshing ? "webui.ops.dashboard.refreshing" : "webui.ops.dashboard.refresh")}</Button>} /><DataToolbar ariaLabel={t("webui.ops.capabilities.toolbar")} actions={<Button variant="ghost" onClick={() => { setSearch(""); setScope("all"); setPage(1); }}>{t("webui.ops.capabilities.reset")}</Button>} /><FilterPanel label={t("webui.ops.capabilities.filters")} open={filtersOpen} onToggle={() => setFiltersOpen((open) => !open)} expandLabel={t("webui.ops.capabilities.filter.expand")} collapseLabel={t("webui.ops.capabilities.filter.collapse")}><Field label={t("webui.ops.capabilities.filter.search")} value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} placeholder={t("webui.ops.capabilities.filter.searchPlaceholder")} /><label className="form-field"><span>{t("webui.ops.capabilities.filter.scope")}</span><select className="field-input" value={scope} onChange={(event) => { setScope(event.target.value as CapabilityFilter); setPage(1); }}><option value="all">{t("webui.ops.capabilities.filter.all")}</option><option value="core">{t("webui.ops.capabilities.filter.core")}</option><option value="optional">{t("webui.ops.capabilities.filter.optional")}</option></select></label></FilterPanel><CapabilityBanner state={overallState} statusLabel={t(`webui.ops.dashboard.${overallState}`)} title={t("webui.ops.capabilities.banner.title", { count: rows.length })} detail={t("webui.ops.capabilities.banner.detail", { failed: failedCount, pending: pendingCount })} /><DataTable columns={columns} rows={visibleRows} ariaLabel={t("webui.ops.capabilities.table")} getRowKey={(row) => row.operation.name} loading={pendingCount > 0} loadingLabel={t("webui.ops.capabilities.loading")} emptyState={<EmptyState title={t("webui.ops.capabilities.empty")} detail={t("webui.ops.capabilities.emptyDetail")} />} /><Pagination page={currentPage} pageCount={pageCount} total={rows.length} totalLabel={(total) => t("webui.ops.capabilities.total", { count: total })} pageLabel={(value) => t("webui.ops.capabilities.page", { page: value })} paginationLabel={t("webui.ops.capabilities.pagination")} previousLabel={t("webui.ops.capabilities.previous")} nextLabel={t("webui.ops.capabilities.next")} onPageChange={setPage} pageSize={pageSize} pageSizeOptions={[5, 10]} pageSizeLabel={t("webui.ops.capabilities.pageSize")} onPageSizeChange={(value) => { setPageSize(value); setPage(1); }} /><Toast open={Boolean(refreshNotice)} tone={refreshNotice ?? "success"} title={t(`webui.ops.capabilities.refresh.${refreshMessageKey}.title`)} detail={t(`webui.ops.capabilities.refresh.${refreshMessageKey}.detail`)} closeLabel={t(`webui.ops.capabilities.refresh.${refreshMessageKey}.close`)} onClose={() => setRefreshNotice(undefined)} /><Drawer open={Boolean(selectedRow)} title={t("webui.ops.capabilities.detail.title")} description={t("webui.ops.capabilities.detail.description")} closeLabel={t("webui.ops.capabilities.detail.close")} onClose={() => setSelectedOperation(undefined)} footer={<Button variant="secondary" onClick={() => setSelectedOperation(undefined)}>{t("webui.ops.capabilities.detail.close")}</Button>}>{selectedRow && <dl className="detail-list"><dt>{t("webui.ops.capabilities.columns.operation")}</dt><dd>{t(selectedRow.operation.titleMessageID)}</dd><dt>{t("webui.ops.capabilities.columns.scope")}</dt><dd>{t(selectedRow.operation.required ? "webui.ops.capabilities.scope.core" : "webui.ops.capabilities.scope.optional")}</dd><dt>{t("webui.ops.capabilities.columns.state")}</dt><dd><StatusPill state={selectedRow.state}>{t(`webui.ops.dashboard.${selectedRow.state}`)}</StatusPill></dd><dt>{t("webui.ops.capabilities.detail.result")}</dt><dd><pre className="capability-detail-result">{selectedResult}</pre></dd></dl>}</Drawer></div>;
}
