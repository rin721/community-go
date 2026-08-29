import type { AoiAccentScale } from "./aoiAccentDerivation"
import {
  aoiHslToRgba,
  aoiRgbaToCss,
  aoiRgbaToHsl,
  clampAoiColorValue,
  mixAoiRgbaColor,
  normalizeAoiRgbaColor
} from "./aoiColor"

export type AoiDerivationPreset = "soft" | "balanced" | "vivid" | "custom"

export type AoiSettingDerivationStrengthKey =
  | "auxiliaryPalette"
  | "surfaceTint"
  | "stateLayer"
  | "navigationColor"
  | "materialColor"
  | "shadowDepth"
  | "typography"
  | "spacing"
  | "radius"
  | "controls"
  | "contentWidth"
  | "mediaGrid"
  | "settingsLayout"
  | "revealMotion"
  | "routeProgress"
  | "smoothScroll"
  | "scrollSnap"
  | "scrollHijack"
  | "rubberBand"
  | "danmaku"

export type AoiSettingDerivationStrengths = Record<AoiSettingDerivationStrengthKey, number>

export const AOI_DERIVATION_PRESETS = [
  "soft",
  "balanced",
  "vivid",
  "custom"
] as const satisfies readonly AoiDerivationPreset[]

export const AOI_SETTING_DERIVATION_STRENGTH_KEYS = [
  "auxiliaryPalette",
  "surfaceTint",
  "stateLayer",
  "navigationColor",
  "materialColor",
  "shadowDepth",
  "typography",
  "spacing",
  "radius",
  "controls",
  "contentWidth",
  "mediaGrid",
  "settingsLayout",
  "revealMotion",
  "routeProgress",
  "smoothScroll",
  "scrollSnap",
  "scrollHijack",
  "rubberBand",
  "danmaku"
] as const satisfies readonly AoiSettingDerivationStrengthKey[]

export const AOI_SETTING_DERIVATION_STRENGTH_RANGE = {
  min: 40,
  max: 160,
  step: 5,
  default: 100
} as const

export const AOI_SETTING_DERIVATION_PRESET_VALUES: Record<Exclude<AoiDerivationPreset, "custom">, number> = {
  soft: 70,
  balanced: 100,
  vivid: 130
}

export const AOI_SETTING_DERIVATION_DEFAULTS = createAoiSettingDerivationStrengthsFromValue(
  AOI_SETTING_DERIVATION_STRENGTH_RANGE.default
)

export interface AoiDerivedThemeCssVarsOptions {
  accentScale: AoiAccentScale
  contrast: "normal" | "high"
  dark: boolean
  strengths: AoiSettingDerivationStrengths
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value)
}

function pct(value: number) {
  return `${Math.round(value)}%`
}

function alpha(value: number) {
  return clampAoiColorValue(value, 0, 1)
    .toFixed(3)
    .replace(/0+$/, "")
    .replace(/\.$/, "")
}

function colorMix(color: string, amount: number, target: string) {
  return `color-mix(in srgb, ${color} ${pct(amount)}, ${target})`
}

export function isAoiDerivationPreset(value: unknown): value is AoiDerivationPreset {
  return typeof value === "string" && AOI_DERIVATION_PRESETS.includes(value as AoiDerivationPreset)
}

export function clampAoiSettingDerivationStrength(
  value: unknown,
  fallback: number = AOI_SETTING_DERIVATION_STRENGTH_RANGE.default
) {
  const numeric = Number(value)
  const range = AOI_SETTING_DERIVATION_STRENGTH_RANGE

  if (!Number.isFinite(numeric)) {
    return clampAoiSettingDerivationStrength(fallback, range.default)
  }

  const clamped = clampAoiColorValue(numeric, range.min, range.max)
  const stepped = range.min + Math.round((clamped - range.min) / range.step) * range.step

  return clampAoiColorValue(stepped, range.min, range.max)
}

export function createAoiSettingDerivationStrengthsFromValue(value: number): AoiSettingDerivationStrengths {
  const strength = clampAoiSettingDerivationStrength(value)

  return Object.fromEntries(
    AOI_SETTING_DERIVATION_STRENGTH_KEYS.map((key) => [key, strength])
  ) as AoiSettingDerivationStrengths
}

export function createAoiSettingDerivationStrengthsForPreset(preset: AoiDerivationPreset) {
  if (preset === "custom") {
    return { ...AOI_SETTING_DERIVATION_DEFAULTS }
  }

  return createAoiSettingDerivationStrengthsFromValue(AOI_SETTING_DERIVATION_PRESET_VALUES[preset])
}

export function normalizeAoiSettingDerivationStrengths(
  value: unknown,
  fallback: AoiSettingDerivationStrengths = AOI_SETTING_DERIVATION_DEFAULTS
): AoiSettingDerivationStrengths {
  const candidate = isRecord(value) ? value : {}

  return Object.fromEntries(
    AOI_SETTING_DERIVATION_STRENGTH_KEYS.map((key) => [
      key,
      clampAoiSettingDerivationStrength(candidate[key], fallback[key])
    ])
  ) as AoiSettingDerivationStrengths
}

export function aoiDerivationStrengthRatio(value: unknown) {
  return clampAoiSettingDerivationStrength(value) / AOI_SETTING_DERIVATION_STRENGTH_RANGE.default
}

export function aoiDerivationStrengthScale(value: unknown, amount = 1) {
  const strength = clampAoiSettingDerivationStrength(value)
  const delta = (strength - AOI_SETTING_DERIVATION_STRENGTH_RANGE.default)
    / AOI_SETTING_DERIVATION_STRENGTH_RANGE.default

  return Math.max(0.1, 1 + delta * amount)
}

export function deriveAoiSettingNumber(
  value: number,
  strength: unknown,
  options: {
    amount?: number
    fallback: number
    inverse?: boolean
    max: number
    min: number
    precision?: number
  }
) {
  const numeric = Number.isFinite(value) ? value : options.fallback
  const scale = aoiDerivationStrengthScale(strength, options.amount ?? 1)
  const next = options.inverse ? numeric / scale : numeric * scale
  const clamped = Math.min(options.max, Math.max(options.min, next))
  const precision = options.precision ?? 0
  const factor = 10 ** precision

  return Math.round(clamped * factor) / factor
}

export function deriveAoiSettingPercent(
  value: number,
  strength: unknown,
  options: {
    amount?: number
    fallback: number
    max: number
    min: number
  }
) {
  return deriveAoiSettingNumber(value, strength, {
    ...options,
    precision: 0
  })
}

function tintColor(color: string, strength: number, min: number, max: number) {
  return colorMix(color, min + (max - min) * aoiDerivationStrengthRatio(strength), "transparent")
}

function parseCssColor(value: string, fallback = "#ff7d52") {
  const rgb = value.trim().match(/^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)(?:\s*,\s*([\d.]+))?\s*\)$/i)

  if (rgb) {
    return normalizeAoiRgbaColor({
      r: Number(rgb[1]),
      g: Number(rgb[2]),
      b: Number(rgb[3]),
      a: rgb[4] === undefined ? 1 : Number(rgb[4])
    }, normalizeAoiRgbaColor(fallback))
  }

  return normalizeAoiRgbaColor(value, normalizeAoiRgbaColor(fallback))
}

function safeCssColor(value: string, fallback = "#ff7d52") {
  const parsed = parseCssColor(value, fallback)

  return aoiRgbaToCss(parsed)
}

function shiftAccentColor(accent: string, hueOffset: number, saturationScale: number, lightnessScale: number) {
  const base = parseCssColor(accent)
  const hsl = aoiRgbaToHsl(base)

  return aoiRgbaToCss(aoiHslToRgba({
    h: hsl.h + hueOffset,
    s: clampAoiColorValue(hsl.s * saturationScale, 0, 100),
    l: clampAoiColorValue(hsl.l * lightnessScale, 0, 100)
  }, base.a))
}

function deriveAuxiliaryPalette(accent: string, strength: number) {
  const ratio = aoiDerivationStrengthRatio(strength)
  const base = parseCssColor(accent)
  const secondary = shiftAccentColor(accent, 198, 0.74 + ratio * 0.18, 0.96)
  const sakura = shiftAccentColor(accent, 324, 0.78 + ratio * 0.18, 1.04)
  const sun = shiftAccentColor(accent, 36, 0.82 + ratio * 0.16, 1.02)

  return {
    "--aoi-secondary-50": secondary,
    "--aoi-sakura-60": aoiRgbaToCss(mixAoiRgbaColor(parseCssColor(sakura), base, 0.12)),
    "--aoi-sakura-50": sakura,
    "--aoi-sakura-40": colorMix(sakura, 52 + ratio * 14, "white"),
    "--aoi-sakura-20": colorMix(sakura, 22 + ratio * 10, "white"),
    "--aoi-sakura-10": colorMix(sakura, 10 + ratio * 8, "white"),
    "--aoi-sun-50": sun
  }
}

export function createAoiDerivedThemeCssVars(options: AoiDerivedThemeCssVarsOptions): Record<string, string> {
  const strengths = normalizeAoiSettingDerivationStrengths(options.strengths)
  const accent = safeCssColor(options.accentScale.accent60)
  const activeAccent = options.dark ? options.accentScale.accent40 : options.accentScale.accent60
  const surfaceRatio = aoiDerivationStrengthRatio(strengths.surfaceTint)
  const stateRatio = aoiDerivationStrengthRatio(strengths.stateLayer)
  const navRatio = aoiDerivationStrengthRatio(strengths.navigationColor)
  const materialRatio = aoiDerivationStrengthRatio(strengths.materialColor)
  const shadowRatio = aoiDerivationStrengthRatio(strengths.shadowDepth)
  const highContrast = options.contrast === "high"
  const bgBase = options.dark ? "#101719" : "#fbfdff"
  const surfaceBase = options.dark
    ? `rgba(22, 33, 36, ${alpha(highContrast ? 0.98 : 0.86)})`
    : `rgba(255, 255, 255, ${alpha(highContrast ? 0.98 : 0.86)})`
  const solidBase = options.dark ? (highContrast ? "#111d21" : "#162124") : "#ffffff"
  const mutedBase = options.dark ? (highContrast ? "#1a2d33" : "#1d2a2e") : (highContrast ? "#e8f4f7" : "#f2f8fa")
  const textBase = options.dark ? (highContrast ? "#f6feff" : "#eefcff") : (highContrast ? "#0a171b" : "#17262b")
  const textMutedBase = options.dark ? (highContrast ? "#c5e4eb" : "#a1bac2") : (highContrast ? "#314d55" : "#60737b")
  const iconBase = options.dark ? (highContrast ? "#cfecf1" : "#a3bac1") : (highContrast ? "#23434b" : "#64757b")
  const accentForState = options.dark ? "var(--aoi-accent-40)" : "var(--aoi-accent-60)"
  const stateSurface = options.dark ? "var(--aoi-surface-solid)" : "white"
  const hoverMix = (options.dark ? 7 : 4) + stateRatio * (options.dark ? 11 : 8)
  const activeMix = (options.dark ? 11 : 7) + stateRatio * (options.dark ? 17 : 11)
  const borderMix = (options.dark ? 24 : 24) + stateRatio * (options.dark ? 38 : 34)
  const navHoverMix = (options.dark ? 8 : 5) + navRatio * (options.dark ? 10 : 9)
  const navPressedMix = (options.dark ? 12 : 7) + navRatio * (options.dark ? 16 : 15)
  const navActiveMix = (options.dark ? 10 : 8) + navRatio * (options.dark ? 14 : 10)
  const colorfulMix = (options.dark ? 12 : 7) + navRatio * (options.dark ? 10 : 8)
  const shadowColor = options.dark ? "0, 0, 0" : "19, 80, 96"
  const shadowSmAlpha = options.dark ? 0.14 + shadowRatio * 0.12 : 0.04 + shadowRatio * 0.07
  const shadowMdAlpha = options.dark ? 0.22 + shadowRatio * 0.18 : 0.08 + shadowRatio * 0.1

  return {
    "--aoi-accent-60": options.accentScale.accent60,
    "--aoi-accent-50": options.accentScale.accent50,
    "--aoi-accent-40": options.accentScale.accent40,
    "--aoi-accent-20": options.accentScale.accent20,
    "--aoi-accent-10": options.accentScale.accent10,
    ...deriveAuxiliaryPalette(accent, strengths.auxiliaryPalette),
    "--aoi-bg": colorMix("var(--aoi-accent-10)", surfaceRatio * (options.dark ? 7 : 8), bgBase),
    "--aoi-surface": colorMix("var(--aoi-accent-10)", surfaceRatio * (options.dark ? 5 : 7), surfaceBase),
    "--aoi-surface-solid": colorMix("var(--aoi-accent-10)", surfaceRatio * (options.dark ? 4 : 3), solidBase),
    "--aoi-surface-muted": colorMix("var(--aoi-accent-10)", surfaceRatio * (options.dark ? 7 : 12), mutedBase),
    "--aoi-border": options.dark
      ? `rgba(192, 241, 248, ${alpha(highContrast ? 0.24 + stateRatio * 0.1 : 0.09 + stateRatio * 0.07)})`
      : `rgba(24, 72, 84, ${alpha(highContrast ? 0.24 + stateRatio * 0.1 : 0.08 + stateRatio * 0.05)})`,
    "--aoi-text": textBase,
    "--aoi-text-muted": textMutedBase,
    "--aoi-icon": iconBase,
    "--aoi-active-color": activeAccent,
    "--aoi-focus": tintColor(accentForState, strengths.stateLayer, options.dark ? 24 : 18, options.dark ? 46 : 40),
    "--aoi-shadow-sm": `0 4px 12px rgba(${shadowColor}, ${alpha(shadowSmAlpha)})`,
    "--aoi-shadow-md": `0 ${Math.round(7 + shadowRatio * 6)}px ${Math.round(18 + shadowRatio * 16)}px rgba(${shadowColor}, ${alpha(shadowMdAlpha)})`,
    "--aoi-card-bg": options.dark
      ? `rgba(255, 255, 255, ${alpha((highContrast ? 0.07 : 0.035) + surfaceRatio * 0.035)})`
      : `rgba(255, 255, 255, ${alpha((highContrast ? 0.74 : 0.44) + surfaceRatio * 0.14)})`,
    "--aoi-control-bg": options.dark
      ? `rgba(255, 255, 255, ${alpha((highContrast ? 0.06 : 0.028) + surfaceRatio * 0.032)})`
      : `rgba(255, 255, 255, ${alpha((highContrast ? 0.7 : 0.38) + surfaceRatio * 0.16)})`,
    "--aoi-state-hover": colorMix(accentForState, hoverMix, stateSurface),
    "--aoi-state-active": colorMix(accentForState, activeMix, stateSurface),
    "--aoi-state-border-active": colorMix(accentForState, borderMix, "var(--aoi-border)"),
    "--aoi-nav-bg": options.dark
      ? `rgba(22, 33, 36, ${alpha(highContrast ? 0.98 : 0.86 + navRatio * 0.04)})`
      : `rgba(255, 255, 255, ${alpha(highContrast ? 0.98 : 0.84 + navRatio * 0.06)})`,
    "--aoi-nav-hover-bg": colorMix(accentForState, navHoverMix, stateSurface),
    "--aoi-nav-pressed-bg": colorMix(accentForState, navPressedMix, stateSurface),
    "--aoi-nav-active-bg": colorMix(accentForState, navActiveMix, stateSurface),
    "--aoi-nav-active-color": activeAccent,
    "--aoi-nav-bg-colorful": options.dark
      ? `linear-gradient(135deg, ${colorMix("var(--aoi-accent-60)", colorfulMix + 6, "var(--aoi-surface-solid)")}, var(--aoi-surface))`
      : `linear-gradient(135deg, ${colorMix("var(--aoi-accent-60)", colorfulMix, "white")}, rgba(255, 255, 255, ${alpha(0.84 + navRatio * 0.08)}))`,
    "--aoi-nav-border-colorful": colorMix(accentForState, 12 + navRatio * 14, "transparent"),
    "--aoi-player-accent": activeAccent,
    "--aoi-player-accent-soft": colorMix("var(--aoi-player-accent)", options.dark ? 10 + surfaceRatio * 10 : 6 + surfaceRatio * 8, "var(--aoi-surface-solid)"),
    "--aoi-player-surface": "var(--aoi-surface-solid)",
    "--aoi-player-surface-muted": colorMix("var(--aoi-surface-muted)", options.dark ? 80 + surfaceRatio * 10 : 82 + surfaceRatio * 8, "var(--aoi-surface-solid)"),
    "--aoi-player-border": colorMix("var(--aoi-border)", options.dark ? 78 + stateRatio * 12 : 74 + stateRatio * 10, options.dark ? "rgba(255, 255, 255, 0.1)" : "rgba(127, 127, 127, 0.16)"),
    "--aoi-player-text": "var(--aoi-text)",
    "--aoi-player-text-muted": "var(--aoi-text-muted)",
    "--md-sys-color-primary": activeAccent,
    "--md-sys-color-on-primary": options.dark ? "#2b1600" : "#ffffff",
    "--md-sys-color-primary-container": options.dark
      ? colorMix("var(--aoi-accent-60)", 28 + materialRatio * 20, "#1f1b16")
      : colorMix("var(--aoi-accent-60)", 8 + materialRatio * 14, "white"),
    "--md-sys-color-on-primary-container": options.dark
      ? colorMix("var(--aoi-accent-10)", 72 + materialRatio * 18, "#ffffff")
      : colorMix("var(--aoi-accent-60)", 52 + materialRatio * 14, "#171000"),
    "--md-sys-color-secondary": colorMix("var(--aoi-secondary-50)", 62 + materialRatio * 18, activeAccent),
    "--md-sys-color-secondary-container": options.dark
      ? colorMix("var(--aoi-secondary-50)", 18 + materialRatio * 14, "#263b48")
      : colorMix("var(--aoi-accent-20)", 58 + materialRatio * 20, "white"),
    "--md-sys-color-on-secondary-container": options.dark
      ? "#d8f3f8"
      : colorMix("var(--aoi-accent-60)", 44 + materialRatio * 12, "#2a1600"),
    "--md-sys-color-surface": "var(--aoi-surface-solid)",
    "--md-sys-color-on-surface": "var(--aoi-text)",
    "--md-sys-color-surface-container-low": "var(--aoi-surface-muted)",
    "--md-sys-color-surface-container": options.dark
      ? colorMix("var(--aoi-accent-10)", surfaceRatio * 6, "#1a272a")
      : "var(--aoi-surface-solid)",
    "--md-sys-color-surface-container-high": options.dark
      ? colorMix("var(--aoi-accent-10)", surfaceRatio * 9, "#243235")
      : colorMix("var(--aoi-accent-10)", surfaceRatio * 16, "#eef8fb"),
    "--md-sys-color-outline": options.dark
      ? `rgba(192, 241, 248, ${alpha(0.17 + stateRatio * 0.1)})`
      : `rgba(24, 72, 84, ${alpha(0.18 + stateRatio * 0.12)})`
  }
}
