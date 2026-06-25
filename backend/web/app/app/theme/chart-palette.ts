import { useEffect, useState } from "react";

import { activeThemePackage } from "~/theme/generated/theme-metadata";
import type { ThemeChartPalette } from "~/theme/schema";

export type { ThemeChartPalette };

const chartVariableNames: Record<keyof ThemeChartPalette, string> = {
  border: "--console-chart-border",
  danger: "--console-chart-danger",
  primary: "--console-chart-primary",
  secondary: "--console-chart-secondary",
  success: "--console-chart-success",
  surface: "--console-chart-surface",
  textPrimary: "--console-chart-text-primary",
  textSecondary: "--console-chart-text-secondary",
  track: "--console-chart-track",
  warning: "--console-chart-warning",
};

export const fallbackThemeChartPalette = activeThemePackage.tokens.chartPalette.light;

export function useThemeChartPalette() {
  const [palette, setPalette] = useState<ThemeChartPalette>(fallbackThemeChartPalette);

  useEffect(() => {
    const readPalette = () => {
      setPalette(readThemeChartPalette());
    };

    readPalette();
    const observer = new MutationObserver(readPalette);
    observer.observe(document.documentElement, {
      attributeFilter: ["data-theme"],
      attributes: true,
    });
    return () => observer.disconnect();
  }, []);

  return palette;
}

function readThemeChartPalette(): ThemeChartPalette {
  const root = document.documentElement;
  const mode = root.dataset.theme === "dark" ? "dark" : "light";
  const fallback = activeThemePackage.tokens.chartPalette[mode];
  const computed = window.getComputedStyle(root);
  const read = (name: keyof ThemeChartPalette) =>
    computed.getPropertyValue(chartVariableNames[name]).trim() || fallback[name];

  return {
    border: read("border"),
    danger: read("danger"),
    primary: read("primary"),
    secondary: read("secondary"),
    success: read("success"),
    surface: read("surface"),
    textPrimary: read("textPrimary"),
    textSecondary: read("textSecondary"),
    track: read("track"),
    warning: read("warning"),
  };
}
