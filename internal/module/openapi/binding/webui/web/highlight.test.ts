import { describe, expect, it } from "vitest";
import { highlightJSON } from "./highlight";

describe("highlight JSON helper", () => {
  it("highlights valid JSON with escaped markup", () => {
    const html = highlightJSON('{"a":"<b>"}');
    expect(html).toContain("<span");
    expect(html).not.toContain("<b>");
    expect(html).toContain("&lt;b&gt;");
  });

  it("falls back to escaped plain text for non-JSON bodies", () => {
    const html = highlightJSON('<script>alert(1)</script>');
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
  });
});