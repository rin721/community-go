import { describe, expect, it } from "vitest";
import { formatDateTime, formatRelativeTime } from "./index";

describe("083 formatDateTime (PAGE-083-002)", () => {
  it("formats valid RFC3339 to local YYYY-MM-DD HH:mm", () => {
    const formatted = formatDateTime("2026-08-27T14:30:05.000Z");
    expect(formatted).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/);
    expect(formatted.startsWith("2026-08-27")).toBe(true);
  });

  it("returns dash for missing value", () => {
    expect(formatDateTime(undefined)).toBe("—");
    expect(formatDateTime(null)).toBe("—");
  });

  it("falls back to raw value for invalid input", () => {
    expect(formatDateTime("not-a-date")).toBe("not-a-date");
  });
});

describe("083 formatRelativeTime", () => {
  const t = (key: string, params?: Record<string, number>) => `${key}:${JSON.stringify(params ?? {})}`;
  const now = Date.parse("2026-08-27T15:00:00.000Z");

  it("uses stable buckets and preserves invalid input", () => {
    expect(formatRelativeTime("2026-08-27T14:59:40.000Z", t, now)).toContain("relative.justNow");
    expect(formatRelativeTime("2026-08-27T14:30:00.000Z", t, now)).toContain('"minutes":30');
    expect(formatRelativeTime("2026-08-27T12:00:00.000Z", t, now)).toContain('"hours":3');
    expect(formatRelativeTime("2026-08-25T15:00:00.000Z", t, now)).toContain('"days":2');
    expect(formatRelativeTime("not-a-date", t, now)).toBe("not-a-date");
  });
});
