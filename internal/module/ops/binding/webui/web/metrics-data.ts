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
};

const metricNames = {
  requestCount: "app_http_requests_total",
  inFlightRequests: "app_http_in_flight_requests",
  exportedSpans: "app_telemetry_exported_spans_total",
  droppedSpans: "app_telemetry_dropped_spans_total",
  goroutines: "go_goroutines",
  residentMemoryBytes: "process_resident_memory_bytes",
  startTimeSeconds: "process_start_time_seconds",
} as const;

function readMetricValue(payload: string, metricName: string): number | undefined {
  const pattern = new RegExp(`^${metricName}(?:\\{[^\\n]*\\})?\\s+([^\\s]+)$`);
  let total = 0;
  let found = false;
  for (const line of payload.split(/\r?\n/)) {
    const match = line.trim().match(pattern);
    if (!match) continue;
    const value = Number(match[1]);
    if (!Number.isFinite(value)) continue;
    total += value;
    found = true;
  }
  return found ? total : undefined;
}

export function readMetricsSnapshot(value: unknown): MetricsSnapshot | undefined {
  if (typeof value !== "string") return undefined;
  return {
    requestCount: readMetricValue(value, metricNames.requestCount),
    inFlightRequests: readMetricValue(value, metricNames.inFlightRequests),
    exportedSpans: readMetricValue(value, metricNames.exportedSpans),
    droppedSpans: readMetricValue(value, metricNames.droppedSpans),
  };
}

// readRuntimeMetrics parses the process-level metrics (081).
export function readRuntimeMetrics(value: unknown): RuntimeMetrics | undefined {
  if (typeof value !== "string") return undefined;
  return {
    goroutines: readMetricValue(value, metricNames.goroutines),
    residentMemoryBytes: readMetricValue(value, metricNames.residentMemoryBytes),
    startTimeSeconds: readMetricValue(value, metricNames.startTimeSeconds),
  };
}
