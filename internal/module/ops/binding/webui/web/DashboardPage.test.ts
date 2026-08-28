import { describe, expect, it } from "vitest";
import { formatUptime, operationCapabilityState, projectDiagnosticEntries, refreshNoticeTone, requestIDOf } from "./DashboardPage";

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

describe("诊断摘要投影", () => {
  it("只保留有限标量字段，避免主界面倾倒原始 JSON", () => {
    expect(projectDiagnosticEntries({ status: "ok", active: 2, nested: { secret: "x" }, list: [1], enabled: true }, 3)).toEqual([
      { key: "status", value: "ok" },
      { key: "active", value: "2" },
      { key: "enabled", value: "true" },
    ]);
    expect(projectDiagnosticEntries({ status: "ok" }, 0)).toEqual([]);
  });
});

describe("诊断错误关联", () => {
  it("只接受非空字符串 request id", () => {
    expect(requestIDOf({ requestId: "req-123" })).toBe("req-123");
    expect(requestIDOf({ requestId: "" })).toBeUndefined();
    expect(requestIDOf({ requestId: 123 })).toBeUndefined();
    expect(requestIDOf(null)).toBeUndefined();
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
