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

function applyTheme(theme: ThemePreferences) {
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  document.documentElement.dataset.colorScheme = theme.mode === "system" ? (prefersDark ? "dark" : "light") : theme.mode;
  document.documentElement.dataset.themePreset = theme.preset;
  document.documentElement.dataset.density = theme.density;
  document.documentElement.dataset.motion = theme.reduceMotion ? "reduce" : "full";
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
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = () => theme.mode === "system" && applyTheme(theme);
    media.addEventListener("change", handleChange);
    return () => media.removeEventListener("change", handleChange);
  }, [theme]);
  return { theme, setTheme, resetTheme: () => setTheme(defaultTheme) };
}
