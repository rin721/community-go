import { useCallback, useEffect, useState } from "react";

export type ThemeMode = "system" | "light" | "dark";
export type ThemePreset = "blue" | "cyan" | "green" | "violet" | "orange";
export type ContentDensity = "comfortable" | "compact";
export type ThemeLayoutPreferences = { showBreadcrumb: boolean; showTabs: boolean; showFooter: boolean; sidebarCollapsed: boolean };
export type ThemePreferences = { mode: ThemeMode; preset: ThemePreset; density: ContentDensity; layout: ThemeLayoutPreferences; reduceMotion: boolean };

const storageKey = "community-go-webui-theme";
export const defaultTheme: ThemePreferences = { mode: "system", preset: "blue", density: "comfortable", layout: { showBreadcrumb: true, showTabs: true, showFooter: true, sidebarCollapsed: false }, reduceMotion: false };

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
    && typeof candidate.layout?.sidebarCollapsed === "boolean";
}

function isLegacyThemePreferences(value: unknown): value is Pick<ThemePreferences, "mode" | "preset" | "density"> {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<Pick<ThemePreferences, "mode" | "preset" | "density">>;
  return ["system", "light", "dark"].includes(candidate.mode ?? "")
    && ["blue", "cyan", "green", "violet", "orange"].includes(candidate.preset ?? "")
    && ["comfortable", "compact"].includes(candidate.density ?? "");
}

function readTheme(): ThemePreferences {
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

function applyTheme(theme: ThemePreferences) {
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  document.documentElement.dataset.colorScheme = theme.mode === "system" ? (prefersDark ? "dark" : "light") : theme.mode;
  document.documentElement.dataset.themePreset = theme.preset;
  document.documentElement.dataset.density = theme.density;
  document.documentElement.dataset.motion = effectiveReduceMotion(theme.reduceMotion) ? "reduce" : "full";
  document.documentElement.style.colorScheme = document.documentElement.dataset.colorScheme;
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