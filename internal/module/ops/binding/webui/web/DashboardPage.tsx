import { useQueries, useQueryClient } from "@tanstack/react-query";
import { Button, CapabilityBanner, PageHeader, Skeleton, StatusPill, Surface } from "@webui/ui";
import { useWebUITranslation, type CapabilityState } from "@webui/contracts";
import { loadBuild, loadDiagnostics, loadLiveness, loadMetrics, loadReadiness, loadStartup } from "./api";

const operations = [
  { name: "build", titleMessageID: "webui.ops.dashboard.operation.build", query: loadBuild, required: true },
  { name: "startupz", titleMessageID: "webui.ops.dashboard.operation.startupz", query: loadStartup, required: true },
  { name: "livez", titleMessageID: "webui.ops.dashboard.operation.livez", query: loadLiveness, required: true },
  { name: "readyz", titleMessageID: "webui.ops.dashboard.operation.readyz", query: loadReadiness, required: true },
  { name: "diagnostics", titleMessageID: "webui.ops.dashboard.operation.diagnostics", query: loadDiagnostics, required: false },
  { name: "metrics", titleMessageID: "webui.ops.dashboard.operation.metrics", query: loadMetrics, required: false },
] as const;

export function operationCapabilityState(required: boolean, pending: boolean, failed: boolean): CapabilityState {
  if (pending) return "unavailable";
  if (!failed) return "available";
  return required ? "unavailable" : "degraded";
}

export default function DashboardPage() {
  const { t } = useWebUITranslation("webui.ops");
  const queryClient = useQueryClient();
  const queries = useQueries({ queries: operations.map((operation) => ({ queryKey: ["ops", operation.name], queryFn: operation.query })) });
  const failedCount = queries.filter((query) => query.isError).length;
  const healthyCount = queries.filter((query) => !query.isPending && !query.isError).length;
  const hasPending = queries.some((query) => query.isPending);
  const requiredFailedCount = operations.filter((operation, index) => operation.required && queries[index].isError).length;
  const optionalFailedCount = failedCount - requiredFailedCount;
  const overallState: CapabilityState = hasPending ? "unavailable" : requiredFailedCount > 0 ? "unavailable" : optionalFailedCount > 0 ? "degraded" : "available";
  const refreshing = queries.some((query) => query.isFetching);
  const summary = [
    { key: "total", value: String(operations.length), label: t("webui.ops.dashboard.summary.total") },
    { key: "healthy", value: hasPending ? t("webui.ops.dashboard.summary.pending") : String(healthyCount), label: t("webui.ops.dashboard.summary.healthy") },
    { key: "attention", value: hasPending ? t("webui.ops.dashboard.summary.pending") : String(failedCount), label: t("webui.ops.dashboard.summary.attention") },
  ] as const;

  const renderGroup = (required: boolean) => {
    const groupOperations = operations.filter((operation) => operation.required === required);
    return <section className="diagnostic-group"><header className="diagnostic-group-heading"><div><h2>{t(required ? "webui.ops.dashboard.group.core" : "webui.ops.dashboard.group.optional")}</h2><p>{t(required ? "webui.ops.dashboard.group.coreDetail" : "webui.ops.dashboard.group.optionalDetail")}</p></div></header><div className="ops-grid">{groupOperations.map((operation) => { const index = operations.indexOf(operation); const query = queries[index]; const state = operationCapabilityState(operation.required, query.isPending, query.isError); return <Surface className="diagnostic-card" key={operation.name}><div className="diagnostic-heading"><div className="diagnostic-title"><span className="diagnostic-icon" aria-hidden="true" /><h3>{t(operation.titleMessageID)}</h3></div><div className="diagnostic-actions"><StatusPill state={state}>{query.isPending ? t("webui.ops.dashboard.loading") : query.isError ? t(state === "unavailable" ? "webui.ops.dashboard.unavailable" : "webui.ops.dashboard.degraded") : t("webui.ops.dashboard.available")}</StatusPill>{query.isError && <Button variant="ghost" className="diagnostic-retry" onClick={() => void queryClient.invalidateQueries({ queryKey: ["ops", operation.name] })}>{t("webui.ops.dashboard.retry")}</Button>}</div></div>{query.isPending ? <Skeleton lines={4} label={t("webui.ops.dashboard.loading")} /> : query.isError ? <p className="form-error">{t("webui.ops.dashboard.requestFailed")}</p> : <pre>{typeof query.data === "string" ? query.data : JSON.stringify(query.data, null, 2)}</pre>}</Surface>; })}</div></section>;
  };

  return <div className="module-page"><PageHeader eyebrow={t("webui.ops.dashboard.eyebrow")} title={t("webui.ops.dashboard.title")} description={t("webui.ops.dashboard.description")} actions={<Button variant="secondary" onClick={() => void queryClient.invalidateQueries({ queryKey: ["ops"] })} disabled={refreshing} aria-busy={refreshing}><span className={refreshing ? "refresh-icon icon-spin" : "refresh-icon"} aria-hidden="true" />{t(refreshing ? "webui.ops.dashboard.refreshing" : "webui.ops.dashboard.refresh")}</Button>} /><div className="ops-summary">{summary.map(({ key, value, label }) => <Surface className={`summary-card summary-${key}`} key={key}><span className={`summary-icon summary-icon-${key}`} aria-hidden="true" /><span className="summary-copy"><strong>{value}</strong><small>{label}</small></span></Surface>)}</div><CapabilityBanner state={overallState} statusLabel={t(`webui.ops.dashboard.${overallState}`)} title={hasPending ? t("webui.ops.dashboard.loadingTitle") : requiredFailedCount > 0 ? t("webui.ops.dashboard.unavailableTitle", { count: requiredFailedCount }) : optionalFailedCount > 0 ? t("webui.ops.dashboard.degradedTitle", { count: optionalFailedCount }) : t("webui.ops.dashboard.availableTitle")} detail={hasPending ? t("webui.ops.dashboard.loadingDetail") : requiredFailedCount > 0 ? t("webui.ops.dashboard.unavailableDetail") : optionalFailedCount > 0 ? t("webui.ops.dashboard.degradedDetail") : t("webui.ops.dashboard.availableDetail")} />{renderGroup(true)}{renderGroup(false)}</div>;
}
