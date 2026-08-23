// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { dampingSettings, SmoothScrollController, type LenisFactory, type LenisLike } from "./smooth-scroll";

function fakeFactory(record: { instances: LenisLike[]; options: Array<Record<string, unknown>> }): LenisFactory {
  return (options) => {
    record.options.push({ ...options });
    const instance: LenisLike = { raf: vi.fn(), destroy: vi.fn(), scrollTo: vi.fn() };
    record.instances.push(instance);
    return instance;
  };
}

function emptyFactoryRecord() {
  const value: { instances: LenisLike[]; options: Array<Record<string, unknown>> } = { instances: [], options: [] };
  return value;
}

describe("SmoothScrollController（Lenis 窄边界封装）", () => {
  it("阻尼档位派生 duration/easing", () => {
    expect(dampingSettings.subtle.duration).toBeLessThan(dampingSettings.standard.duration);
    expect(dampingSettings.relaxed.duration).toBeGreaterThan(dampingSettings.standard.duration);
    expect(typeof dampingSettings.standard.easing(0.5)).toBe("number");
    expect(dampingSettings.standard.easing(0)).toBeLessThan(0.01);
    expect(dampingSettings.standard.easing(1)).toBe(1);
  });

  it("enabled 时创建 Lenis 实例并在销毁时清理", () => {
    const record = emptyFactoryRecord();
    const controller = new SmoothScrollController(fakeFactory(record));
    controller.attach(container(), content());
    expect(record.instances.length).toBe(1);
    expect(record.options[0].syncTouch).toBe(false);
    controller.destroy();
    expect(record.instances[0].destroy).toHaveBeenCalledOnce();
  });

  it("reduced-motion 或关闭时不创建实例（回退原生滚动）", () => {
    const record = emptyFactoryRecord();
    const controller = new SmoothScrollController(fakeFactory(record));
    controller.setSettings({ enabled: true, damping: "standard", reduced: true });
    controller.attach(container(), content());
    expect(record.instances.length).toBe(0);
    controller.destroy();

    const second = new SmoothScrollController(fakeFactory(record));
    second.setSettings({ enabled: false, damping: "standard", reduced: false });
    second.attach(container(), content());
    expect(record.instances.length).toBe(0);
    second.destroy();
  });

  it("设置变化（阻尼档位）后重新装配以应用新时长", () => {
    const record = emptyFactoryRecord();
    const controller = new SmoothScrollController(fakeFactory(record));
    controller.attach(container(), content());
    controller.setSettings({ damping: "relaxed" });
    expect(record.instances.length).toBe(2);
    expect(record.options[1].duration).toBe(dampingSettings.relaxed.duration);
    controller.destroy();
  });
});

function container(): Element {
  return document.createElement("div");
}

function content(): HTMLElement {
  return document.createElement("div");
}