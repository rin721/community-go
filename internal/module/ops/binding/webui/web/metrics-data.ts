// 090 PAGE-090-006 / design §8: the product UI consumes the typed metrics
// projection (/management/metrics-summary returns key/value/unit/asOf) instead
// of inferring semantics from raw Prometheus text. Prometheus text remains for
// monitoring systems and professional debugging.
export type MetricsSnapshot = {
  requestCount?: number;
  inFlightRequests?: number;
  exportedSpans?: number;
  droppedSpans?: number;
};

export type RuntimeMetrics = {
  goroutines?: number;
  residentMemoryBytes?: number;
  startTimeSeconds?: number;
  cpuSecondsTotal?: number;
};

export type MetricsSummaryItem = { key: string; value: number; unit: string };
export type MetricsSummary = { items: MetricsSummaryItem[]; asOf: string };

// summaryKeys are the stable metric keys the WebUI consumes (aligned with the
// backend typed projection key contract).
const summaryKeys = {
  requestCount: "app_http_requests_total",
  inFlightRequests: "app_http_in_flight_requests",
  exportedSpans: "app_telemetry_exported_spans_total",
  droppedSpans: "app_telemetry_dropped_spans_total",
  goroutines: "go_goroutines",
  residentMemoryBytes: "process_resident_memory_bytes",
  cpuSecondsTotal: "process_cpu_seconds_total",
} as const;

function summaryValue(items: MetricsSummaryItem[], key: string): number | undefined {
  for (const item of items) {
    if (item.key === key && Number.isFinite(item.value)) return item.value;
  }
  return undefined;
}

// readMetricsSummary parses the stable metric snapshot from the typed
// projection; invalid shapes return undefined.
export function readMetricsSummary(value: unknown): MetricsSummary | undefined {
  if (!value || typeof value !== "object") return undefined;
  const candidate = value as Partial<MetricsSummary>;
  if (!Array.isArray(candidate.items) || typeof candidate.asOf !== "string") return undefined;
  const items = candidate.items.filter((item) => item && typeof item.key === "string" && typeof item.value === "number");
  return { items, asOf: candidate.asOf };
}

export function readMetricsSnapshot(value: unknown): MetricsSnapshot | undefined {
  const summary = readMetricsSummary(value);
  if (!summary) return undefined;
  return {
    requestCount: summaryValue(summary.items, summaryKeys.requestCount),
    inFlightRequests: summaryValue(summary.items, summaryKeys.inFlightRequests),
    exportedSpans: summaryValue(summary.items, summaryKeys.exportedSpans),
    droppedSpans: summaryValue(summary.items, summaryKeys.droppedSpans),
  };
}

// readRuntimeMetrics parses process metrics from the typed projection (090: the
// legacy Prometheus-text parsing is removed; everything goes through the typed
// contract).
export function readRuntimeMetrics(value: unknown): RuntimeMetrics | undefined {
  const summary = readMetricsSummary(value);
  if (!summary) return undefined;
  return {
    goroutines: summaryValue(summary.items, summaryKeys.goroutines),
    residentMemoryBytes: summaryValue(summary.items, summaryKeys.residentMemoryBytes),
    cpuSecondsTotal: summaryValue(summary.items, summaryKeys.cpuSecondsTotal),
  };
}
