import type { AoiRgbaColor } from "./aoiColor"
import {
  aoiRgbaToCss,
  clampAoiColorValue,
  mixAoiRgbaColor,
  normalizeAoiRgbaColor
} from "./aoiColor"

export type AoiAccentDerivedTone = "accent10" | "accent20" | "accent40" | "accent50"

export interface AoiAccentScale {
  accent10: string
  accent20: string
  accent40: string
  accent50: string
  accent60: string
}

export type AoiAccentDerivationStrengths = Record<AoiAccentDerivedTone, number>

export const AOI_ACCENT_DERIVED_TONES = [
  "accent10",
  "accent20",
  "accent40",
  "accent50"
] as const satisfies readonly AoiAccentDerivedTone[]

export const AOI_ACCENT_DERIVATION_STRENGTH_RANGE = {
  min: 40,
  max: 160,
  step: 5,
  default: 100
} as const

export const AOI_ACCENT_DERIVATION_DEFAULTS: AoiAccentDerivationStrengths = {
  accent10: AOI_ACCENT_DERIVATION_STRENGTH_RANGE.default,
  accent20: AOI_ACCENT_DERIVATION_STRENGTH_RANGE.default,
  accent40: AOI_ACCENT_DERIVATION_STRENGTH_RANGE.default,
  accent50: AOI_ACCENT_DERIVATION_STRENGTH_RANGE.default
}

const AOI_ACCENT_WHITE_MIX: Record<AoiAccentDerivedTone, number> = {
  accent10: 0.9,
  accent20: 0.76,
  accent40: 0.42,
  accent50: 0.18
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value)
}

export function clampAoiAccentDerivationStrength(value: unknown, fallback: number = AOI_ACCENT_DERIVATION_STRENGTH_RANGE.default) {
  const numeric = Number(value)
  const range = AOI_ACCENT_DERIVATION_STRENGTH_RANGE

  if (!Number.isFinite(numeric)) {
    return clampAoiAccentDerivationStrength(fallback, range.default)
  }

  const clamped = clampAoiColorValue(numeric, range.min, range.max)
  const stepped = range.min + Math.round((clamped - range.min) / range.step) * range.step

  return clampAoiColorValue(stepped, range.min, range.max)
}

export function normalizeAoiAccentDerivationStrengths(
  value: unknown,
  fallback: AoiAccentDerivationStrengths = AOI_ACCENT_DERIVATION_DEFAULTS
): AoiAccentDerivationStrengths {
  const candidate = isRecord(value) ? value : {}

  return {
    accent10: clampAoiAccentDerivationStrength(candidate.accent10, fallback.accent10),
    accent20: clampAoiAccentDerivationStrength(candidate.accent20, fallback.accent20),
    accent40: clampAoiAccentDerivationStrength(candidate.accent40, fallback.accent40),
    accent50: clampAoiAccentDerivationStrength(candidate.accent50, fallback.accent50)
  }
}

export function isDefaultAoiAccentDerivationStrengths(value: unknown) {
  const strengths = normalizeAoiAccentDerivationStrengths(value)

  return AOI_ACCENT_DERIVED_TONES.every((tone) => strengths[tone] === AOI_ACCENT_DERIVATION_STRENGTH_RANGE.default)
}

function whiteMixForStrength(tone: AoiAccentDerivedTone, strengths: AoiAccentDerivationStrengths) {
  const baseMix = AOI_ACCENT_WHITE_MIX[tone]
  const strength = strengths[tone] / AOI_ACCENT_DERIVATION_STRENGTH_RANGE.default

  return clampAoiColorValue(1 - (1 - baseMix) * strength, 0, 1)
}

function mixRgbaWithWhite(color: AoiRgbaColor, amount: number) {
  const white = { r: 255, g: 255, b: 255, a: color.a }

  return aoiRgbaToCss(mixAoiRgbaColor(color, white, amount))
}

export function createAoiAccentScaleFromColor(
  color: AoiRgbaColor | string,
  strengths: AoiAccentDerivationStrengths = AOI_ACCENT_DERIVATION_DEFAULTS,
  fallback?: AoiRgbaColor
): AoiAccentScale {
  const base = normalizeAoiRgbaColor(color, fallback)
  const normalizedStrengths = normalizeAoiAccentDerivationStrengths(strengths)

  return {
    accent10: mixRgbaWithWhite(base, whiteMixForStrength("accent10", normalizedStrengths)),
    accent20: mixRgbaWithWhite(base, whiteMixForStrength("accent20", normalizedStrengths)),
    accent40: mixRgbaWithWhite(base, whiteMixForStrength("accent40", normalizedStrengths)),
    accent50: mixRgbaWithWhite(base, whiteMixForStrength("accent50", normalizedStrengths)),
    accent60: aoiRgbaToCss(base)
  }
}
