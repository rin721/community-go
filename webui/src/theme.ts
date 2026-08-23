import { useCallback, useEffect, useState } from "react";

export type ThemeMode = "system" | "light" | "dark";
export type ThemePreset = "blue" | "cyan" | "green" | "violet" | "orange";
export type ContentDensity = "comfortable" | "compact";
export type ScrollbarStrategy = "stable" | "overlay";
export type DampingTier = "subtle" | "standard" | "relaxed";
export type RevealRhythm = "calm" | "balanced" | "playful";
export type ThemeLayoutPreferences = { showBreadcrumb: boolean; showTabs: boolean; showFooter: boolean; sidebarCollapsed: boolean };

// ThemeExperience 是 067 滚动/动效体验的派生配置组：全部项只影响浏览器呈现层，
// 由 applyTheme 落到 <html data-experience-*>，样式与运行时统一消费。
export type ThemeExperience = {
  smoothScroll: boolean;
  damping: DampingTier;
  edgeDamping: boolean;
  magneticSnap: boolean;
  scrollHijack: boolean;
  reveal: boolean;
  revealRhythm: RevealRhythm;
  scrollbar: ScrollbarStrategy;
};

export type ThemePreferences = {
  mode: ThemeMode;
  preset: ThemePreset;
  density: ContentDensity;
  layout: ThemeLayoutPreferences;
  reduceMotion: boolean;
  experience: ThemeExperience;
};

const storageKey = "community-go-webui-theme";

// defaultExperience 按需求默认：页面滚动条稳定插槽（预留右侧）、阻尼平滑滚动开、
// standard 阻尼、边缘阻尼开、磁吸开、滚动劫持开、弹入开、balanced 节奏。
export const defaultExperience: ThemeExperience = {
  smoothScroll: true,
  damping: "standard",
  edgeDamping: true,
  magneticSnap: true,
  scrollHijack: true,
  reveal: true,
  revealRhythm: "balanced",
  scrollbar: "stable",
};

export const defaultTheme: ThemePreferences = {
  mode: "system",
  preset: "blue",
  density: "comfortable",
  layout: { showBreadcrumb: true, showTabs: true, showFooter: true, sidebarCollapsed: false },
  reduceMotion: false,
  experience: defaultExperience,
};

export const dampingTiers: DampingTier[] = ["subtle", "standard", "relaxed"];
export const revealRhythmOptions: RevealRhythm[] = ["calm", "balanced", "playful"];
export const scrollbarStrategies: ScrollbarStrategy[] = ["stable", "overlay"];

function isThemeExperience(value: unknown): value is ThemeExperience {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<ThemeExperience>;
  return typeof candidate.smoothScroll === "boolean"
    && dampingTiers.includes(candidate.damping as DampingTier)
    && typeof candidate.edgeDamping === "boolean"
    && typeof candidate.magneticSnap === "boolean"
    && typeof candidate.scrollHijack === "boolean"
    && typeof candidate.reveal === "boolean"
    && revealRhythmOptions.includes(candidate.revealRhythm as RevealRhythm)
    && scrollbarStrategies.includes(candidate.scrollbar as ScrollbarStrategy);
}

function isThemePreferences(value: unknown): value is ThemePreferences {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<ThemePreferences>;
  return ["system", "light", "dark"].includes(candidate.mode ?? "")
    && ["blue", "cyan", "green", "violet", "orange"].includes(candidate.preset ?? "")
    && ["comfortable", "compact"].includes(candidate.density ?? "")
    && typeof candidate.reduceMotion === "boolean"
    && typeof candidate.layout?.showBreadcrumb === "boolean"
    && typeof candidate.layout?.showTabs === "boolean"
    && typeof candidate.layout?.showFooter === "boolean"
    && typeof candidate.layout?.sidebarCollapsed === "boolean"
    && isThemeExperience(candidate.experience);
}

function isLegacyThemePreferences(value: unknown): value is Pick<ThemePreferences, "mode" | "preset" | "density"> {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<Pick<ThemePreferences, "mode" | "preset" | "density">>;
  return ["system", "light", "dark"].includes(candidate.mode ?? "")
    && ["blue", "cyan", "green", "violet", "orange"].includes(candidate.preset ?? "")
    && ["comfortable", "compact"].includes(candidate.density ?? "");
}

// readTheme 读取并校验本地主题：完整结构直接使用；旧结构（无 experience）迁移补齐
// 默认体验配置；其余情况回退默认主题，保证派生配置始终有确定语义。
export function readTheme(): ThemePreferences {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(storageKey) ?? "null");
    if (isThemePreferences(value)) return value;
    if (isLegacyThemePreferences(value)) return { ...defaultTheme, mode: value.mode, preset: value.preset, density: value.density };
    return defaultTheme;
  } catch {
    return defaultTheme;
  }
}

// effectiveReduceMotion 把显式偏好与系统 prefers-reduced-motion 合并：
// 显式开关表示“始终减少”，关闭表示“跟随系统”；系统变化时重新应用。
// matchMedia 可注入，便于在无 window 的测试环境验证决策。
export function effectiveReduceMotion(reduceMotion: boolean, matchMedia?: (query: string) => { matches: boolean }): boolean {
  if (reduceMotion) return true;
  if (!matchMedia && typeof window !== "undefined") matchMedia = (query) => window.matchMedia(query);
  return Boolean(matchMedia?.("(prefers-reduced-motion: reduce)").matches);
}

export function applyTheme(theme: ThemePreferences) {
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  const root = document.documentElement;
  const colorScheme = theme.mode === "system" ? (prefersDark ? "dark" : "light") : theme.mode;
  root.dataset.colorScheme = colorScheme;
  // 068：HeroUI 主题层以 .dark class 切换暗色；与 data-color-scheme 保持同一来源。
  root.classList.toggle("dark", colorScheme === "dark");
  root.dataset.themePreset = theme.preset;
  root.dataset.density = theme.density;
  root.dataset.motion = effectiveReduceMotion(theme.reduceMotion) ? "reduce" : "full";
  root.style.colorScheme = colorScheme;
  const dataset = root.dataset;
  dataset.experienceSmoothScroll = String(theme.experience.smoothScroll);
  dataset.experienceDamping = theme.experience.damping;
  dataset.experienceEdgeDamping = String(theme.experience.edgeDamping);
  dataset.experienceMagneticSnap = String(theme.experience.magneticSnap);
  dataset.experienceScrollHijack = String(theme.experience.scrollHijack);
  dataset.experienceReveal = String(theme.experience.reveal);
  dataset.experienceRevealRhythm = theme.experience.revealRhythm;
  dataset.experienceScrollbar = theme.experience.scrollbar;
}

export function useThemePreferences() {
  const [theme, setThemeState] = useState<ThemePreferences>(readTheme);
  const setTheme = useCallback((value: ThemePreferences) => {
    setThemeState(value);
    localStorage.setItem(storageKey, JSON.stringify(value));
    applyTheme(value);
  }, []);
  useEffect(() => {
    applyTheme(theme);
    const colorScheme = window.matchMedia("(prefers-color-scheme: dark)");
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const handleColorSchemeChange = () => theme.mode === "system" && applyTheme(theme);
    // 系统减少动效变化必须重新应用，即使显式开关已开启也保持响应系统后续变化。
    const handleReducedMotionChange = () => applyTheme(theme);
    colorScheme.addEventListener("change", handleColorSchemeChange);
    reducedMotion.addEventListener("change", handleReducedMotionChange);
    return () => {
      colorScheme.removeEventListener("change", handleColorSchemeChange);
      reducedMotion.removeEventListener("change", handleReducedMotionChange);
    };
  }, [theme]);
  return { theme, setTheme, resetTheme: () => setTheme(defaultTheme) };
}