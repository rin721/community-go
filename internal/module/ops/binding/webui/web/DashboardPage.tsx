import { useEffect, useRef, useState } from "react";
import { useGatedQueries, useQueryClient } from "@webui/sdk/query";
import { Button, CapabilityBanner, PageFrame, PageHeader, PageSection, RevealList, Skeleton, StatCard, StatGrid, StatusPill, Surface, Toast } from "@webui/sdk/ui";
import { useWebUITranslation } from "@webui/sdk/i18n";
import type { CapabilityState } from "@webui/sdk/runtime";
import { booleanCapabilityState, healthCapabilityState, readBuildSnapshot, readRuntimeSnapshot, type RuntimeSnapshot } from "./dashboard-data";
import { readMetricsSnapshot, type MetricsSnapshot } from "./metrics-data";
import { opsOperations, operationCapabilityState, refreshNoticeTone } from "./operations";
import { MonitoringSection } from "./monitoring-section";
import { resolveManagementSource, type ManagementSource } from "./environment";
import styles from "./ops.module.css";

export { operationCapabilityState, refreshNoticeTone } from "./operations";

const operations = opsOperations;

// 082 REQ-082-017: render uptime seconds as a readable "Xd Xh Xm" label.
export function formatUptime(seconds: number, t: (key: string, params?: Record<string, number>) => string): string {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (days > 0) return t("webui.ops.dashboard.uptime.dh", { days, hours });
  if (hours > 0) return t("webui.ops.dashboard.uptime.hm", { hours, minutes });
  return t("webui.ops.dashboard.uptime.m", { minutes });
}

function valueOrFallback(value: string | number | undefined, fallback: string): string {
  return value === undefined ? fallback : String(value);
}

function statusLabel(t: (key: string) => string, state: CapabilityState): string {
  return t(`webui.ops.dashboard.${state}`);
}

function HealthRow({ label, state, detail }: { label: string; state: CapabilityState; detail: string }) {
  // 084: healthy rows use a dot + muted label grouped as one status unit
  // instead of a repeated pill; non-healthy states keep the full pill.
  if (state === "available") return <div className="ops-health-row"><span>{label}</span><span className="ops-health-ok-wrap"><span className="ops-health-ok" aria-hidden="true" /><span className="ops-health-ok-label">{detail}</span></span></div>;
  return <div className="ops-health-row"><span>{label}</span><StatusPill state={state}>{detail}</StatusPill></div>;
}

function RuntimeSnapshotCard({ runtime, state, t }: { runtime?: RuntimeSnapshot; state: CapabilityState; t: (key: string) => string }) {
  const missing = t("webui.ops.dashboard.snapshot.missing");
  return <Surface className="ops-overview-card ops-runtime-card"><div className="ops-overview-heading"><div><span className="ops-overview-kicker">{t("webui.ops.dashboard.snapshot.eyebrow")}</span><h3>{t("webui.ops.dashboard.snapshot.title")}</h3></div><StatusPill state={state}>{statusLabel(t, state)}</StatusPill></div><div className="ops-runtime-grid"><div><small>{t("webui.ops.dashboard.snapshot.process")}</small><strong>{valueOrFallback(runtime?.processState, missing)}</strong></div><div><small>{t("webui.ops.dashboard.snapshot.generation")}</small><strong>{valueOrFallback(runtime?.generation, missing)}</strong></div><div><small>{t("webui.ops.dashboard.snapshot.requests")}</small><strong>{valueOrFallback(runtime?.activeRequests, missing)}</strong></div><div><small>{t("webui.ops.dashboard.snapshot.connections")}</small><strong>{valueOrFallback(runtime?.activeConnections, missing)}</strong></div></div><p className="ops-overview-detail">{runtime?.phase ? `${t("webui.ops.dashboard.snapshot.phase")}: ${runtime.phase}` : t("webui.ops.dashboard.snapshot.detail")}</p></Surface>;
}

function BuildSummaryCard({ build, state, t }: { build: ReturnType<typeof readBuildSnapshot>; state: CapabilityState; t: (key: string) => string }) {
  const missing = t("webui.ops.dashboard.snapshot.missing");
  return <Surface className="ops-overview-card"><div className="ops-overview-heading"><div><span className="ops-overview-kicker">{t("webui.ops.dashboard.build.eyebrow")}</span><h3>{t("webui.ops.dashboard.build.title")}</h3></div><StatusPill state={state}>{statusLabel(t, state)}</StatusPill></div><dl className="ops-build-list"><div><dt>{t("webui.ops.dashboard.build.version")}</dt><dd>{valueOrFallback(build?.version, missing)}</dd></div><div><dt>{t("webui.ops.dashboard.build.commit")}</dt><dd>{valueOrFallback(build?.commit, missing)}</dd></div><div><dt>{t("webui.ops.dashboard.build.goVersion")}</dt><dd>{valueOrFallback(build?.goVersion, missing)}</dd></div><div><dt>{t("webui.ops.dashboard.build.dirty")}</dt><dd>{build?.dirty === undefined ? missing : build.dirty ? t("webui.ops.dashboard.build.dirtyYes") : t("webui.ops.dashboard.build.dirtyNo")}</dd></div></dl></Surface>;
}

function HealthSummaryCard({ runtime, state, t }: { runtime?: RuntimeSnapshot; state: CapabilityState; t: (key: string) => string }) {
  const healthState = (value: string | undefined) => healthCapabilityState(value);
  return <Surface className="ops-overview-card"><div className="ops-overview-heading"><div><span className="ops-overview-kicker">{t("webui.ops.dashboard.health.eyebrow")}</span><h3>{t("webui.ops.dashboard.health.title")}</h3></div><StatusPill state={state}>{statusLabel(t, state)}</StatusPill></div><div className="ops-health-list"><HealthRow label={t("webui.ops.dashboard.health.auth")} state={booleanCapabilityState(runtime?.authReady)} detail={statusLabel(t, booleanCapabilityState(runtime?.authReady))} /><HealthRow label={t("webui.ops.dashboard.health.database")} state={booleanCapabilityState(runtime?.databaseReady)} detail={statusLabel(t, booleanCapabilityState(runtime?.databaseReady))} /><HealthRow label={t("webui.ops.dashboard.health.scheduler")} state={healthState(runtime?.schedulerHealth)} detail={statusLabel(t, healthState(runtime?.schedulerHealth))} /><HealthRow label={t("webui.ops.dashboard.health.messaging")} state={healthState(runtime?.messagingHealth)} detail={statusLabel(t, healthState(runtime?.messagingHealth))} /></div></Surface>;
}

function metricValue(value: number | undefined, missing: string): string {
  return value === undefined ? missing : value.toLocaleString();
}

function MetricsSummaryCard({ metrics, state, t }: { metrics?: MetricsSnapshot; state: CapabilityState; t: (key: string) => string }) {
  const missing = t("webui.ops.dashboard.metrics.missing");
  const values = [
    ["requests", metrics?.requestCount],
    ["inFlight", metrics?.inFlightRequests],
    ["exported", metrics?.exportedSpans],
    ["dropped", metrics?.droppedSpans],
  ] as const;
  return <Surface className="ops-metrics-card"><div className="ops-overview-heading"><div><span className="ops-overview-kicker">{t("webui.ops.dashboard.metrics.eyebrow")}</span><h3>{t("webui.ops.dashboard.metrics.title")}</h3></div><StatusPill state={state}>{statusLabel(t, state)}</StatusPill></div><p className="ops-overview-detail">{t("webui.ops.dashboard.metrics.detail")}</p><div className="ops-metric-grid">{values.map(([key, value]) => <div className={`ops-metric-tile ops-metric-${key}`} key={key}><strong>{metricValue(value, missing)}</strong><span>{t(`webui.ops.dashboard.metrics.${key}`)}</span></div>)}</div></Surface>;
}

type DiagnosticEntry = { key: string; value: string };

export function projectDiagnosticEntries(value: unknown, limit = 8): DiagnosticEntry[] {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return [];
  return Object.entries(value as Record<string, unknown>)
    .filter(([, entry]) => ["string", "number", "boolean"].includes(typeof entry))
    .slice(0, limit)
    .map(([key, entry]) => ({ key, value: String(entry) }));
}

function DiagnosticSummary({ value, t }: { value: unknown; t: (key: string) => string }) {
  const entries = projectDiagnosticEntries(value);
  if (entries.length === 0) return <p className="diagnostic-empty">{t("webui.ops.dashboard.snapshot.missing")}</p>;
  return <dl className="diagnostic-facts">{entries.map((entry) => <div key={entry.key}><dt>{entry.key}</dt><dd>{entry.value}</dd></div>)}</dl>;
}

export default function DashboardPage() {
  const { t } = useWebUITranslation("webui.ops");
  const queryClient = useQueryClient();
  const queries = useGatedQueries({ queries: [...operations.map((operation) => ({ capability: operation.name, queryKey: ["ops", operation.name], queryFn: operation.query })), { capability: "management-source", queryKey: ["ops", "source"], queryFn: resolveManagementSource }] });
  const sourceState = queries[queries.length - 1]?.data as ManagementSource | undefined;
  const sourceUnreachable = sourceState === "unreachable";
  const opsQueries = queries.slice(0, operations.length);
  const failedCount = opsQueries.filter((query) => query.isError).length;
  const healthyCount = opsQueries.filter((query) => !query.isPending && !query.isError).length;
  const hasPending = opsQueries.some((query) => query.isPending);
  const requiredFailedCount = operations.filter((operation, index) => operation.required && queries[index].isError).length;
  const optionalFailedCount = failedCount - requiredFailedCount;
  const overallState: CapabilityState = hasPending ? "unavailable" : requiredFailedCount > 0 ? "unavailable" : optionalFailedCount > 0 ? "degraded" : "available";
  const refreshing = queries.some((query) => query.isFetching);
  const refreshRequestedRef = useRef(false);
  const previousRefreshingRef = useRef(false);
  const [refreshNotice, setRefreshNotice] = useState<"success" | "danger">();
  useEffect(() => {
    if (refreshRequestedRef.current && previousRefreshingRef.current && !refreshing) {
      setRefreshNotice(refreshNoticeTone(failedCount));
      refreshRequestedRef.current = false;
    }
    previousRefreshingRef.current = refreshing;
  }, [failedCount, refreshing]);

  const requestRefresh = (queryKey: ReadonlyArray<string>) => {
    refreshRequestedRef.current = true;
    void queryClient.invalidateQueries({ queryKey });
  };
  const summary = [
    { key: "total", value: String(operations.length), label: t("webui.ops.dashboard.summary.total") },
    { key: "healthy", value: hasPending ? t("webui.ops.dashboard.summary.pending") : String(healthyCount), label: t("webui.ops.dashboard.summary.healthy") },
    { key: "attention", value: hasPending ? t("webui.ops.dashboard.summary.pending") : String(failedCount), label: t("webui.ops.dashboard.summary.attention") },
  ] as const;
  const buildIndex = operations.findIndex((operation) => operation.name === "build");
  const diagnosticsIndex = operations.findIndex((operation) => operation.name === "diagnostics");
  const metricsIndex = operations.findIndex((operation) => operation.name === "metrics");
  const buildQuery = queries[buildIndex];
  const diagnosticsQuery = queries[diagnosticsIndex];
  const metricsQuery = queries[metricsIndex];
  const build = readBuildSnapshot(buildQuery?.data);
  const runtime = readRuntimeSnapshot(diagnosticsQuery?.data);
  const metrics = readMetricsSnapshot(metricsQuery?.data);
  const buildState = operationCapabilityState(true, Boolean(buildQuery?.isPending), Boolean(buildQuery?.isError));
  const diagnosticsState = operationCapabilityState(false, Boolean(diagnosticsQuery?.isPending), Boolean(diagnosticsQuery?.isError));
  const metricsState = operationCapabilityState(false, Boolean(metricsQuery?.isPending), Boolean(metricsQuery?.isError));

  const renderOverview = () => <PageSection title={t("webui.ops.dashboard.overview.title")} description={t("webui.ops.dashboard.overview.detail")}><MetricsSummaryCard metrics={metrics} state={metricsState} t={t} /><div className="ops-overview-grid"><BuildSummaryCard build={build} state={buildState} t={t} /><RuntimeSnapshotCard runtime={runtime} state={diagnosticsState} t={t} /><HealthSummaryCard runtime={runtime} state={diagnosticsState} t={t} /></div></PageSection>;

  const renderGroup = (required: boolean) => {
    const groupOperations = operations.filter((operation) => operation.required === required);
    return <PageSection title={t(required ? "webui.ops.dashboard.group.core" : "webui.ops.dashboard.group.optional")} description={t(required ? "webui.ops.dashboard.group.coreDetail" : "webui.ops.dashboard.group.optionalDetail")}><RevealList className="ops-grid">{groupOperations.map((operation) => { const index = operations.indexOf(operation); const query = queries[index]; const state = operationCapabilityState(operation.required, query.isPending, query.isError); return <Surface className="diagnostic-card" key={operation.name}><div className="diagnostic-heading"><div className="diagnostic-title"><span className="diagnostic-icon" aria-hidden="true" /><h3>{t(operation.titleMessageID)}</h3></div><div className="diagnostic-actions"><StatusPill state={state}>{query.isPending ? t("webui.ops.dashboard.loading") : query.isError ? t(state === "unavailable" ? "webui.ops.dashboard.unavailable" : "webui.ops.dashboard.degraded") : t("webui.ops.dashboard.available")}</StatusPill>{query.isError && <Button variant="ghost" className="diagnostic-retry" onClick={() => requestRefresh(["ops", operation.name])}>{t("webui.ops.dashboard.retry")}</Button>}</div></div>{query.isPending ? <Skeleton lines={4} label={t("webui.ops.dashboard.loading")} /> : query.isError ? <p className="form-error">{t("webui.ops.dashboard.requestFailed")}</p> : <DiagnosticSummary value={query.data} t={t} />}</Surface>; })}</RevealList></PageSection>;
  };

  return <PageFrame variant="dashboard" className={styles.opsModule}>
    <PageHeader eyebrow={t("webui.ops.dashboard.eyebrow")} title={t("webui.ops.dashboard.title")} description={t("webui.ops.dashboard.description")} actions={<Button variant="secondary" onClick={() => requestRefresh(["ops"])} disabled={refreshing} aria-busy={refreshing}><span className={refreshing ? "refresh-icon icon-spin" : "refresh-icon"} aria-hidden="true" />{t(refreshing ? "webui.ops.dashboard.refreshing" : "webui.ops.dashboard.refresh")}</Button>} />
    {/* 082 REQ-082-017: top context row (Version/Commit/Uptime/source); all data real, missing fields shown as dash */}
    <div className="ops-context-row" aria-label={t("webui.ops.dashboard.context")}>
      <span className="ops-context-item"><span className="ops-context-label">{t("webui.ops.dashboard.context.version")}</span><code className="ops-context-value">{build?.version ?? "—"}</code></span>
      <span className="ops-context-item"><span className="ops-context-label">{t("webui.ops.dashboard.context.commit")}</span><code className="ops-context-value">{build?.commit?.slice(0, 8) ?? "—"}</code></span>
      <span className="ops-context-item"><span className="ops-context-label">{t("webui.ops.dashboard.context.uptime")}</span><span className="ops-context-value">{runtime?.process?.uptimeSeconds !== undefined ? formatUptime(runtime.process.uptimeSeconds, t) : "—"}</span></span>
      <span className="ops-context-item"><span className="ops-context-label">{t("webui.ops.dashboard.context.source")}</span><span className="ops-context-value">{t(sourceUnreachable ? "webui.ops.dashboard.context.unreachable" : "webui.ops.dashboard.context.hosted")}</span></span>
    </div>
    <StatGrid columns={3}>
      <StatCard value={summary[0].value} label={summary[0].label} />
      <StatCard value={summary[1].value} label={summary[1].label} tone="positive" />
      <StatCard value={summary[2].value} label={summary[2].label} tone="attention" />
    </StatGrid>
    <div className="page-sections">
      <CapabilityBanner state={sourceUnreachable ? "unavailable" : overallState} statusLabel={t(`webui.ops.dashboard.${sourceUnreachable ? "unavailable" : overallState}`)} title={sourceUnreachable ? t("webui.ops.dashboard.source.unreachable.title") : hasPending ? t("webui.ops.dashboard.loadingTitle") : requiredFailedCount > 0 ? t("webui.ops.dashboard.unavailableTitle", { count: requiredFailedCount }) : optionalFailedCount > 0 ? t("webui.ops.dashboard.degradedTitle", { count: optionalFailedCount }) : t("webui.ops.dashboard.availableTitle")} detail={sourceUnreachable ? t("webui.ops.dashboard.source.unreachable.detail") : hasPending ? t("webui.ops.dashboard.loadingDetail") : requiredFailedCount > 0 ? t("webui.ops.dashboard.unavailableDetail") : optionalFailedCount > 0 ? t("webui.ops.dashboard.degradedDetail") : t("webui.ops.dashboard.availableDetail")} />
      {renderOverview()}
      {overallState === "available" && <MonitoringSection />}
      {renderGroup(true)}
      {renderGroup(false)}
    </div>
    <Toast open={Boolean(refreshNotice)} tone={refreshNotice ?? "success"} title={t(`webui.ops.dashboard.refresh.${refreshNotice ?? "success"}.title`)} detail={t(`webui.ops.dashboard.refresh.${refreshNotice ?? "success"}.detail`)} closeLabel={t(`webui.ops.dashboard.refresh.${refreshNotice ?? "success"}.close`)} onClose={() => setRefreshNotice(undefined)} />
  </PageFrame>;
}
