import { useCallback, useEffect, useState } from "react";

export type ThemeMode = "system" | "light" | "dark";
export type ThemePreset = "blue" | "cyan" | "green" | "violet" | "orange";
export type ContentDensity = "comfortable" | "compact";
export type ThemePreferences = { mode: ThemeMode; preset: ThemePreset; density: ContentDensity };

const storageKey = "community-go-webui-theme";
export const defaultTheme: ThemePreferences = { mode: "system", preset: "blue", density: "comfortable" };

function isThemePreferences(value: unknown): value is ThemePreferences {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<ThemePreferences>;
  return ["system", "light", "dark"].includes(candidate.mode ?? "")
    && ["blue", "cyan", "green", "violet", "orange"].includes(candidate.preset ?? "")
    && ["comfortable", "compact"].includes(candidate.density ?? "");
}

function readTheme(): ThemePreferences {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(storageKey) ?? "null");
    return isThemePreferences(value) ? value : defaultTheme;
  } catch {
    return defaultTheme;
  }
}

function applyTheme(theme: ThemePreferences) {
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  document.documentElement.dataset.colorScheme = theme.mode === "system" ? (prefersDark ? "dark" : "light") : theme.mode;
  document.documentElement.dataset.themePreset = theme.preset;
  document.documentElement.dataset.density = theme.density;
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
