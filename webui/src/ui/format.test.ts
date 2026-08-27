import { describe, expect, it } from "vitest";
import { formatDateTime } from "./index";

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