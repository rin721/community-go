// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { applyTheme, defaultExperience, defaultTheme, effectiveReduceMotion, readTheme, type ThemePreferences } from "./theme";

function matchMedia(matches: boolean) {
  return (_query: string) => ({ matches });
}

beforeEach(() => {
  localStorage.clear();
  vi.stubGlobal("matchMedia", (query: string) => ({ matches: query === "(prefers-color-scheme: dark)" ? false : false, addEventListener: vi.fn(), removeEventListener: vi.fn() }));
  delete document.documentElement.dataset.experienceScrollbar;
  delete document.documentElement.dataset.experienceSmoothScroll;
  delete document.documentElement.dataset.experienceRevealRhythm;
  delete document.documentElement.dataset.motion;
});

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

describe("067 体验派生配置", () => {
  it("读取默认主题时补齐 experience 默认值（稳定插槽/平滑开/standard/边缘开/reveal 开/balanced）", () => {
    localStorage.setItem("community-go-webui-theme", JSON.stringify({ mode: "light", preset: "blue", density: "comfortable", layout: { showBreadcrumb: true, showTabs: true, showFooter: true, sidebarCollapsed: false }, reduceMotion: false }));
    const theme = readTheme();
    expect(theme.experience).toEqual(defaultExperience);
    expect(theme.experience.scrollbar).toBe("stable");
  });

  it("旧结构（无 experience）迁移补齐默认体验配置", () => {
    localStorage.setItem("community-go-webui-theme", JSON.stringify({ mode: "dark", preset: "green", density: "compact" }));
    const theme = readTheme();
    expect(theme.mode).toBe("dark");
    expect(theme.preset).toBe("green");
    expect(theme.density).toBe("compact");
    expect(theme.experience).toEqual(defaultExperience);
  });

  it("完整结构保留既有体验配置", () => {
    const stored: ThemePreferences = { ...defaultTheme, experience: { ...defaultExperience, damping: "relaxed", scrollbar: "overlay", revealRhythm: "playful" } };
    localStorage.setItem("community-go-webui-theme", JSON.stringify(stored));
    expect(readTheme()).toEqual(stored);
  });

  it("applyTheme 把体验配置落到 data-experience-* 且尊重 reduced-motion", () => {
    applyTheme({ ...defaultTheme, experience: { ...defaultExperience, scrollbar: "overlay", revealRhythm: "playful" }, reduceMotion: true });
    const root = document.documentElement;
    expect(root.dataset.experienceScrollbar).toBe("overlay");
    expect(root.dataset.experienceSmoothScroll).toBe("true");
    expect(root.dataset.experienceRevealRhythm).toBe("playful");
    expect(root.dataset.motion).toBe("reduce");
  });
});