import { describe, expect, it } from "vitest";
import { formatUptime, operationCapabilityState, refreshNoticeTone } from "./DashboardPage";

describe("Ops capability state", () => {
  it("keeps core failures unavailable", () => {
    expect(operationCapabilityState(true, false, true)).toBe("unavailable");
  });

  it("marks optional failures degraded and pending unavailable", () => {
    expect(operationCapabilityState(false, false, true)).toBe("degraded");
    expect(operationCapabilityState(false, true, false)).toBe("unavailable");
    expect(operationCapabilityState(false, false, false)).toBe("available");
  });

  it("keeps refresh feedback truthful when any real query fails", () => {
    expect(refreshNoticeTone(0)).toBe("success");
    expect(refreshNoticeTone(1)).toBe("danger");
  });
});

describe("082 Ops uptime formatting (REQ-017)", () => {
  const t = (key: string, params?: Record<string, number>) => `${key}:${JSON.stringify(params ?? {})}`;
  it("formats days/hours when long", () => {
    expect(formatUptime(90061, t)).toContain("uptime.dh");
    expect(formatUptime(90061, t)).toContain('"days":1');
  });
  it("formats hours/minutes in the middle range", () => {
    expect(formatUptime(3661, t)).toContain("uptime.hm");
  });
  it("formats minutes for short uptimes", () => {
    expect(formatUptime(120, t)).toContain("uptime.m");
  });
});
