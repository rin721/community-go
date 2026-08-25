import { useEffect, useState } from "react";
import { AxisLineChart, CapabilityBanner, PageSection, Sparkline, StatusPill } from "@webui/sdk/ui";
import { useWebUITranslation } from "@webui/sdk/i18n";
import type { CapabilityState } from "@webui/sdk/runtime";
import { loadDiagnostics, loadMetrics } from "./api";
import { readRuntimeSnapshot, type RuntimeSnapshot, type UnitView } from "./dashboard-data";
import { readMetricsSnapshot, readRuntimeMetrics } from "./metrics-data";
import { appendMonitoringPoint, seriesValues, type MonitoringPoint } from "./monitoring-data";

const monitoringPollIntervalMs = 5000;

function formatBytes(bytes: number | undefined, missing: string): string {
  if (bytes === undefined || !Number.isFinite(bytes)) return missing;
  if (bytes >= 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GiB`;
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MiB`;
  return `${(bytes / 1024).toFixed(1)} KiB`;
}

function formatClock(millis: number): string {
  return new Date(millis).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

function unitState(value: string): CapabilityState {
  if (value === "running" || value === "ready" || value === "pending") return "available";
  if (value === "failed" || value === "forced") return "unavailable";
  return "degraded";
}

// ServerMetricCard follows the 1Panel-style dashboard card: big value, optional
// usage bar, and a live trend sparkline (081 R081-003).
function ServerMetricCard({ title, value, unit, percent, trend, trendLabel, state, detail }: { title: string; value: string; unit?: string; percent?: number; trend: number[]; trendLabel: string; state: CapabilityState; detail?: string }) {
  return <div className={`ops-metric-card ops-metric-${state}`}>
    <div className="ops-metric-heading"><h4>{title}</h4><StatusPill state={state}>{state === "available" ? "Operational" : state === "degraded" ? "Degraded" : "Unavailable"}</StatusPill></div>
    <div className="ops-metric-value"><strong>{value}</strong>{unit && <span className="ops-metric-unit">{unit}</span>}</div>
    {percent !== undefined && <div className="ops-metric-bar" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(percent)}><span className="ops-metric-bar-fill" style={{ width: `${Math.min(100, Math.max(0, percent))}%` }} /></div>}
    <Sparkline values={trend} ariaLabel={trendLabel} width={140} height={36} stroke={state === "available" ? "var(--chart-1, #60a5fa)" : "var(--chart-4, #f59e0b)"} />
    {detail && <p className="page-meta">{detail}</p>}
  </div>;
}

// MonitoringSection renders the 1Panel-style server dashboard (081, R081-003):
// health banner, big metric cards (CPU/memory/disk/network), component status
// rows and an axis time-series chart fed by a client-side rolling window.
export function MonitoringSection() {
  const { t } = useWebUITranslation("webui.ops");
  const [points, setPoints] = useState<MonitoringPoint[]>([]);
  const [runtime, setRuntime] = useState<RuntimeSnapshot>();
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
          if (!metricsSnapshot && !runtimeSnapshot && !runtimeMetrics) return;
          const point: MonitoringPoint = {
            at: Date.now(),
            requestTotal: metricsSnapshot?.requestCount,
            inFlight: metricsSnapshot?.inFlightRequests,
            goroutines: runtimeMetrics?.goroutines ?? runtimeSnapshot?.process?.numGoroutine,
            residentMemoryBytes: runtimeMetrics?.residentMemoryBytes ?? runtimeSnapshot?.process?.allocBytes,
            memAllocBytes: runtimeSnapshot?.process?.allocBytes,
            memSysBytes: runtimeSnapshot?.process?.sysBytes,
            cpuSecondsTotal: runtimeMetrics?.cpuSecondsTotal,
          };
          setPoints((current) => appendMonitoringPoint(current, point));
          setRuntime(runtimeSnapshot ?? undefined);
        })
        .catch(() => undefined);
    };
    sample();
    const timer = setInterval(sample, monitoringPollIntervalMs);
    return () => { cancelled = true; clearInterval(timer); };
  }, []);

  const process = runtime?.process;
  const units = runtime?.units ?? [];

  // Derived series for the dashboard.
  const cpuSeries = seriesValues(points, "cpuPercent");
  const memSeries = seriesValues(points, "memAllocBytes");
  const requestsSeries = seriesValues(points, "requestsPerSecond");
  const latest = points.length > 0 ? points[points.length - 1] : undefined;
  const cpuPercent = latest?.cpuPercent;
  const memAllocBytes = latest?.memAllocBytes ?? process?.allocBytes;
  const memSysBytes = latest?.memSysBytes ?? process?.sysBytes;
  const memPercent = memAllocBytes !== undefined && memSysBytes ? Math.min(100, (memAllocBytes / Math.max(memSysBytes, 1)) * 100) : undefined;
  const timeLabels = points.map((point) => formatClock(point.at));

  const degradedCount = units.filter((unit) => unitState(unit.state) === "degraded").length;
  const failedCount = units.filter((unit) => unitState(unit.state) === "unavailable").length;
  const processed = units.length > 0;
  const bannerState: CapabilityState = !processed ? "unavailable" : failedCount > 0 ? "unavailable" : degradedCount > 0 ? "degraded" : "available";

  return <PageSection title={t("webui.ops.dashboard.monitoring.title")} description={t("webui.ops.dashboard.monitoring.detail")}>
    <CapabilityBanner
      state={bannerState}
      statusLabel={failedCount > 0 ? t("webui.ops.dashboard.monitoring.banner.unavailable") : degradedCount > 0 ? t("webui.ops.dashboard.monitoring.banner.degraded") : t("webui.ops.dashboard.monitoring.banner.available")}
      title={failedCount > 0 ? t("webui.ops.dashboard.monitoring.banner.unavailableTitle", { count: failedCount }) : degradedCount > 0 ? t("webui.ops.dashboard.monitoring.banner.degradedTitle", { count: degradedCount }) : t("webui.ops.dashboard.monitoring.banner.availableTitle")}
      detail={latest ? t("webui.ops.dashboard.monitoring.sampled", { seconds: Math.max(0, Math.round((Date.now() - latest.at) / 1000)) }) : t("webui.ops.dashboard.monitoring.waiting")}
    />

    <div className="ops-metric-grid">
      <ServerMetricCard title={t("webui.ops.dashboard.monitoring.cpu")} value={cpuPercent === undefined ? missing : cpuPercent.toFixed(1)} unit="%" percent={cpuPercent} trend={cpuSeries} trendLabel={t("webui.ops.dashboard.monitoring.cpuTrend")} state={cpuPercent === undefined ? "unavailable" : cpuPercent > 85 ? "unavailable" : cpuPercent > 65 ? "degraded" : "available"} detail={t("webui.ops.dashboard.monitoring.cpuDetail")} />
      <ServerMetricCard title={t("webui.ops.dashboard.monitoring.memory")} value={formatBytes(memAllocBytes, missing)} percent={memPercent} trend={memSeries} trendLabel={t("webui.ops.dashboard.monitoring.memoryTrend")} state={memPercent === undefined ? "unavailable" : memPercent > 90 ? "unavailable" : memPercent > 75 ? "degraded" : "available"} detail={t("webui.ops.dashboard.monitoring.memoryDetail")} />
      <ServerMetricCard title={t("webui.ops.dashboard.monitoring.disk")} value={t("webui.ops.dashboard.monitoring.notConnected")} trend={[]} trendLabel={t("webui.ops.dashboard.monitoring.diskTrend")} state="unavailable" detail={t("webui.ops.dashboard.monitoring.diskDetail")} />
      <ServerMetricCard title={t("webui.ops.dashboard.monitoring.network")} value={t("webui.ops.dashboard.monitoring.notConnected")} trend={[]} trendLabel={t("webui.ops.dashboard.monitoring.networkTrend")} state="unavailable" detail={t("webui.ops.dashboard.monitoring.networkDetail")} />
    </div>

    <div className="ops-monitoring-lower">
      <div className="ops-overview-card">
        <div className="ops-overview-heading"><div><span className="ops-overview-kicker">{t("webui.ops.dashboard.monitoring.trends.eyebrow")}</span><h3>{t("webui.ops.dashboard.monitoring.trends.title")}</h3></div></div>
        {points.length === 0 ? <p className="form-error">{t("webui.ops.dashboard.monitoring.trends.empty")}</p> : <AxisLineChart ariaLabel={t("webui.ops.dashboard.monitoring.trends.aria")} timeLabels={timeLabels} series={[
          { label: t("webui.ops.dashboard.monitoring.trends.cpu"), values: cpuSeries, stroke: "var(--chart-1, #60a5fa)" },
          { label: t("webui.ops.dashboard.monitoring.trends.requests"), values: requestsSeries, stroke: "var(--chart-4, #f59e0b)" },
        ]} />}
      </div>

      <div className="ops-overview-card">
        <div className="ops-overview-heading"><div><span className="ops-overview-kicker">{t("webui.ops.dashboard.monitoring.components.eyebrow")}</span><h3>{t("webui.ops.dashboard.monitoring.components.title")}</h3></div><StatusPill state={bannerState}>{failedCount > 0 ? "Unavailable" : degradedCount > 0 ? "Degraded" : "Operational"}</StatusPill></div>
        {units.length === 0 ? <p className="form-error">{t("webui.ops.dashboard.monitoring.components.empty")}</p> : <div className="ops-health-list">{units.map((unit: UnitView) => (
          <div className={`ops-health-row${unitState(unit.state) === "available" ? "" : " ops-health-row-attention"}`} key={`${unit.kind}-${unit.owner}`}>
            <span className="ops-component-name">{unit.owner}</span>
            <StatusPill state={unitState(unit.state)}>{unitState(unit.state) === "available" ? "Operational" : unitState(unit.state) === "degraded" ? "Degraded" : "Unavailable"}</StatusPill>
          </div>
        ))}</div>}
      </div>
    </div>
  </PageSection>;
}