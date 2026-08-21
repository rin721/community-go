import { describe, expect, it } from "vitest";
import { readMetricsSnapshot } from "./metrics-data";

describe("Ops metrics projection", () => {
  it("sums labeled request series and reads scalar metrics", () => {
    const payload = [
      "# HELP app_http_requests_total requests",
      'app_http_requests_total{operation="build",method="GET"} 4',
      'app_http_requests_total{operation="livez",method="GET"} 2.5',
      "app_http_in_flight_requests 1",
      "app_telemetry_exported_spans_total 8",
      "app_telemetry_dropped_spans_total 0",
    ].join("\n");

    expect(readMetricsSnapshot(payload)).toEqual({ requestCount: 6.5, inFlightRequests: 1, exportedSpans: 8, droppedSpans: 0 });
  });

  it("keeps missing and non-finite values unavailable", () => {
    expect(readMetricsSnapshot("app_http_in_flight_requests NaN\napp_telemetry_dropped_spans_total 3")).toEqual({ droppedSpans: 3 });
    expect(readMetricsSnapshot({ metrics: "not-prometheus" })).toBeUndefined();
  });
});
