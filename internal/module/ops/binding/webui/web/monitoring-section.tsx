import { useEffect, useState } from "react";
import { LineChart, PageSection, Sparkline, StatusPill, Surface } from "@webui/sdk/ui";
import { useWebUITranslation } from "@webui/sdk/i18n";
import type { CapabilityState } from "@webui/sdk/runtime";
import { loadDiagnostics, loadMetrics } from "./api";
import { readRuntimeSnapshot, readSchedulerRuns, type RuntimeSnapshot } from "./dashboard-data";
import { readMetricsSnapshot, readRuntimeMetrics, type RuntimeMetrics } from "./metrics-data";
import { appendMonitoringPoint, seriesValues, type MonitoringPoint } from "./monitoring-data";

const monitoringPollIntervalMs = 5000;

function formatBytes(value: number | undefined, missing: string): string {
  if (value === undefined) return missing;
  if (value >= 1024 * 1024 * 1024) return `${(value / (1024 * 1024 * 1024)).toFixed(1)} GiB`;
  if (value >= 1024 * 1024) return `${(value / (1024 * 1024)).toFixed(1)} MiB`;
  return `${(value / 1024).toFixed(1)} KiB`;
}

function formatUptime(value: number | undefined, missing: string): string {
  if (value === undefined || !Number.isFinite(value)) return missing;
  const seconds = Math.max(0, Math.floor(value));
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return days > 0 ? `${days}d ${hours}h ${minutes}m` : hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
}

function unitState(state: string): CapabilityState {
  if (state === "running" || state === "ready" || state === "pending") return "available";
  if (state === "failed" || state === "forced") return "unavailable";
  return "degraded";
}

function MetricTile({ label, value }: { label: string; value: string }) {
  return <div className="ops-metric-tile"><strong>{value}</strong><span>{label}</span></div>;
}



export function MonitoringSection() {
  const { t } = useWebUITranslation("webui.ops");
  const [points, setPoints] = useState<MonitoringPoint[]>([]);
  const [runtime, setRuntime] = useState<RuntimeSnapshot>();
  const [metrics, setMetrics] = useState<RuntimeMetrics>();
  const missing = t("webui.ops.dashboard.monitoring.missing");

  useEffect(() => {
    let cancelled = false;
    const sample = () => {
      Promise.all([loadMetrics().catch(() => undefined), loadDiagnostics().catch(() => undefined)])
        .then(([metricsPayload, diagnosticsPayload]) => {
          if (cancelled) return;
          const metricsSnapshot = readMetricsSnapshot(metricsPayload);
          const runtimeSnapshot = readRuntimeSnapshot(diagnosticsPayload);
          const runtimeMetrics = readRuntimeMetrics(metricsPayload);
          if (metricsSnapshot || runtimeSnapshot || runtimeMetrics) {
            const point: MonitoringPoint = {
              at: Date.now(),
              requestTotal: metricsSnapshot?.requestCount,
              inFlight: metricsSnapshot?.inFlightRequests,
              goroutines: runtimeMetrics?.goroutines ?? runtimeSnapshot?.process?.numGoroutine,
              residentMemoryBytes: runtimeMetrics?.residentMemoryBytes ?? runtimeSnapshot?.process?.allocBytes,
              memAllocBytes: runtimeSnapshot?.process?.allocBytes,
              schedulerRuns: readSchedulerRuns(diagnosticsPayload),
            };
            setPoints((current) => appendMonitoringPoint(current, point));
            setRuntime(runtimeSnapshot ?? undefined);
            setMetrics(runtimeMetrics ?? undefined);
          }
        })
        .catch(() => undefined);
    };
    sample();
    const timer = setInterval(sample, monitoringPollIntervalMs);
    return () => { cancelled = true; clearInterval(timer); };
  }, []);

  const process = runtime?.process;
  const units = runtime?.units ?? [];
  const goroutinesSeries = seriesValues(points, "goroutines");
  const memorySeries = seriesValues(points, "memAllocBytes");
  const requestsSeries = seriesValues(points, "requestsPerSecond");
  const inFlightSeries = seriesValues(points, "inFlight");

  return <PageSection title={t("webui.ops.dashboard.monitoring.title")} description={t("webui.ops.dashboard.monitoring.detail")}>
    <div className="ops-monitoring-grid">
      <Surface className="ops-overview-card">
        <div className="ops-overview-heading"><div><span className="ops-overview-kicker">{t("webui.ops.dashboard.monitoring.process.eyebrow")}</span><h3>{t("webui.ops.dashboard.monitoring.process.title")}</h3></div></div>
        <div className="ops-metric-grid">
          <MetricTile label={t("webui.ops.dashboard.monitoring.process.alloc")} value={formatBytes(process?.allocBytes ?? metrics?.residentMemoryBytes, missing)} />
          <MetricTile label={t("webui.ops.dashboard.monitoring.process.goroutines")} value={process?.numGoroutine?.toLocaleString() ?? missing} />
          <MetricTile label={t("webui.ops.dashboard.monitoring.process.gc")} value={process?.numGC?.toLocaleString() ?? missing} />
          <MetricTile label={t("webui.ops.dashboard.monitoring.process.uptime")} value={formatUptime(process?.uptimeSeconds, missing)} />
        </div>
        <p className="ops-overview-detail">{t("webui.ops.dashboard.monitoring.process.detail")}</p>
        <div className="ops-chart-row"><Sparkline values={memorySeries} ariaLabel={t("webui.ops.dashboard.monitoring.blurb.memory")} stroke="var(--chart-2, #22d3ee)" /><Sparkline values={goroutinesSeries} ariaLabel={t("webui.ops.dashboard.monitoring.blurb.goroutines")} stroke="var(--chart-3, #a78bfa)" /></div>
      </Surface>

      <Surface className="ops-overview-card">
        <div className="ops-overview-heading"><div><span className="ops-overview-kicker">{t("webui.ops.dashboard.monitoring.components.eyebrow")}</span><h3>{t("webui.ops.dashboard.monitoring.components.title")}</h3></div></div>
        {units.length === 0 ? <p className="form-error">{t("webui.ops.dashboard.monitoring.components.empty")}</p> : <div className="ops-health-list">{units.map((unit) => <div className="ops-health-row" key={`${unit.kind}-${unit.owner}`}><span>{unit.owner}</span><StatusPill state={unitState(unit.state)}>{unit.state}</StatusPill></div>)}</div>}
        <p className="ops-overview-detail">{t("webui.ops.dashboard.monitoring.components.detail")}</p>
      </Surface>

      <Surface className="ops-overview-card">
        <div className="ops-overview-heading"><div><span className="ops-overview-kicker">{t("webui.ops.dashboard.monitoring.trends.eyebrow")}</span><h3>{t("webui.ops.dashboard.monitoring.trends.title")}</h3></div></div>
        {points.length === 0 ? <p className="form-error">{t("webui.ops.dashboard.monitoring.trends.empty")}</p> : <>
          <LineChart ariaLabel={t("webui.ops.dashboard.monitoring.trends.requests")} series={[{ label: t("webui.ops.dashboard.monitoring.trends.requestsPerSecond"), values: requestsSeries, stroke: "var(--chart-1, #60a5fa)" }, { label: t("webui.ops.dashboard.monitoring.trends.inFlight"), values: inFlightSeries, stroke: "var(--chart-4, #f59e0b)" }]} />
          <LineChart ariaLabel={t("webui.ops.dashboard.monitoring.trends.memory")} series={[{ label: t("webui.ops.dashboard.monitoring.trends.allocBytes"), values: memorySeries, stroke: "var(--chart-2, #22d3ee)" }, { label: t("webui.ops.dashboard.monitoring.trends.goroutines"), values: goroutinesSeries, stroke: "var(--chart-3, #a78bfa)" }]} />
        </>}
      </Surface>
    </div>
  </PageSection>;
}