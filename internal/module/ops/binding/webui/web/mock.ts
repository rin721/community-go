// Ops module browser-side mock data source: shapes match api.ts/dashboard-data.ts
// and are used only when the WebUI explicitly declares VITE_WEBUI_DATA_SOURCE=mock.
import type { WebUIMockRoute } from "@webui/sdk/mock";

const metricsPayload = [
  "app_http_requests_total 42",
  "app_http_in_flight_requests 1",
  "app_telemetry_exported_spans_total 128",
  "app_telemetry_dropped_spans_total 0",
].join("\n");

export const webuiMockRoutes: ReadonlyArray<WebUIMockRoute> = [
  { method: "GET", pattern: "/management/build", handler: () => ({ version: "mock-1.0.0", commit: "mock-commit", buildTime: "2026-01-01T00:00:00Z", goVersion: "go1.26.6", dirty: false }) },
  { method: "GET", pattern: "/management/startupz", handler: () => ({ status: "pass" }) },
  { method: "GET", pattern: "/management/livez", handler: () => ({ status: "pass" }) },
  { method: "GET", pattern: "/management/readyz", handler: () => ({ status: "pass" }) },
  { method: "GET", pattern: "/management/diagnostics", handler: () => ({
    started: true,
    live: true,
    ready: true,
    processState: "running",
    generationState: "active",
    generation: 1,
    phase: "ready",
    activeRequests: 0,
    activeConnections: 0,
    authReady: true,
    databaseReady: true,
    cleanupRequired: false,
    schedulerHealth: "pass",
    messagingHealth: "pass",
  }) },
  { method: "GET", pattern: "/management/metrics", handler: () => metricsPayload },
];

export default webuiMockRoutes;