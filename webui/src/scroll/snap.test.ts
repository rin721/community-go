// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { applyMagneticSnap, isSnapTarget } from "./snap";

describe("磁吸吸附", () => {
  it("按开关切换 snap-x 类", () => {
    const container = document.createElement("div");
    applyMagneticSnap(container, true);
    expect(container.classList.contains("snap-x")).toBe(true);
    applyMagneticSnap(container, false);
    expect(container.classList.contains("snap-x")).toBe(false);
  });

  it("识别声明 data-snap-x 的目标", () => {
    const element = document.createElement("div");
    expect(isSnapTarget(element)).toBe(false);
    element.setAttribute("data-snap-x", "");
    expect(isSnapTarget(element)).toBe(true);
  });
});