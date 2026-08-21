import { useQueries } from "@tanstack/react-query";
import { CapabilityBanner, PageHeader, Skeleton, StatusPill, Surface } from "@webui/ui";
import { useWebUITranslation } from "@webui/contracts";
import { loadBuild, loadDiagnostics, loadLiveness, loadMetrics, loadReadiness, loadStartup } from "./api";

const operations = [
  { name: "build", titleMessageID: "webui.ops.dashboard.operation.build", query: loadBuild },
  { name: "startupz", titleMessageID: "webui.ops.dashboard.operation.startupz", query: loadStartup },
  { name: "livez", titleMessageID: "webui.ops.dashboard.operation.livez", query: loadLiveness },
  { name: "readyz", titleMessageID: "webui.ops.dashboard.operation.readyz", query: loadReadiness },
  { name: "diagnostics", titleMessageID: "webui.ops.dashboard.operation.diagnostics", query: loadDiagnostics },
  { name: "metrics", titleMessageID: "webui.ops.dashboard.operation.metrics", query: loadMetrics },
];

export default function DashboardPage() {
  const { t } = useWebUITranslation("webui.ops");
  const queries = useQueries({ queries: operations.map((operation) => ({ queryKey: ["ops", operation.name], queryFn: operation.query })) });
  const failedCount = queries.filter((query) => query.isError).length;
  const healthyCount = queries.filter((query) => !query.isPending && !query.isError).length;
  const hasPending = queries.some((query) => query.isPending);
  const overallState = hasPending ? "unavailable" : failedCount === 0 ? "available" : "degraded";
  const summary = [
    { key: "total", value: String(operations.length), label: t("webui.ops.dashboard.summary.total") },
    { key: "healthy", value: hasPending ? t("webui.ops.dashboard.summary.pending") : String(healthyCount), label: t("webui.ops.dashboard.summary.healthy") },
    { key: "attention", value: hasPending ? t("webui.ops.dashboard.summary.pending") : String(failedCount), label: t("webui.ops.dashboard.summary.attention") },
  ] as const;
  return <div className="module-page"><PageHeader eyebrow={t("webui.ops.dashboard.eyebrow")} title={t("webui.ops.dashboard.title")} description={t("webui.ops.dashboard.description")} /><div className="ops-summary">{summary.map(({ key, value, label }) => <Surface className={`summary-card summary-${key}`} key={key}><span className={`summary-icon summary-icon-${key}`} aria-hidden="true" /><span className="summary-copy"><strong>{value}</strong><small>{label}</small></span></Surface>)}</div><CapabilityBanner state={overallState} statusLabel={t(`webui.ops.dashboard.${overallState}`)} title={hasPending ? t("webui.ops.dashboard.loadingTitle") : failedCount === 0 ? t("webui.ops.dashboard.availableTitle") : t("webui.ops.dashboard.degradedTitle", { count: failedCount })} detail={hasPending ? t("webui.ops.dashboard.loadingDetail") : failedCount === 0 ? t("webui.ops.dashboard.availableDetail") : t("webui.ops.dashboard.degradedDetail")} /><div className="ops-grid">{queries.map((query, index) => <Surface className="diagnostic-card" key={operations[index].name}><div className="diagnostic-heading"><div className="diagnostic-title"><span className="diagnostic-icon" aria-hidden="true" /><h2>{t(operations[index].titleMessageID)}</h2></div><StatusPill state={query.isPending ? "unavailable" : query.isError ? "degraded" : "available"}>{query.isPending ? t("webui.ops.dashboard.loading") : query.isError ? t("webui.ops.dashboard.degraded") : t("webui.ops.dashboard.available")}</StatusPill></div>{query.isPending ? <Skeleton lines={4} label={t("webui.ops.dashboard.loading")} /> : query.isError ? <p className="form-error">{t("webui.ops.dashboard.requestFailed")}</p> : <pre>{typeof query.data === "string" ? query.data : JSON.stringify(query.data, null, 2)}</pre>}</Surface>)}</div></div>;
}
