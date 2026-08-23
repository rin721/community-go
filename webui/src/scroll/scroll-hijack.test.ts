// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { applyScrollHijack, hijackScroll, isHijackTarget } from "./scroll-hijack";

function overflowContainer(width = 2000) {
  const element = document.createElement("div");
  Object.defineProperty(element, "scrollWidth", { configurable: true, value: width });
  Object.defineProperty(element, "clientWidth", { configurable: true, value: 800 });
  Object.defineProperty(element, "scrollHeight", { configurable: true, value: 800 });
  Object.defineProperty(element, "clientHeight", { configurable: true, value: 800 });
  return element;
}

describe("显式滚动场景劫持", () => {
  it("仅识别显式声明的劫持方向", () => {
    const element = document.createElement("div");
    expect(isHijackTarget(element)).toBe(false);
    element.dataset.scrollHijack = "x";
    expect(isHijackTarget(element)).toBe(true);
    element.dataset.scrollHijack = "y";
    expect(isHijackTarget(element)).toBe(true);
  });

  it("横向劫持：容器内纵向滚轮输入转换为 scrollLeft 并 preventDefault", () => {
    const container = overflowContainer();
    const dispose = hijackScroll(container, "x");
    const event = new WheelEvent("wheel", { deltaY: 120, deltaX: 0, cancelable: true, bubbles: true });
    container.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(true);
    expect(container.scrollLeft).toBe(120);
    dispose();
    container.scrollLeft = 0;
    container.dispatchEvent(new WheelEvent("wheel", { deltaY: 40, cancelable: true, bubbles: true }));
    expect(container.scrollLeft).toBe(0);
  });

  it("无横向溢出时不劫持滚轮", () => {
    const container = overflowContainer(400);
    const dispose = hijackScroll(container, "x");
    const event = new WheelEvent("wheel", { deltaY: 120, cancelable: true, bubbles: true });
    container.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(false);
    expect(container.scrollLeft).toBe(0);
    dispose();
  });

  it("applyScrollHijack 按声明方向注册并返回卸载函数", () => {
    const container = overflowContainer();
    container.dataset.scrollHijack = "x";
    const dispose = applyScrollHijack(container);
    expect(dispose).toBeTypeOf("function");
    dispose?.();
    const event = new WheelEvent("wheel", { deltaY: 50, cancelable: true, bubbles: true });
    container.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(false);
  });
});