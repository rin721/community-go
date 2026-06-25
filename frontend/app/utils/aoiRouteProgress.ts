export type AoiRouteProgressEasing = "linear" | "ease" | "ease-in" | "ease-out" | "ease-in-out"

export const AOI_ROUTE_PROGRESS_SETTINGS_VERSION = 5
export const AOI_ROUTE_PROGRESS_LEGACY_DELAY_MS = 120

export const AOI_ROUTE_PROGRESS_DEFAULTS = {
  delayMs: 0,
  easing: "ease" as AoiRouteProgressEasing,
  enabled: true,
  heightPx: 3,
  minimum: 0.08,
  showSpinner: false,
  speedMs: 220,
  trickle: true,
  trickleSpeedMs: 200
}

export function isAoiRouteProgressEasing(value: unknown): value is AoiRouteProgressEasing {
  return value === "linear"
    || value === "ease"
    || value === "ease-in"
    || value === "ease-out"
    || value === "ease-in-out"
}

export function clampAoiRouteProgressSetting(value: unknown, min: number, max: number, fallback: number) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return fallback
  }

  return Math.min(max, Math.max(min, value))
}
