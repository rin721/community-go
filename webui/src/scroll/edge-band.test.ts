import { describe, expect, it } from "vitest";
import { computeEdgeBand } from "./edge-band";

describe("边缘阻尼/橡皮筋纯函数", () => {
  it("页面中部输入不触发边界反馈", () => {
    expect(computeEdgeBand({ deltaY: 100, scrollTop: 100, maxScroll: 1000 })).toEqual({ offset: 0, direction: "none" });
    expect(computeEdgeBand({ deltaY: -100, scrollTop: 100, maxScroll: 1000 })).toEqual({ offset: 0, direction: "none" });
  });

  it("顶部继续向上滚动时产生正向位移（内容被下拉）并封顶", () => {
    expect(computeEdgeBand({ deltaY: -10, scrollTop: 0, maxScroll: 500 })).toEqual({ offset: 2, direction: "top" });
    expect(computeEdgeBand({ deltaY: -1000, scrollTop: 0, maxScroll: 500 }).offset).toBeLessThanOrEqual(16);
    expect(computeEdgeBand({ deltaY: -1000, scrollTop: 0, maxScroll: 500 }).offset).toBeGreaterThan(0);
  });

  it("底部继续向下滚动时产生负向位移（内容被上拉）并封顶", () => {
    expect(computeEdgeBand({ deltaY: 20, scrollTop: 500, maxScroll: 500 })).toEqual({ offset: -4, direction: "bottom" });
    expect(computeEdgeBand({ deltaY: 10000, scrollTop: 500, maxScroll: 500 }).offset).toBeGreaterThanOrEqual(-16);
    expect(computeEdgeBand({ deltaY: 10000, scrollTop: 500, maxScroll: 500 }).offset).toBeLessThan(0);
  });

  it("无滚动余量（maxScroll<=0）时不产生反馈", () => {
    expect(computeEdgeBand({ deltaY: 100, scrollTop: 0, maxScroll: 0 })).toEqual({ offset: 0, direction: "none" });
  });
});