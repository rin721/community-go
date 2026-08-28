import { describe, expect, it } from "vitest";
import { readMetricsSnapshot, readRuntimeMetrics } from "./metrics-data";

// 090 PAGE-090-006 / design §8：metrics 消费 typed 投影（key/value/unit），
// 不再解析 Prometheus 文本。
describe("Ops metrics projection", () => {
  it("reads scalar metrics from the typed summary", () => {
    const payload = {
      items: [
        { key: "app_http_requests_total", value: 6.5, unit: "count" },
        { key: "app_http_in_flight_requests", value: 1, unit: "count" },
        { key: "app_telemetry_exported_spans_total", value: 8, unit: "count" },
        { key: "app_telemetry_dropped_spans_total", value: 0, unit: "count" },
      ],
      asOf: "2026-08-30T00:00:00.000Z",
    };
    expect(readMetricsSnapshot(payload)).toEqual({ requestCount: 6.5, inFlightRequests: 1, exportedSpans: 8, droppedSpans: 0 });
  });

  it("reads process metrics from the typed summary", () => {
    const payload = {
      items: [
        { key: "go_goroutines", value: 7, unit: "count" },
        { key: "process_resident_memory_bytes", value: 26214400, unit: "bytes" },
        { key: "process_cpu_seconds_total", value: 12.5, unit: "seconds" },
      ],
      asOf: "2026-08-30T00:00:00.000Z",
    };
    expect(readRuntimeMetrics(payload)).toEqual({ goroutines: 7, residentMemoryBytes: 26214400, cpuSecondsTotal: 12.5 });
  });

  it("keeps missing and invalid shapes unavailable", () => {
    expect(readMetricsSnapshot({ items: [], asOf: "" })).toEqual({});
    expect(readMetricsSnapshot("app_http_in_flight_requests 1")).toBeUndefined();
    expect(readMetricsSnapshot(null)).toBeUndefined();
    expect(readMetricsSnapshot({ items: "not-an-array", asOf: "x" })).toBeUndefined();
  });
});
