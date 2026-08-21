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
  return <div className="module-page"><PageHeader eyebrow={t("webui.ops.dashboard.eyebrow")} title={t("webui.ops.dashboard.title")} description={t("webui.ops.dashboard.description")} /><CapabilityBanner state={failedCount === 0 ? "available" : "degraded"} statusLabel={failedCount === 0 ? t("webui.ops.dashboard.available") : t("webui.ops.dashboard.degraded")} title={failedCount === 0 ? t("webui.ops.dashboard.availableTitle") : t("webui.ops.dashboard.degradedTitle", { count: failedCount })} detail={failedCount === 0 ? t("webui.ops.dashboard.availableDetail") : t("webui.ops.dashboard.degradedDetail")} /><div className="ops-grid">{queries.map((query, index) => <Surface className="diagnostic-card" key={operations[index].name}><div className="diagnostic-heading"><h2>{t(operations[index].titleMessageID)}</h2><StatusPill state={query.isPending ? "unavailable" : query.isError ? "degraded" : "available"}>{query.isPending ? t("webui.ops.dashboard.loading") : query.isError ? t("webui.ops.dashboard.degraded") : t("webui.ops.dashboard.available")}</StatusPill></div>{query.isPending ? <Skeleton lines={4} label={t("webui.ops.dashboard.loading")} /> : query.isError ? <p className="form-error">{t("webui.ops.dashboard.requestFailed")}</p> : <pre>{typeof query.data === "string" ? query.data : JSON.stringify(query.data, null, 2)}</pre>}</Surface>)}</div></div>;
}
