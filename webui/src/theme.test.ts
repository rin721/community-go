import { describe, expect, it } from "vitest";
import { effectiveReduceMotion } from "./theme";

function matchMedia(matches: boolean) {
  return (_query: string) => ({ matches });
}

describe("宿主 reduced-motion 决策", () => {
  it("显式减少动效时始终返回 reduce，不依赖系统偏好", () => {
    expect(effectiveReduceMotion(true, matchMedia(false))).toBe(true);
    expect(effectiveReduceMotion(true, matchMedia(true))).toBe(true);
  });

  it("未显式减少时跟随系统 prefers-reduced-motion", () => {
    expect(effectiveReduceMotion(false, matchMedia(true))).toBe(true);
    expect(effectiveReduceMotion(false, matchMedia(false))).toBe(false);
  });

  it("无 matchMedia 时按显式值决定（服务端/测试环境回退）", () => {
    expect(effectiveReduceMotion(true)).toBe(true);
    expect(effectiveReduceMotion(false)).toBe(false);
  });
});