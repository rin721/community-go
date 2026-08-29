import type { AoiSettingDerivationStrengths } from "./aoiSettingDerivation"
import {
  AOI_SETTING_DERIVATION_DEFAULTS,
  aoiDerivationStrengthScale,
  normalizeAoiSettingDerivationStrengths
} from "./aoiSettingDerivation"

export type AoiSpecDensity = "comfortable" | "compact"
export type AoiSpecSize = "small" | "default" | "large"
export type AoiSpecShape = "square" | "soft" | "pill"
export type AoiContentWidthMode = "px" | "percent"
export type AoiContentWidthScope = "content" | "wide"

export interface AoiSpecUnitSettings {
  baseFontPx: number
  spaceUnitPx: number
  radiusUnitPx: number
  controlHeightPx: number
  contentWidthMode: AoiContentWidthMode
  contentWidthPercent: number
  contentMaxWidthPx: number
  contentWideWidthMode: AoiContentWidthMode
  contentWideWidthPercent: number
  contentWideMaxWidthPx: number
  railWidthPx: number
  mobileNavHeightPx: number
  videoGridMinCardWidthPx: number
  settingsCardMinWidthPx: number
}

export const AOI_SPEC_UNIT_KEYS = [
  "baseFontPx",
  "spaceUnitPx",
  "radiusUnitPx",
  "controlHeightPx",
  "contentMaxWidthPx",
  "contentWideMaxWidthPx",
  "railWidthPx",
  "mobileNavHeightPx",
  "videoGridMinCardWidthPx",
  "settingsCardMinWidthPx"
] as const

export type AoiSpecUnitKey = typeof AOI_SPEC_UNIT_KEYS[number]
export type AoiContentWidthPercentKey = "contentWidthPercent" | "contentWideWidthPercent"

export interface AoiSpecDeriveOptions {
  density: AoiSpecDensity
  shape: AoiSpecShape
  size: AoiSpecSize
  strengths?: Partial<AoiSettingDerivationStrengths>
}

export interface AoiSpecUnitRange {
  max: number
  min: number
  step: number
}

export const AOI_SPEC_UNIT_DEFAULTS: AoiSpecUnitSettings = {
  baseFontPx: 14,
  spaceUnitPx: 8,
  radiusUnitPx: 4,
  controlHeightPx: 40,
  contentWidthMode: "percent",
  contentWidthPercent: 100,
  contentMaxWidthPx: 1280,
  contentWideWidthMode: "percent",
  contentWideWidthPercent: 88,
  contentWideMaxWidthPx: 1360,
  railWidthPx: 56,
  mobileNavHeightPx: 56,
  videoGridMinCardWidthPx: 224,
  settingsCardMinWidthPx: 170
}

export const AOI_SPEC_UNIT_RANGES: Record<AoiSpecUnitKey, AoiSpecUnitRange> = {
  baseFontPx: { min: 12, max: 18, step: 1 },
  spaceUnitPx: { min: 6, max: 12, step: 1 },
  radiusUnitPx: { min: 2, max: 8, step: 1 },
  controlHeightPx: { min: 34, max: 52, step: 1 },
  contentMaxWidthPx: { min: 960, max: 2400, step: 20 },
  contentWideMaxWidthPx: { min: 960, max: 2560, step: 20 },
  railWidthPx: { min: 48, max: 72, step: 1 },
  mobileNavHeightPx: { min: 52, max: 72, step: 1 },
  videoGridMinCardWidthPx: { min: 184, max: 320, step: 4 },
  settingsCardMinWidthPx: { min: 140, max: 240, step: 4 }
}

export const AOI_CONTENT_WIDTH_PERCENT_RANGES: Record<AoiContentWidthPercentKey, AoiSpecUnitRange> = {
  contentWidthPercent: { min: 72, max: 100, step: 1 },
  contentWideWidthPercent: { min: 70, max: 100, step: 1 }
}

export function isAoiSpecUnitKey(value: unknown): value is AoiSpecUnitKey {
  return typeof value === "string" && AOI_SPEC_UNIT_KEYS.includes(value as AoiSpecUnitKey)
}

export function isAoiContentWidthMode(value: unknown): value is AoiContentWidthMode {
  return value === "px" || value === "percent"
}

export function clampAoiSpecUnit(
  key: AoiSpecUnitKey,
  value: unknown,
  fallback = AOI_SPEC_UNIT_DEFAULTS[key]
) {
  const range = AOI_SPEC_UNIT_RANGES[key]

  if (typeof value !== "number" || !Number.isFinite(value)) {
    return fallback
  }

  return Math.min(range.max, Math.max(range.min, value))
}

export function clampAoiContentWidthPercent(
  key: AoiContentWidthPercentKey,
  value: unknown,
  fallback = AOI_SPEC_UNIT_DEFAULTS[key]
) {
  const range = AOI_CONTENT_WIDTH_PERCENT_RANGES[key]

  if (typeof value !== "number" || !Number.isFinite(value)) {
    return fallback
  }

  return Math.min(range.max, Math.max(range.min, value))
}

export function normalizeAoiSpecUnits(
  value: unknown,
  fallback: AoiSpecUnitSettings = AOI_SPEC_UNIT_DEFAULTS
): AoiSpecUnitSettings {
  const candidate = value && typeof value === "object" && !Array.isArray(value)
    ? value as Partial<AoiSpecUnitSettings>
    : {}
  const fallbackUnits = {
    ...AOI_SPEC_UNIT_DEFAULTS,
    ...fallback
  }
  const units = { ...fallbackUnits }

  AOI_SPEC_UNIT_KEYS.forEach((key) => {
    units[key] = clampAoiSpecUnit(key, candidate[key], fallbackUnits[key])
  })

  units.contentWidthMode = isAoiContentWidthMode(candidate.contentWidthMode)
    ? candidate.contentWidthMode
    : fallbackUnits.contentWidthMode
  units.contentWidthPercent = clampAoiContentWidthPercent(
    "contentWidthPercent",
    candidate.contentWidthPercent,
    fallbackUnits.contentWidthPercent
  )
  units.contentWideWidthMode = isAoiContentWidthMode(candidate.contentWideWidthMode)
    ? candidate.contentWideWidthMode
    : fallbackUnits.contentWideWidthMode
  units.contentWideWidthPercent = clampAoiContentWidthPercent(
    "contentWideWidthPercent",
    candidate.contentWideWidthPercent,
    fallbackUnits.contentWideWidthPercent
  )

  return units
}

function round(value: number) {
  return Math.round(value)
}

function px(value: number) {
  return `${round(value)}px`
}

function pct(value: number) {
  return `${round(value)}%`
}

function scale(value: number, strength: number, amount: number) {
  return value * aoiDerivationStrengthScale(strength, amount)
}

function contentWidthValue(
  units: AoiSpecUnitSettings,
  scope: AoiContentWidthScope,
  strength: number
) {
  const widthScale = aoiDerivationStrengthScale(strength, 0.16)

  if (scope === "wide") {
    return units.contentWideWidthMode === "percent"
      ? pct(Math.min(100, units.contentWideWidthPercent * widthScale))
      : px(units.contentWideMaxWidthPx * widthScale)
  }

  return units.contentWidthMode === "percent"
    ? pct(Math.min(100, units.contentWidthPercent * widthScale))
    : px(units.contentMaxWidthPx * widthScale)
}

function deriveControlVars(units: AoiSpecUnitSettings, size: AoiSpecSize, strength: number) {
  const controlScale = aoiDerivationStrengthScale(strength, 0.22)
  const md = (units.controlHeightPx + (size === "small" ? -4 : size === "large" ? 4 : 0)) * controlScale
  const sm = size === "small" ? md - 6 : size === "large" ? md - 10 : md - 8
  const lg = md + (size === "large" ? 6 : 4)
  const navAction = md + (size === "large" ? 2 : 4)
  const navIcon = (22 + (size === "small" ? -2 : size === "large" ? 2 : 0)) * aoiDerivationStrengthScale(strength, 0.12)
  const bottomLabel = 11 + (size === "small" ? -1 : size === "large" ? 1 : 0)

  return {
    sm,
    md,
    lg,
    iconButton: md,
    navAction,
    navIcon,
    bottomLabel,
    mobileBottomIcon: navIcon - 2
  }
}

function deriveSpacingVars(units: AoiSpecUnitSettings, density: AoiSpecDensity, size: AoiSpecSize, strength: number) {
  const s = scale(units.spaceUnitPx, strength, 0.34)
  const largeComfortable = density === "comfortable" && size === "large"

  if (density === "compact") {
    return {
      pageStart: round(s * 1.75),
      pageEnd: round(units.mobileNavHeightPx - s * 1.5),
      pageMobile: `${px(s * 1.5)} ${px(s * 1.25)} ${px(units.mobileNavHeightPx + s * 2)}`,
      panel: round(s * 1.75),
      row: round(s * 1.25),
      card: round(s * 1.5),
      grid: round(s * 1.5),
      gridCompact: round(s),
      navGroup: round(s),
      navRail: round(s * 1.25)
    }
  }

  return {
    pageStart: round(s * 2.25) + (largeComfortable ? round(s * .5) : 0),
    pageEnd: round(units.mobileNavHeightPx) + (largeComfortable ? round(s) : 0),
    pageMobile: `${px(s * 2 + (largeComfortable ? s * .25 : 0))} ${px(s * 1.5 + (largeComfortable ? s * .25 : 0))} ${px(units.mobileNavHeightPx + s * 2.75 + (largeComfortable ? s * .75 : 0))}`,
    panel: round(s * 2.25) + (largeComfortable ? round(s * .5) : 0),
    row: round(s * 1.5) + (largeComfortable ? round(s * .25) : 0),
    card: round(s * 1.75) + (largeComfortable ? round(s * .25) : 0),
    grid: round(s * 2) + (largeComfortable ? round(s * .25) : 0),
    gridCompact: round(s * 1.5) + (largeComfortable ? round(s * .25) : 0),
    navGroup: round(s * 1.25) + (largeComfortable ? round(s * .125) : 0),
    navRail: round(s * 1.5) + (largeComfortable ? round(s * .25) : 0)
  }
}

function deriveRadiusVars(units: AoiSpecUnitSettings, shape: AoiSpecShape, strength: number) {
  const r = scale(units.radiusUnitPx, strength, 0.62)

  if (shape === "square") {
    return {
      container: round(r),
      card: round(Math.max(2, r - 1)),
      control: round(Math.max(2, r * .5)),
      field: round(Math.max(2, r * .5)),
      choice: round(r),
      xs: round(Math.max(2, r * .5))
    }
  }

  if (shape === "pill") {
    return {
      container: round(r * 5),
      card: round(r * 3.5),
      control: 999,
      field: round(r * 3.5),
      choice: round(r * 4),
      xs: round(r * 2.5)
    }
  }

  return {
    container: round(r * 3),
    card: round(r * 2),
    control: round(r * 1.5),
    field: round(r * 1.5),
    choice: round(r * 2.5),
    xs: round(r)
  }
}

export function createAoiSpecCssVars(input: AoiSpecUnitSettings, options: AoiSpecDeriveOptions) {
  const units = normalizeAoiSpecUnits(input)
  const strengths = normalizeAoiSettingDerivationStrengths({
    ...AOI_SETTING_DERIVATION_DEFAULTS,
    ...options.strengths
  })
  const controls = deriveControlVars(units, options.size, strengths.controls)
  const spacing = deriveSpacingVars(units, options.density, options.size, strengths.spacing)
  const radius = deriveRadiusVars(units, options.shape, strengths.radius)
  const baseFont = (units.baseFontPx + (options.size === "small" ? -1 : options.size === "large" ? 1 : 0))
    * aoiDerivationStrengthScale(strengths.typography, 0.14)
  const mediaGridScale = aoiDerivationStrengthScale(strengths.mediaGrid, 0.14)
  const settingsLayoutScale = aoiDerivationStrengthScale(strengths.settingsLayout, 0.14)

  return {
    "--aoi-content-max-width": contentWidthValue(units, "content", strengths.contentWidth),
    "--aoi-content-wide-max-width": contentWidthValue(units, "wide", strengths.contentWidth),
    "--aoi-base-font-size": px(baseFont),
    "--aoi-page-padding-block-start": px(spacing.pageStart),
    "--aoi-page-padding-block-end": px(spacing.pageEnd),
    "--aoi-page-padding-inline": "5vw",
    "--aoi-page-padding-mobile": spacing.pageMobile,
    "--aoi-panel-padding": px(spacing.panel),
    "--aoi-row-padding": px(spacing.row),
    "--aoi-card-padding": px(spacing.card),
    "--aoi-grid-gap": px(spacing.grid),
    "--aoi-grid-gap-compact": px(spacing.gridCompact),
    "--aoi-radius-container": px(radius.container),
    "--aoi-radius-card": px(radius.card),
    "--aoi-radius-control": px(radius.control),
    "--aoi-radius-field": px(radius.field),
    "--aoi-radius-choice": px(radius.choice),
    "--aoi-radius-xs": px(radius.xs),
    "--aoi-control-height-sm": px(controls.sm),
    "--aoi-control-height-md": px(controls.md),
    "--aoi-control-height-lg": px(controls.lg),
    "--aoi-icon-button-size": px(controls.iconButton),
    "--aoi-nav-action-size": px(controls.navAction),
    "--aoi-nav-icon-size": px(controls.navIcon),
    "--aoi-nav-group-gap": px(spacing.navGroup),
    "--aoi-nav-rail-padding-block": px(spacing.navRail),
    "--aoi-bottom-nav-label-size": px(controls.bottomLabel),
    "--aoi-bottom-nav-icon-size": px(controls.mobileBottomIcon),
    "--aoi-rail-width": px(units.railWidthPx),
    "--aoi-mobile-nav-height": px(units.mobileNavHeightPx),
    "--aoi-settings-sticky-top": px(spacing.pageStart),
    "--aoi-settings-mobile-sticky-top": `calc(${px(units.mobileNavHeightPx)} + ${px(units.spaceUnitPx)})`,
    "--aoi-settings-anchor-offset": `calc(${px(spacing.pageStart)} + ${px(spacing.grid)})`,
    "--aoi-settings-card-min-width": px(units.settingsCardMinWidthPx * settingsLayoutScale),
    "--aoi-settings-control-min-width": px((units.settingsCardMinWidthPx + 10) * settingsLayoutScale),
    "--aoi-settings-shell-nav-min-width": px((units.settingsCardMinWidthPx + 70) * settingsLayoutScale),
    "--aoi-settings-shell-nav-width": px((units.settingsCardMinWidthPx + 118) * settingsLayoutScale),
    "--aoi-settings-shell-gap": px(spacing.grid + round(units.spaceUnitPx * .5)),
    "--aoi-settings-shell-mark-size": px(controls.iconButton - 2),
    "--aoi-settings-shell-title-size": px(baseFont + 10),
    "--aoi-settings-shell-mobile-title-size": px(baseFont + 8),
    "--aoi-settings-panel-icon-size": px(controls.md - 6),
    "--aoi-settings-panel-title-size": px(baseFont + 3),
    "--aoi-settings-nav-item-height": px(controls.md),
    "--aoi-settings-nav-item-mobile-height": px(Math.max(controls.sm + 4, 32)),
    "--aoi-video-grid-min-card-width": px(units.videoGridMinCardWidthPx * mediaGridScale),
    "--aoi-video-grid-row-gap": px(spacing.panel),
    "--aoi-video-grid-column-gap": px(spacing.grid),
    "--aoi-video-grid-mobile-row-gap": px(spacing.card),
    "--aoi-video-grid-mobile-column-gap": px(spacing.navGroup),
    "--aoi-category-tabs-bleed": px(spacing.navGroup),
    "--aoi-category-tabs-mobile-bleed": px(spacing.row),
    "--aoi-rubber-band-edge-size": px(units.mobileNavHeightPx),
    "--aoi-nav-surface-blur": px(units.spaceUnitPx * 2.25),
    "--aoi-mobile-header-padding-inline": px(spacing.row),
    "--aoi-mobile-header-brand-size": px(baseFont + 6),
    "--aoi-bottom-nav-padding": `${px(units.spaceUnitPx * .625)} ${px(units.spaceUnitPx)} ${px(units.spaceUnitPx * .75)}`,
    "--aoi-bottom-nav-item-gap": px(units.spaceUnitPx * .25),
    "--aoi-bottom-nav-icon-min-height": px(controls.mobileBottomIcon + 2),
    "--aoi-bottom-nav-label-padding-inline": px(units.spaceUnitPx * .375),
    "--aoi-focus-ring-width": "3px",
    "--aoi-focus-ring-offset": "3px"
  }
}
