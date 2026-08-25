// Ops module browser-side mock data source: shapes match api.ts/dashboard-data.ts
// and are used only when the WebUI explicitly declares VITE_WEBUI_DATA_SOURCE=mock.
import type { WebUIMockRoute } from "@webui/sdk/mock";

const metricsPayload = [
  "app_http_requests_total 42",
  "app_http_in_flight_requests 1",
  "app_telemetry_exported_spans_total 128",
  "app_telemetry_dropped_spans_total 0",
  "go_goroutines 7",
  "process_resident_memory_bytes 26214400",
  "process_start_time_seconds 1787366400",
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
    process: { allocBytes: 2097152, sysBytes: 4194304, heapAllocBytes: 2097152, numGoroutine: 7, numGC: 3, uptimeSeconds: 86400 },
    units: [
      { owner: "http", kind: "participant", state: "running", phase: "run", attempt: 1 },
      { owner: "management", kind: "participant", state: "running", phase: "run", attempt: 1 },
      { owner: "scheduler", kind: "participant", state: "ready", phase: "ready", attempt: 1 },
      { owner: "messaging", kind: "participant", state: "ready", phase: "ready", attempt: 1 },
      { owner: "migration-runner", kind: "task", state: "stopped", phase: "stop", attempt: 1 },
    ],
    scheduler: { enabled: true, ready: true, generation: 1, tasks: [{ id: "example-job", state: "leader", runs: 12, skipped: 0, active: 0, queued: 0 }] },
    messaging: { enabled: true, providers: [{ name: "broker", driver: "rabbitmq", state: "ready", ready: true, inFlight: 0, confirmed: 40, failed: 0, recoveries: 0 }], consumers: [{ id: "consumer-1", route: "events", active: true, inFlight: 1, redelivered: 0, acknowledged: 39, rejected: 0, deadLettered: 0 }] },
  }) },
  { method: "GET", pattern: "/management/metrics", handler: () => metricsPayload },
];

export default webuiMockRoutes;