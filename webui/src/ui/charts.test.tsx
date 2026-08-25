import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { LineChart, Sparkline } from "./charts";

describe("charts primitives (081)", () => {
  it("renders an empty state with the aria label when there are no values", () => {
    const markup = renderToStaticMarkup(createElement(Sparkline, { values: [], ariaLabel: "requests trend" }));
    expect(markup).toContain('aria-label="requests trend"');
    expect(markup).toContain("chart-empty");
  });

  it("renders a single-series svg path with the provided label", () => {
    const markup = renderToStaticMarkup(createElement(Sparkline, { values: [1, 3, 2, 5], ariaLabel: "memory trend" }));
    expect(markup).toContain('aria-label="memory trend"');
    expect(markup).toContain("<svg");
    expect(markup).toContain("<path");
    expect(markup).toContain("currentColor");
  });

  it("renders a multi-series line chart with legend values", () => {
    const markup = renderToStaticMarkup(createElement(LineChart, { ariaLabel: "ops trend", series: [{ label: "requests", values: [1, 2, 3] }, { label: "errors", values: [0, 1, 0] }] }));
    expect(markup).toContain('aria-label="ops trend"');
    expect(markup).toContain("requests (3)");
    expect(markup).toContain("errors (0)");
    expect((markup.match(/<path/g) ?? []).length).toBe(2);
  });

  it("renders an empty state for a chart whose series are all empty", () => {
    const markup = renderToStaticMarkup(createElement(LineChart, { ariaLabel: "empty chart", series: [{ label: "a", values: [] }] }));
    expect(markup).toContain("chart-empty");
  });
});