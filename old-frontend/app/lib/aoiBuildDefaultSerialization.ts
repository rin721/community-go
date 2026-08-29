import type { AoiRgbaColor } from "../utils/aoiColor"
import {
  AOI_DANMAKU_DEFAULTS
} from "../utils/aoiDanmaku"
import type { AoiAccentPresetCards } from "../utils/aoiAccentPresets"
import {
  normalizeAoiAccentPresetCards
} from "../utils/aoiAccentPresets"
import {
  normalizeAoiRgbaColor
} from "../utils/aoiColor"
import type { AoiAccentDerivationStrengths } from "../utils/aoiAccentDerivation"
import {
  AOI_ACCENT_DERIVATION_DEFAULTS,
  normalizeAoiAccentDerivationStrengths
} from "../utils/aoiAccentDerivation"
import type {
  AoiDerivationPreset,
  AoiSettingDerivationStrengths
} from "../utils/aoiSettingDerivation"
import {
  AOI_SETTING_DERIVATION_DEFAULTS,
  isAoiDerivationPreset,
  normalizeAoiSettingDerivationStrengths
} from "../utils/aoiSettingDerivation"
import {
  AOI_REVEAL_DEFAULTS,
  clampAoiRevealSetting,
  isAoiRevealMotionEffect,
  isAoiRevealMotionReplay
} from "../utils/aoiReveal"
import {
  AOI_ROUTE_PROGRESS_DEFAULTS,
  clampAoiRouteProgressSetting,
  isAoiRouteProgressEasing
} from "../utils/aoiRouteProgress"
import {
  AOI_SCROLL_DEFAULTS,
  clampAoiScrollSetting,
  isAoiPageScrollbarStrategy,
  isAoiScrollHijackMode,
  isAoiScrollSnapMode
} from "../utils/aoiScroll"
import {
  AOI_SPEC_UNIT_DEFAULTS,
  normalizeAoiSpecUnits
} from "../utils/aoiSpecUnits"
import type { AoiSpecUnitSettings } from "../utils/aoiSpecUnits"

export type AoiBuildPreferredTheme = "system" | "light" | "dark"
export type AoiBuildAccentMode = "preset" | "custom"
export type AoiBuildDataMode = "economy" | "standard" | "turbo"
export type AoiBuildLocale = "zh-CN" | "en" | "ja"
export type AoiBuildAppearanceDensity = "comfortable" | "compact"
export type AoiBuildAppearanceSize = "small" | "default" | "large"
export type AoiBuildAppearanceShape = "square" | "soft" | "pill"
export type AoiBuildAppearanceContrast = "normal" | "high"
export type AoiBuildSettingsDisplayDepth = "basic" | "all"

export interface AoiBuildDefaultAppSettings {
  accentDerivationStrengths: AoiAccentDerivationStrengths
  accentMode: AoiBuildAccentMode
  accentPreset: string
  accentPresetCards: AoiAccentPresetCards
  appearanceContrast: AoiBuildAppearanceContrast
  appearanceDensity: AoiBuildAppearanceDensity
  appearanceShape: AoiBuildAppearanceShape
  appearanceSize: AoiBuildAppearanceSize
  backgroundBlur: number
  backgroundDim: number
  backgroundOpacity: number
  colorfulNavigation: boolean
  customAccent: AoiRgbaColor
  danmakuBlocklist: string
  danmakuBottomModeEnabled: boolean
  danmakuEnabled: boolean
  danmakuFontScale: number
  danmakuOpacity: number
  danmakuScrollModeEnabled: boolean
  danmakuSpeed: number
  danmakuTopModeEnabled: boolean
  danmakuVisibleArea: number
  dataMode: AoiBuildDataMode
  derivationPreset: AoiDerivationPreset
  disableWatchHistory: boolean
  hideRecentSearches: boolean
  locale: AoiBuildLocale
  noRelatedVideos: boolean
  noSearchRecommendations: boolean
  openVideosInNewTab: boolean
  pageScrollbarStrategy: string
  preferredTheme: AoiBuildPreferredTheme
  revealMotionDistancePx: number
  revealMotionDurationMs: number
  revealMotionEffect: string
  revealMotionEnabled: boolean
  revealMotionMaxDelayMs: number
  revealMotionReplay: string
  revealMotionStaggerMs: number
  routeProgressDelayMs: number
  routeProgressEasing: string
  routeProgressEnabled: boolean
  routeProgressHeightPx: number
  routeProgressMinimum: number
  routeProgressShowSpinner: boolean
  routeProgressSpeedMs: number
  routeProgressTrickle: boolean
  routeProgressTrickleSpeedMs: number
  rubberBandEnabled: boolean
  rubberBandMaxOffsetPx: number
  rubberBandStrength: number
  scrollHijackEnabled: boolean
  scrollHijackMode: string
  scrollHijackThresholdPx: number
  scrollSnapEnabled: boolean
  scrollSnapMode: string
  scrollSnapStrength: number
  settingsDisplayDepth: AoiBuildSettingsDisplayDepth
  settingDerivationStrengths: AoiSettingDerivationStrengths
  smoothScrollDamping: number
  smoothScrollDurationMs: number
  smoothScrollEnabled: boolean
  specUnits: AoiSpecUnitSettings
  useRelativeDates: boolean
}

const DEFAULT_CUSTOM_ACCENT: AoiRgbaColor = { r: 255, g: 125, b: 82, a: 1 }

export const AOI_BUILD_DEFAULT_CONFIG_PATHS = {
  active: "app/config/aoi-build-defaults.ts",
  manifest: "app/config/aoi-build-default-profiles/manifest.json",
  original: "app/config/aoi-build-defaults.original.ts",
  originalsDir: "app/config/aoi-build-default-profiles/original",
  profilesDir: "app/config/aoi-build-default-profiles/profiles"
} as const

export const AOI_FALLBACK_BUILD_DEFAULT_APP_SETTINGS: AoiBuildDefaultAppSettings = {
  accentDerivationStrengths: AOI_ACCENT_DERIVATION_DEFAULTS,
  accentMode: "preset",
  accentPreset: "sunflower-orange",
  accentPresetCards: {},
  appearanceContrast: "normal",
  appearanceDensity: "comfortable",
  appearanceShape: "soft",
  appearanceSize: "default",
  backgroundBlur: 0,
  backgroundDim: 0.18,
  backgroundOpacity: 0.56,
  colorfulNavigation: false,
  customAccent: DEFAULT_CUSTOM_ACCENT,
  danmakuBlocklist: AOI_DANMAKU_DEFAULTS.blocklist,
  danmakuBottomModeEnabled: AOI_DANMAKU_DEFAULTS.bottomModeEnabled,
  danmakuEnabled: AOI_DANMAKU_DEFAULTS.enabled,
  danmakuFontScale: AOI_DANMAKU_DEFAULTS.fontScale,
  danmakuOpacity: AOI_DANMAKU_DEFAULTS.opacity,
  danmakuScrollModeEnabled: AOI_DANMAKU_DEFAULTS.scrollModeEnabled,
  danmakuSpeed: AOI_DANMAKU_DEFAULTS.speed,
  danmakuTopModeEnabled: AOI_DANMAKU_DEFAULTS.topModeEnabled,
  danmakuVisibleArea: AOI_DANMAKU_DEFAULTS.visibleArea,
  dataMode: "standard",
  derivationPreset: "balanced",
  disableWatchHistory: false,
  hideRecentSearches: false,
  locale: "zh-CN",
  noRelatedVideos: false,
  noSearchRecommendations: false,
  openVideosInNewTab: false,
  pageScrollbarStrategy: AOI_SCROLL_DEFAULTS.pageScrollbar.strategy,
  preferredTheme: "system",
  revealMotionDistancePx: AOI_REVEAL_DEFAULTS.distancePx,
  revealMotionDurationMs: AOI_REVEAL_DEFAULTS.durationMs,
  revealMotionEffect: AOI_REVEAL_DEFAULTS.effect,
  revealMotionEnabled: AOI_REVEAL_DEFAULTS.enabled,
  revealMotionMaxDelayMs: AOI_REVEAL_DEFAULTS.maxDelayMs,
  revealMotionReplay: AOI_REVEAL_DEFAULTS.replay,
  revealMotionStaggerMs: AOI_REVEAL_DEFAULTS.staggerMs,
  routeProgressDelayMs: AOI_ROUTE_PROGRESS_DEFAULTS.delayMs,
  routeProgressEasing: AOI_ROUTE_PROGRESS_DEFAULTS.easing,
  routeProgressEnabled: AOI_ROUTE_PROGRESS_DEFAULTS.enabled,
  routeProgressHeightPx: AOI_ROUTE_PROGRESS_DEFAULTS.heightPx,
  routeProgressMinimum: AOI_ROUTE_PROGRESS_DEFAULTS.minimum,
  routeProgressShowSpinner: AOI_ROUTE_PROGRESS_DEFAULTS.showSpinner,
  routeProgressSpeedMs: AOI_ROUTE_PROGRESS_DEFAULTS.speedMs,
  routeProgressTrickle: AOI_ROUTE_PROGRESS_DEFAULTS.trickle,
  routeProgressTrickleSpeedMs: AOI_ROUTE_PROGRESS_DEFAULTS.trickleSpeedMs,
  rubberBandEnabled: AOI_SCROLL_DEFAULTS.rubberBand.enabled,
  rubberBandMaxOffsetPx: AOI_SCROLL_DEFAULTS.rubberBand.maxOffsetPx,
  rubberBandStrength: AOI_SCROLL_DEFAULTS.rubberBand.strength,
  scrollHijackEnabled: AOI_SCROLL_DEFAULTS.hijack.enabled,
  scrollHijackMode: AOI_SCROLL_DEFAULTS.hijack.mode,
  scrollHijackThresholdPx: AOI_SCROLL_DEFAULTS.hijack.thresholdPx,
  scrollSnapEnabled: AOI_SCROLL_DEFAULTS.snap.enabled,
  scrollSnapMode: AOI_SCROLL_DEFAULTS.snap.mode,
  scrollSnapStrength: AOI_SCROLL_DEFAULTS.snap.strength,
  settingsDisplayDepth: "basic",
  settingDerivationStrengths: AOI_SETTING_DERIVATION_DEFAULTS,
  smoothScrollDamping: AOI_SCROLL_DEFAULTS.smooth.damping,
  smoothScrollDurationMs: AOI_SCROLL_DEFAULTS.smooth.durationMs,
  smoothScrollEnabled: AOI_SCROLL_DEFAULTS.smooth.enabled,
  specUnits: AOI_SPEC_UNIT_DEFAULTS,
  useRelativeDates: false
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value)
}

function clampNumber(value: unknown, min: number, max: number, fallback: number) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return fallback
  }

  return Math.min(max, Math.max(min, value))
}

function isPreferredTheme(value: unknown): value is AoiBuildPreferredTheme {
  return value === "system" || value === "light" || value === "dark"
}

function isAccentMode(value: unknown): value is AoiBuildAccentMode {
  return value === "preset" || value === "custom"
}

function isDataMode(value: unknown): value is AoiBuildDataMode {
  return value === "economy" || value === "standard" || value === "turbo"
}

function isLocale(value: unknown): value is AoiBuildLocale {
  return value === "zh-CN" || value === "en" || value === "ja"
}

function isAppearanceDensity(value: unknown): value is AoiBuildAppearanceDensity {
  return value === "comfortable" || value === "compact"
}

function isAppearanceSize(value: unknown): value is AoiBuildAppearanceSize {
  return value === "small" || value === "default" || value === "large"
}

function isAppearanceShape(value: unknown): value is AoiBuildAppearanceShape {
  return value === "square" || value === "soft" || value === "pill"
}

function isAppearanceContrast(value: unknown): value is AoiBuildAppearanceContrast {
  return value === "normal" || value === "high"
}

function isSettingsDisplayDepth(value: unknown): value is AoiBuildSettingsDisplayDepth {
  return value === "basic" || value === "all"
}

export function normalizeAoiBuildDefaultAppSettings(
  value: unknown,
  fallback: AoiBuildDefaultAppSettings = AOI_FALLBACK_BUILD_DEFAULT_APP_SETTINGS
): AoiBuildDefaultAppSettings {
  const candidate = isRecord(value) ? value : {}
  const candidateSpecUnits = isRecord(candidate.specUnits)
    ? { ...fallback.specUnits, ...candidate.specUnits }
    : fallback.specUnits

  return {
    accentDerivationStrengths: normalizeAoiAccentDerivationStrengths(candidate.accentDerivationStrengths, fallback.accentDerivationStrengths),
    accentMode: isAccentMode(candidate.accentMode) ? candidate.accentMode : fallback.accentMode,
    accentPreset: typeof candidate.accentPreset === "string" && candidate.accentPreset ? candidate.accentPreset : fallback.accentPreset,
    accentPresetCards: normalizeAoiAccentPresetCards(candidate.accentPresetCards || fallback.accentPresetCards),
    appearanceContrast: isAppearanceContrast(candidate.appearanceContrast) ? candidate.appearanceContrast : fallback.appearanceContrast,
    appearanceDensity: isAppearanceDensity(candidate.appearanceDensity) ? candidate.appearanceDensity : fallback.appearanceDensity,
    appearanceShape: isAppearanceShape(candidate.appearanceShape) ? candidate.appearanceShape : fallback.appearanceShape,
    appearanceSize: isAppearanceSize(candidate.appearanceSize) ? candidate.appearanceSize : fallback.appearanceSize,
    backgroundBlur: clampNumber(candidate.backgroundBlur, 0, 24, fallback.backgroundBlur),
    backgroundDim: clampNumber(candidate.backgroundDim, 0, 0.9, fallback.backgroundDim),
    backgroundOpacity: clampNumber(candidate.backgroundOpacity, 0, 1, fallback.backgroundOpacity),
    colorfulNavigation: typeof candidate.colorfulNavigation === "boolean" ? candidate.colorfulNavigation : fallback.colorfulNavigation,
    customAccent: normalizeAoiRgbaColor(candidate.customAccent, fallback.customAccent || DEFAULT_CUSTOM_ACCENT),
    danmakuBlocklist: typeof candidate.danmakuBlocklist === "string" ? candidate.danmakuBlocklist.slice(0, 2000) : fallback.danmakuBlocklist,
    danmakuBottomModeEnabled: typeof candidate.danmakuBottomModeEnabled === "boolean" ? candidate.danmakuBottomModeEnabled : fallback.danmakuBottomModeEnabled,
    danmakuEnabled: typeof candidate.danmakuEnabled === "boolean" ? candidate.danmakuEnabled : fallback.danmakuEnabled,
    danmakuFontScale: clampNumber(candidate.danmakuFontScale, 0.7, 1.6, fallback.danmakuFontScale),
    danmakuOpacity: clampNumber(candidate.danmakuOpacity, 0.2, 1, fallback.danmakuOpacity),
    danmakuScrollModeEnabled: typeof candidate.danmakuScrollModeEnabled === "boolean" ? candidate.danmakuScrollModeEnabled : fallback.danmakuScrollModeEnabled,
    danmakuSpeed: clampNumber(candidate.danmakuSpeed, 0.5, 2, fallback.danmakuSpeed),
    danmakuTopModeEnabled: typeof candidate.danmakuTopModeEnabled === "boolean" ? candidate.danmakuTopModeEnabled : fallback.danmakuTopModeEnabled,
    danmakuVisibleArea: clampNumber(candidate.danmakuVisibleArea, 20, 100, fallback.danmakuVisibleArea),
    dataMode: isDataMode(candidate.dataMode) ? candidate.dataMode : fallback.dataMode,
    derivationPreset: isAoiDerivationPreset(candidate.derivationPreset) ? candidate.derivationPreset : fallback.derivationPreset,
    disableWatchHistory: typeof candidate.disableWatchHistory === "boolean" ? candidate.disableWatchHistory : fallback.disableWatchHistory,
    hideRecentSearches: typeof candidate.hideRecentSearches === "boolean" ? candidate.hideRecentSearches : fallback.hideRecentSearches,
    locale: isLocale(candidate.locale) ? candidate.locale : fallback.locale,
    noRelatedVideos: typeof candidate.noRelatedVideos === "boolean" ? candidate.noRelatedVideos : fallback.noRelatedVideos,
    noSearchRecommendations: typeof candidate.noSearchRecommendations === "boolean" ? candidate.noSearchRecommendations : fallback.noSearchRecommendations,
    openVideosInNewTab: typeof candidate.openVideosInNewTab === "boolean" ? candidate.openVideosInNewTab : fallback.openVideosInNewTab,
    pageScrollbarStrategy: isAoiPageScrollbarStrategy(candidate.pageScrollbarStrategy) ? candidate.pageScrollbarStrategy : fallback.pageScrollbarStrategy,
    preferredTheme: isPreferredTheme(candidate.preferredTheme) ? candidate.preferredTheme : fallback.preferredTheme,
    revealMotionDistancePx: clampAoiRevealSetting(candidate.revealMotionDistancePx, 0, 48, fallback.revealMotionDistancePx),
    revealMotionDurationMs: clampAoiRevealSetting(candidate.revealMotionDurationMs, 120, 800, fallback.revealMotionDurationMs),
    revealMotionEffect: isAoiRevealMotionEffect(candidate.revealMotionEffect) ? candidate.revealMotionEffect : fallback.revealMotionEffect,
    revealMotionEnabled: typeof candidate.revealMotionEnabled === "boolean" ? candidate.revealMotionEnabled : fallback.revealMotionEnabled,
    revealMotionMaxDelayMs: clampAoiRevealSetting(candidate.revealMotionMaxDelayMs, 0, 600, fallback.revealMotionMaxDelayMs),
    revealMotionReplay: isAoiRevealMotionReplay(candidate.revealMotionReplay) ? candidate.revealMotionReplay : fallback.revealMotionReplay,
    revealMotionStaggerMs: clampAoiRevealSetting(candidate.revealMotionStaggerMs, 0, 120, fallback.revealMotionStaggerMs),
    routeProgressDelayMs: clampAoiRouteProgressSetting(candidate.routeProgressDelayMs, 0, 600, fallback.routeProgressDelayMs),
    routeProgressEasing: isAoiRouteProgressEasing(candidate.routeProgressEasing) ? candidate.routeProgressEasing : fallback.routeProgressEasing,
    routeProgressEnabled: typeof candidate.routeProgressEnabled === "boolean" ? candidate.routeProgressEnabled : fallback.routeProgressEnabled,
    routeProgressHeightPx: clampAoiRouteProgressSetting(candidate.routeProgressHeightPx, 1, 8, fallback.routeProgressHeightPx),
    routeProgressMinimum: clampAoiRouteProgressSetting(candidate.routeProgressMinimum, 0, 0.5, fallback.routeProgressMinimum),
    routeProgressShowSpinner: typeof candidate.routeProgressShowSpinner === "boolean" ? candidate.routeProgressShowSpinner : fallback.routeProgressShowSpinner,
    routeProgressSpeedMs: clampAoiRouteProgressSetting(candidate.routeProgressSpeedMs, 80, 800, fallback.routeProgressSpeedMs),
    routeProgressTrickle: typeof candidate.routeProgressTrickle === "boolean" ? candidate.routeProgressTrickle : fallback.routeProgressTrickle,
    routeProgressTrickleSpeedMs: clampAoiRouteProgressSetting(candidate.routeProgressTrickleSpeedMs, 80, 1000, fallback.routeProgressTrickleSpeedMs),
    rubberBandEnabled: typeof candidate.rubberBandEnabled === "boolean" ? candidate.rubberBandEnabled : fallback.rubberBandEnabled,
    rubberBandMaxOffsetPx: clampAoiScrollSetting(candidate.rubberBandMaxOffsetPx, 8, 36, fallback.rubberBandMaxOffsetPx),
    rubberBandStrength: clampAoiScrollSetting(candidate.rubberBandStrength, 0, 100, fallback.rubberBandStrength),
    scrollHijackEnabled: typeof candidate.scrollHijackEnabled === "boolean" ? candidate.scrollHijackEnabled : fallback.scrollHijackEnabled,
    scrollHijackMode: isAoiScrollHijackMode(candidate.scrollHijackMode) ? candidate.scrollHijackMode : fallback.scrollHijackMode,
    scrollHijackThresholdPx: clampAoiScrollSetting(candidate.scrollHijackThresholdPx, 24, 180, fallback.scrollHijackThresholdPx),
    scrollSnapEnabled: typeof candidate.scrollSnapEnabled === "boolean" ? candidate.scrollSnapEnabled : fallback.scrollSnapEnabled,
    scrollSnapMode: isAoiScrollSnapMode(candidate.scrollSnapMode) ? candidate.scrollSnapMode : fallback.scrollSnapMode,
    scrollSnapStrength: clampAoiScrollSetting(candidate.scrollSnapStrength, 0, 100, fallback.scrollSnapStrength),
    settingsDisplayDepth: isSettingsDisplayDepth(candidate.settingsDisplayDepth) ? candidate.settingsDisplayDepth : fallback.settingsDisplayDepth,
    settingDerivationStrengths: normalizeAoiSettingDerivationStrengths(candidate.settingDerivationStrengths, fallback.settingDerivationStrengths),
    smoothScrollDamping: clampAoiScrollSetting(candidate.smoothScrollDamping, 0.04, 0.22, fallback.smoothScrollDamping),
    smoothScrollDurationMs: clampAoiScrollSetting(candidate.smoothScrollDurationMs, 600, 1800, fallback.smoothScrollDurationMs),
    smoothScrollEnabled: typeof candidate.smoothScrollEnabled === "boolean" ? candidate.smoothScrollEnabled : fallback.smoothScrollEnabled,
    specUnits: normalizeAoiSpecUnits(candidateSpecUnits),
    useRelativeDates: typeof candidate.useRelativeDates === "boolean" ? candidate.useRelativeDates : fallback.useRelativeDates
  }
}

export function serializeAoiBuildDefaultConfig(
  settings: AoiBuildDefaultAppSettings,
  exportName = "AOI_BUILD_DEFAULT_APP_SETTINGS"
) {
  const normalized = normalizeAoiBuildDefaultAppSettings(settings)
  const body = JSON.stringify(normalized, null, 2)

  return `import type { AoiBuildDefaultAppSettings } from "../utils/aoiBuildDefaults"\n\nexport const ${exportName} = ${body} satisfies AoiBuildDefaultAppSettings\n`
}
