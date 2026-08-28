import { requestJSON, requestText } from "@webui/sdk/http";

export type DiagnosticsValue = Record<string, unknown>;
export const loadBuild = () => requestJSON<DiagnosticsValue>("/management/build");
export const loadStartup = () => requestJSON<DiagnosticsValue>("/management/startupz");
export const loadLiveness = () => requestJSON<DiagnosticsValue>("/management/livez");
export const loadReadiness = () => requestJSON<DiagnosticsValue>("/management/readyz");
export const loadDiagnostics = () => requestJSON<DiagnosticsValue>("/management/diagnostics");
// 090 PAGE-090-006 / design §8: the product UI consumes the typed metrics
// projection (key/value/unit/asOf) instead of inferring semantics from raw
// Prometheus text; the raw text remains for monitoring systems.
export type MetricsSummary = { items: Array<{ key: string; value: number; unit: string }>; asOf: string };
export const loadMetricsSummary = () => requestJSON<MetricsSummary>("/management/metrics-summary");
export const loadMetrics = () => requestText("/management/metrics");
