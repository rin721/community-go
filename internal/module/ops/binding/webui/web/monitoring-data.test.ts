import { describe, expect, it } from "vitest";
import { appendMonitoringPoint, monitoringWindowLimit, seriesValues } from "./monitoring-data";

describe("monitoring window (081)", () => {
  it("computes requests per second from the delta between consecutive totals", () => {
    const first = { at: 1000, requestTotal: 100 };
    const second = { at: 6000, requestTotal: 120 };
    const window = appendMonitoringPoint(appendMonitoringPoint([], first), second);
    expect(window).toHaveLength(2);
    expect(window[0].requestsPerSecond).toBeUndefined();
    expect(window[1].requestsPerSecond).toBeCloseTo(4, 5); // 20 requests / 5s
  });

  it("caps the window at the configured limit", () => {
    let window: ReturnType<typeof appendMonitoringPoint> = [];
    for (let index = 0; index < monitoringWindowLimit + 5; index++) {
      window = appendMonitoringPoint(window, { at: index * 1000, requestTotal: index + 1 });
    }
    expect(window).toHaveLength(monitoringWindowLimit);
  });

  it("exports only finite positive series values", () => {
    const window = [
      { at: 0, goroutines: 4 },
      { at: 1, goroutines: 0 },
      { at: 2, goroutines: 6 },
    ];
    expect(seriesValues(window, "goroutines")).toEqual([4, 6]);
  });
});