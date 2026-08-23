import Lenis from "lenis";
import type { DampingTier } from "../theme";

// SmoothScrollController 是 Lenis 的项目自有窄契约封装（067）：
// - 只暴露 attach/setSettings/destroy/scrollTo，Lenis 类型不泄漏给调用方；
// - 构造注入 Lenis 工厂，便于测试替换为 fake；
// - syncTouch=false 保留触控设备原生惯性；reduced-motion 或关闭时销毁回退原生滚动。
export type LenisLike = {
  raf: (time: number) => void;
  destroy: () => void;
  scrollTo: (target: number, options?: { offset?: number }) => void;
};

export type LenisOptions = {
  wrapper: Element | Window;
  content: HTMLElement;
  duration: number;
  easing: (time: number) => number;
  smoothWheel: boolean;
  syncTouch: boolean;
};

export type LenisFactory = (options: LenisOptions) => LenisLike;

export const lenisFactory: LenisFactory = (options) => new Lenis(options) as unknown as LenisLike;

// dampingSettings 把阻尼档位派生为 Lenis duration/easing（单位：秒）。
export const dampingSettings: Record<DampingTier, { duration: number; easing: (time: number) => number }> = {
  subtle: { duration: 0.8, easing: (time) => Math.min(1, 1.001 - 2 ** (-10 * time)) },
  standard: { duration: 1.2, easing: (time) => Math.min(1, 1.001 - 2 ** (-10 * time)) },
  relaxed: { duration: 2, easing: (time) => 1 - (1 - time) ** 3 },
};

export type SmoothScrollSettings = { enabled: boolean; damping: DampingTier; reduced: boolean };

export class SmoothScrollController {
  private instance: LenisLike | null = null;
  private wrapper: Element | Window | null = null;
  private content: HTMLElement | null = null;
  private rafHandle = 0;
  private running = false;
  private settings: SmoothScrollSettings = { enabled: true, damping: "standard", reduced: false };

  constructor(private readonly factory: LenisFactory = lenisFactory) {}

  // attach 绑定滚动容器并启动 rAF 循环；元素/窗口两种目标均支持。
  attach(wrapper: Element | Window, content: HTMLElement): void {
    this.detach();
    this.wrapper = wrapper;
    this.content = content;
    if (!this.settings.enabled || this.settings.reduced) return;
    this.spawn();
  }

  setSettings(next: Partial<SmoothScrollSettings>): void {
    this.settings = { ...this.settings, ...next };
    if (this.wrapper && this.content) this.attach(this.wrapper, this.content);
  }

  scrollTo(target: number, options?: { offset?: number }): void {
    this.instance?.scrollTo(target, options);
  }

  destroy(): void {
    this.detach();
  }

  private spawn(): void {
    const { wrapper, content, settings } = this;
    if (!wrapper || !content) return;
    const mapping = dampingSettings[settings.damping];
    this.instance = this.factory({
      wrapper,
      content,
      duration: mapping.duration,
      easing: mapping.easing,
      smoothWheel: true,
      syncTouch: false,
    });
    this.startLoop();
  }

  private detach(): void {
    this.stopLoop();
    this.instance?.destroy();
    this.instance = null;
  }

  private startLoop(): void {
    if (this.running || this.rafHandle !== 0) return;
    if (typeof requestAnimationFrame !== "function") return;
    this.running = true;
    const loop = (time: number) => {
      if (!this.running) return;
      this.instance?.raf(time);
      this.rafHandle = requestAnimationFrame(loop);
    };
    this.rafHandle = requestAnimationFrame(loop);
  }

  private stopLoop(): void {
    this.running = false;
    if (this.rafHandle !== 0 && typeof cancelAnimationFrame === "function") cancelAnimationFrame(this.rafHandle);
    this.rafHandle = 0;
  }
}