import { requestJSON, requestText } from "@webui/contracts";

export type DiagnosticsValue = Record<string, unknown>;
export const loadBuild = () => requestJSON<DiagnosticsValue>("/management/build");
export const loadStartup = () => requestJSON<DiagnosticsValue>("/management/startupz");
export const loadLiveness = () => requestJSON<DiagnosticsValue>("/management/livez");
export const loadReadiness = () => requestJSON<DiagnosticsValue>("/management/readyz");
export const loadDiagnostics = () => requestJSON<DiagnosticsValue>("/management/diagnostics");
export const loadMetrics = () => requestText("/management/metrics");
