import { describe, expect, it } from "vitest";
import { assembleRunResult, classifyBody, formatBytes, prettyJSON } from "./run-store";

describe("run-store response assembly", () => {
  it("classifies response bodies by leading bytes", () => {
    expect(classifyBody('{"a":1}')).toBe("json");
    expect(classifyBody('  [1,2]')).toBe("json");
    expect(classifyBody("<html><body>x</body></html>")).toBe("html");
    expect(classifyBody("plain text")).toBe("text");
  });

  it("assembles derived size and body class", () => {
    const result = assembleRunResult({ ok: true, status: 200, statusText: "OK", durationMs: 12, headers: {}, body: '{"a":1}' });
    expect(result.sizeBytes).toBe(7);
    expect(result.bodyClass).toBe("json");
    expect(result.durationMs).toBe(12);
  });

  it("formats byte counts with compact units", () => {
    expect(formatBytes(512)).toBe("512 B");
    expect(formatBytes(2048)).toBe("2.0 KB");
    expect(formatBytes(2 * 1024 * 1024)).toBe("2.00 MB");
  });

  it("pretty-prints JSON and keeps non-JSON verbatim", () => {
    expect(prettyJSON('{"a":1}')).toBe('{\n  "a": 1\n}');
    expect(prettyJSON("nope")).toBe("nope");
  });
});