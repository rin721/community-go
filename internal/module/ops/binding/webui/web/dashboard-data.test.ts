import { describe, expect, it } from "vitest";
import { booleanCapabilityState, healthCapabilityState, readBuildSnapshot, readRuntimeSnapshot } from "./dashboard-data";

describe("Ops dashboard data projection", () => {
  it("keeps only real build fields and rejects non-record payloads", () => {
    expect(readBuildSnapshot({ version: "dev", commit: "abc123", buildTime: "2026-08-21", goVersion: "go1.25", dirty: false })).toEqual({ version: "dev", commit: "abc123", buildTime: "2026-08-21", goVersion: "go1.25", dirty: false });
    expect(readBuildSnapshot(["not-a-build"])).toBeUndefined();
  });

  it("projects runtime diagnostics without coercing missing values", () => {
    expect(readRuntimeSnapshot({ processState: "running", generation: 2, activeRequests: 3, authReady: true, databaseReady: false })).toEqual({ processState: "running", generation: 2, activeRequests: 3, authReady: true, databaseReady: false });
    expect(readRuntimeSnapshot({ generation: "2", activeRequests: null })).toEqual({});
  });

  it("maps dependency readiness to truthful capability states", () => {
    expect(booleanCapabilityState(true)).toBe("available");
    expect(booleanCapabilityState(false)).toBe("degraded");
    expect(booleanCapabilityState(undefined)).toBe("unavailable");
    expect(healthCapabilityState("healthy")).toBe("available");
    expect(healthCapabilityState("fail")).toBe("degraded");
    expect(healthCapabilityState(undefined)).toBe("unavailable");
  });
});
