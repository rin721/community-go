// EdgeBand 实现页面/滚动区域边缘的橡皮筋反馈（067）：
// 在滚动容器到达边界后继续输入时，对内容容器施加瞬态 translateY（--edge-band-offset），
// 松手后按 --ease-emphasized 弹性回弹；输入跟随用 .edge-band-active 关闭 transition。
export type EdgeBandInput = { deltaY: number; scrollTop: number; maxScroll: number };

export type EdgeBandResult = { offset: number; direction: "top" | "bottom" | "none" };

const EDGE_BAND_MAX = 16;

// computeEdgeBand 纯函数：返回边界越界的位移量（px）与方向。
// 顶部越界（deltaY<0）位移为正（内容被“下拉”），底部越界（deltaY>0）位移为负（内容被“上拉”）。
export function computeEdgeBand({ deltaY, scrollTop, maxScroll }: EdgeBandInput): EdgeBandResult {
  if (maxScroll <= 0) return { offset: 0, direction: "none" };
  if (scrollTop <= 0 && deltaY < 0) {
    return { offset: clamp(-deltaY * 0.2, EDGE_BAND_MAX), direction: "top" };
  }
  if (scrollTop >= maxScroll && deltaY > 0) {
    return { offset: -clamp(deltaY * 0.2, EDGE_BAND_MAX), direction: "bottom" };
  }
  return { offset: 0, direction: "none" };
}

function clamp(value: number, max: number): number {
  return Math.max(-max, Math.min(max, value));
}

export type EdgeBandOptions = {
  enabled: boolean;
  reduceToZeroAfterMs?: number;
};

export class EdgeBand {
  private releaseTimer = 0;
  private readonly cleanup: Array<() => void> = [];
  private options: EdgeBandOptions;

  constructor(
    private readonly container: HTMLElement,
    private readonly content: HTMLElement,
    options: EdgeBandOptions,
  ) {
    this.options = options;
  }

  setEnabled(enabled: boolean): void {
    this.options = { ...this.options, enabled };
    if (!enabled) this.release();
  }

  attach(): void {
    const onWheel = (event: WheelEvent) => {
      if (!this.options.enabled) return;
      const maxScroll = this.container.scrollHeight - this.container.clientHeight;
      this.apply(computeEdgeBand({ deltaY: event.deltaY, scrollTop: this.container.scrollTop, maxScroll }));
    };
    this.container.addEventListener("wheel", onWheel, { passive: true });
    this.cleanup.push(() => this.container.removeEventListener("wheel", onWheel));
  }

  destroy(): void {
    if (this.releaseTimer !== 0) window.clearTimeout(this.releaseTimer);
    this.releaseTimer = 0;
    for (const dispose of this.cleanup) dispose();
    this.cleanup.length = 0;
    this.release();
  }

  private apply(result: EdgeBandResult): void {
    if (result.direction === "none") {
      this.release();
      return;
    }
    this.content.classList.add("edge-band-active");
    this.content.style.setProperty("--edge-band-offset", `${result.offset}px`);
    this.container.dataset.edgeBand = result.direction;
    if (this.releaseTimer !== 0) window.clearTimeout(this.releaseTimer);
    this.releaseTimer = window.setTimeout(() => this.release(), this.options.reduceToZeroAfterMs ?? 90);
  }

  private release(): void {
    this.content.classList.remove("edge-band-active");
    this.content.style.removeProperty("--edge-band-offset");
    delete this.container.dataset.edgeBand;
  }
}