import type {
  AoiRevealMotionEffect as AoiRevealMotionEffectValue,
  AoiRevealMotionReplay as AoiRevealMotionReplayValue
} from "~/utils/aoiReveal"
import {
  clampAoiRevealSetting,
  isAoiRevealMotionEffect,
  isAoiRevealMotionReplay
} from "~/utils/aoiReveal"
import type {
  AoiPageScrollbarStrategy,
  AoiScrollHijackMode,
  AoiScrollSnapMode
} from "~/utils/aoiScroll"
import {
  clampAoiScrollSetting,
  isAoiPageScrollbarStrategy,
  isAoiScrollHijackMode,
  isAoiScrollSnapMode
} from "~/utils/aoiScroll"
import type { AoiRouteProgressEasing } from "~/utils/aoiRouteProgress"
import {
  AOI_ROUTE_PROGRESS_DELAY_REBASE_MATCH_MS,
  AOI_ROUTE_PROGRESS_SETTINGS_VERSION,
  clampAoiRouteProgressSetting,
  isAoiRouteProgressEasing
} from "~/utils/aoiRouteProgress"
import type {
  AoiContentWidthMode,
  AoiContentWidthScope,
  AoiSpecUnitKey,
  AoiSpecUnitSettings
} from "~/utils/aoiSpecUnits"
import {
  clampAoiContentWidthPercent,
  clampAoiSpecUnit,
  isAoiContentWidthMode,
  normalizeAoiSpecUnits
} from "~/utils/aoiSpecUnits"
import {
  createAoiActiveBuildDefaultAppSettings
} from "~/utils/aoiBuildDefaults"
import type { AoiDanmakuRuntimeSettings } from "~/utils/aoiDanmaku"
import {
  AOI_DANMAKU_DEFAULTS,
  normalizeAoiDanmakuSettings
} from "~/utils/aoiDanmaku"
import type { AoiRgbaColor } from "~/utils/aoiColor"
import {
  aoiRgbaToCss,
  normalizeAoiRgbaColor
} from "~/utils/aoiColor"
import type {
  AoiAccentDerivationStrengths,
  AoiAccentDerivedTone,
  AoiAccentScale
} from "~/utils/aoiAccentDerivation"
import {
  AOI_ACCENT_DERIVATION_DEFAULTS,
  clampAoiAccentDerivationStrength,
  createAoiAccentScaleFromColor,
  isDefaultAoiAccentDerivationStrengths,
  normalizeAoiAccentDerivationStrengths
} from "~/utils/aoiAccentDerivation"
import type {
  AoiDerivationPreset,
  AoiSettingDerivationStrengthKey,
  AoiSettingDerivationStrengths
} from "~/utils/aoiSettingDerivation"
import {
  AOI_SETTING_DERIVATION_DEFAULTS,
  aoiDerivationStrengthScale,
  clampAoiSettingDerivationStrength,
  createAoiSettingDerivationStrengthsForPreset,
  deriveAoiSettingNumber,
  deriveAoiSettingPercent,
  isAoiDerivationPreset,
  normalizeAoiSettingDerivationStrengths
} from "~/utils/aoiSettingDerivation"
import {
  AOI_ACCENT_PRESETS,
  createAoiAccentPresetCardOptions,
  normalizeAoiAccentPresetCards
} from "~/utils/aoiAccentPresets"
import {
  AOI_ALL_CATEGORY,
  normalizeCommunityCategorySelection
} from "~/utils/communityCategories"

export type AoiPreferredTheme = "system" | "light" | "dark"
export type AoiAccentMode = "preset" | "custom"
export type AoiDataMode = "economy" | "standard" | "turbo"
export type AoiLocale = "zh-CN" | "en" | "ja"
export type AoiAppearanceDensity = "comfortable" | "compact"
export type AoiAppearanceSize = "small" | "default" | "large"
export type AoiAppearanceShape = "square" | "soft" | "pill"
export type AoiAppearanceContrast = "normal" | "high"
export type AoiSettingsDisplayDepth = "basic" | "all"

interface PersistedAppSettings {
  accentDerivationStrengths: AoiAccentDerivationStrengths
  accentMode: AoiAccentMode
  accentPreset: string
  appearanceContrast: AoiAppearanceContrast
  appearanceDensity: AoiAppearanceDensity
  appearanceShape: AoiAppearanceShape
  appearanceSize: AoiAppearanceSize
  backgroundBlur: number
  backgroundDim: number
  backgroundFileName: string
  backgroundFileSize: number
  backgroundImageId: string | null
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
  dataMode: AoiDataMode
  derivationPreset: AoiDerivationPreset
  disableWatchHistory: boolean
  hideRecentSearches: boolean
  locale: AoiLocale
  noRelatedVideos: boolean
  noSearchRecommendations: boolean
  openVideosInNewTab: boolean
  pageScrollbarStrategy: AoiPageScrollbarStrategy
  preferredTheme: AoiPreferredTheme
  revealMotionDistancePx: number
  revealMotionDurationMs: number
  revealMotionEffect: AoiRevealMotionEffectValue
  revealMotionEnabled: boolean
  revealMotionMaxDelayMs: number
  revealMotionReplay: AoiRevealMotionReplayValue
  revealMotionStaggerMs: number
  routeProgressDelayMs: number
  routeProgressDelayMigrated: boolean
  routeProgressEasing: AoiRouteProgressEasing
  routeProgressEnabled: boolean
  routeProgressHeightPx: number
  routeProgressMinimum: number
  routeProgressSettingsVersion: number
  routeProgressShowSpinner: boolean
  routeProgressSpeedMs: number
  routeProgressTrickle: boolean
  routeProgressTrickleSpeedMs: number
  rubberBandEnabled: boolean
  rubberBandMaxOffsetPx: number
  rubberBandStrength: number
  scrollHijackEnabled: boolean
  scrollHijackMode: AoiScrollHijackMode
  scrollHijackThresholdPx: number
  scrollSnapEnabled: boolean
  scrollSnapMode: AoiScrollSnapMode
  scrollSnapStrength: number
  selectedCategory: string
  settingsDisplayDepth: AoiSettingsDisplayDepth
  settingDerivationStrengths: AoiSettingDerivationStrengths
  smoothScrollDamping: number
  smoothScrollDurationMs: number
  smoothScrollEnabled: boolean
  specUnits: AoiSpecUnitSettings
  useRelativeDates: boolean
}

export const AOI_BACKGROUND_DB_NAME = "aoi-settings"
export const AOI_BACKGROUND_STORE_NAME = "backgrounds"
export const AOI_BACKGROUND_CURRENT_KEY = "aoi.background.current"
export const AOI_BACKGROUND_MAX_BYTES = 8 * 1024 * 1024
export const AOI_BACKGROUND_TYPES = ["image/png", "image/jpeg", "image/webp"]

const STORAGE_KEY = "aoi.appSettings.v1"
const DEFAULT_ACCENT_PRESET = "sunflower-orange"
export const AOI_DEFAULT_CUSTOM_ACCENT: AoiRgbaColor = { r: 255, g: 125, b: 82, a: 1 }
const DEFAULT_ACCENT = AOI_DEFAULT_CUSTOM_ACCENT
const DEFAULT_ACCENT_PRESET_OPTION = AOI_ACCENT_PRESETS.find((preset) => preset.value === DEFAULT_ACCENT_PRESET) || AOI_ACCENT_PRESETS[0]!

function emptyState(): PersistedAppSettings {
  const defaults = createAoiActiveBuildDefaultAppSettings()

  return {
    accentDerivationStrengths: normalizeAoiAccentDerivationStrengths(defaults.accentDerivationStrengths),
    accentMode: defaults.accentMode,
    accentPreset: defaults.accentPreset,
    appearanceContrast: defaults.appearanceContrast,
    appearanceDensity: defaults.appearanceDensity,
    appearanceShape: defaults.appearanceShape,
    appearanceSize: defaults.appearanceSize,
    backgroundBlur: defaults.backgroundBlur,
    backgroundDim: defaults.backgroundDim,
    backgroundFileName: "",
    backgroundFileSize: 0,
    backgroundImageId: null,
    backgroundOpacity: defaults.backgroundOpacity,
    colorfulNavigation: defaults.colorfulNavigation,
    customAccent: { ...defaults.customAccent },
    danmakuBlocklist: defaults.danmakuBlocklist,
    danmakuBottomModeEnabled: defaults.danmakuBottomModeEnabled,
    danmakuEnabled: defaults.danmakuEnabled,
    danmakuFontScale: defaults.danmakuFontScale,
    danmakuOpacity: defaults.danmakuOpacity,
    danmakuScrollModeEnabled: defaults.danmakuScrollModeEnabled,
    danmakuSpeed: defaults.danmakuSpeed,
    danmakuTopModeEnabled: defaults.danmakuTopModeEnabled,
    danmakuVisibleArea: defaults.danmakuVisibleArea,
    dataMode: defaults.dataMode,
    derivationPreset: defaults.derivationPreset,
    disableWatchHistory: defaults.disableWatchHistory,
    hideRecentSearches: defaults.hideRecentSearches,
    locale: defaults.locale,
    noRelatedVideos: defaults.noRelatedVideos,
    noSearchRecommendations: defaults.noSearchRecommendations,
    openVideosInNewTab: defaults.openVideosInNewTab,
    pageScrollbarStrategy: defaults.pageScrollbarStrategy as AoiPageScrollbarStrategy,
    preferredTheme: defaults.preferredTheme,
    revealMotionDistancePx: defaults.revealMotionDistancePx,
    revealMotionDurationMs: defaults.revealMotionDurationMs,
    revealMotionEffect: defaults.revealMotionEffect as AoiRevealMotionEffectValue,
    revealMotionEnabled: defaults.revealMotionEnabled,
    revealMotionMaxDelayMs: defaults.revealMotionMaxDelayMs,
    revealMotionReplay: defaults.revealMotionReplay as AoiRevealMotionReplayValue,
    revealMotionStaggerMs: defaults.revealMotionStaggerMs,
    routeProgressDelayMs: defaults.routeProgressDelayMs,
    routeProgressDelayMigrated: true,
    routeProgressEasing: defaults.routeProgressEasing as AoiRouteProgressEasing,
    routeProgressEnabled: defaults.routeProgressEnabled,
    routeProgressHeightPx: defaults.routeProgressHeightPx,
    routeProgressMinimum: defaults.routeProgressMinimum,
    routeProgressSettingsVersion: AOI_ROUTE_PROGRESS_SETTINGS_VERSION,
    routeProgressShowSpinner: defaults.routeProgressShowSpinner,
    routeProgressSpeedMs: defaults.routeProgressSpeedMs,
    routeProgressTrickle: defaults.routeProgressTrickle,
    routeProgressTrickleSpeedMs: defaults.routeProgressTrickleSpeedMs,
    rubberBandEnabled: defaults.rubberBandEnabled,
    rubberBandMaxOffsetPx: defaults.rubberBandMaxOffsetPx,
    rubberBandStrength: defaults.rubberBandStrength,
    scrollHijackEnabled: defaults.scrollHijackEnabled,
    scrollHijackMode: defaults.scrollHijackMode as AoiScrollHijackMode,
    scrollHijackThresholdPx: defaults.scrollHijackThresholdPx,
    scrollSnapEnabled: defaults.scrollSnapEnabled,
    scrollSnapMode: defaults.scrollSnapMode as AoiScrollSnapMode,
    scrollSnapStrength: defaults.scrollSnapStrength,
    selectedCategory: AOI_ALL_CATEGORY,
    settingsDisplayDepth: defaults.settingsDisplayDepth,
    settingDerivationStrengths: normalizeAoiSettingDerivationStrengths(defaults.settingDerivationStrengths),
    smoothScrollDamping: defaults.smoothScrollDamping,
    smoothScrollDurationMs: defaults.smoothScrollDurationMs,
    smoothScrollEnabled: defaults.smoothScrollEnabled,
    specUnits: { ...defaults.specUnits },
    useRelativeDates: defaults.useRelativeDates
  }
}

function coercePersistedState(value: unknown): PersistedAppSettings {
  const fallback = emptyState()

  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return fallback
  }

  const candidate = value as Partial<PersistedAppSettings>
  const routeProgressSettingsVersion = typeof candidate.routeProgressSettingsVersion === "number" ? candidate.routeProgressSettingsVersion : 0
  const shouldMigrateRouteProgressDelay = candidate.routeProgressDelayMs === AOI_ROUTE_PROGRESS_DELAY_REBASE_MATCH_MS
    && (candidate.routeProgressDelayMigrated !== true || routeProgressSettingsVersion < AOI_ROUTE_PROGRESS_SETTINGS_VERSION)
  const routeProgressDelayMs = shouldMigrateRouteProgressDelay
    ? fallback.routeProgressDelayMs
    : clampAoiRouteProgressSetting(candidate.routeProgressDelayMs, 0, 600, fallback.routeProgressDelayMs)

  return {
    accentDerivationStrengths: normalizeAoiAccentDerivationStrengths(candidate.accentDerivationStrengths, fallback.accentDerivationStrengths),
    accentMode: candidate.accentMode === "custom" || candidate.accentMode === "preset" ? candidate.accentMode : fallback.accentMode,
    accentPreset: isAccentPreset(candidate.accentPreset) ? candidate.accentPreset : fallback.accentPreset,
    appearanceContrast: isAppearanceContrast(candidate.appearanceContrast) ? candidate.appearanceContrast : fallback.appearanceContrast,
    appearanceDensity: isAppearanceDensity(candidate.appearanceDensity) ? candidate.appearanceDensity : fallback.appearanceDensity,
    appearanceShape: isAppearanceShape(candidate.appearanceShape) ? candidate.appearanceShape : fallback.appearanceShape,
    appearanceSize: isAppearanceSize(candidate.appearanceSize) ? candidate.appearanceSize : fallback.appearanceSize,
    backgroundBlur: clampNumber(candidate.backgroundBlur, 0, 24, fallback.backgroundBlur),
    backgroundDim: clampNumber(candidate.backgroundDim, 0, 0.9, fallback.backgroundDim),
    backgroundFileName: typeof candidate.backgroundFileName === "string" ? candidate.backgroundFileName : "",
    backgroundFileSize: clampNumber(candidate.backgroundFileSize, 0, AOI_BACKGROUND_MAX_BYTES, 0),
    backgroundImageId: typeof candidate.backgroundImageId === "string" ? candidate.backgroundImageId : null,
    backgroundOpacity: clampNumber(candidate.backgroundOpacity, 0, 1, fallback.backgroundOpacity),
    colorfulNavigation: typeof candidate.colorfulNavigation === "boolean" ? candidate.colorfulNavigation : fallback.colorfulNavigation,
    customAccent: normalizeAoiRgbaColor(candidate.customAccent, fallback.customAccent),
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
    routeProgressDelayMs,
    routeProgressDelayMigrated: true,
    routeProgressEasing: isAoiRouteProgressEasing(candidate.routeProgressEasing) ? candidate.routeProgressEasing : fallback.routeProgressEasing,
    routeProgressEnabled: typeof candidate.routeProgressEnabled === "boolean" ? candidate.routeProgressEnabled : fallback.routeProgressEnabled,
    routeProgressHeightPx: clampAoiRouteProgressSetting(candidate.routeProgressHeightPx, 1, 8, fallback.routeProgressHeightPx),
    routeProgressMinimum: clampAoiRouteProgressSetting(candidate.routeProgressMinimum, 0, 0.5, fallback.routeProgressMinimum),
    routeProgressSettingsVersion: AOI_ROUTE_PROGRESS_SETTINGS_VERSION,
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
    selectedCategory: normalizeCommunityCategorySelection(candidate.selectedCategory),
    settingsDisplayDepth: isSettingsDisplayDepth(candidate.settingsDisplayDepth) ? candidate.settingsDisplayDepth : fallback.settingsDisplayDepth,
    settingDerivationStrengths: normalizeAoiSettingDerivationStrengths(candidate.settingDerivationStrengths, fallback.settingDerivationStrengths),
    smoothScrollDamping: clampAoiScrollSetting(candidate.smoothScrollDamping, 0.04, 0.22, fallback.smoothScrollDamping),
    smoothScrollDurationMs: clampAoiScrollSetting(candidate.smoothScrollDurationMs, 600, 1800, fallback.smoothScrollDurationMs),
    smoothScrollEnabled: typeof candidate.smoothScrollEnabled === "boolean" ? candidate.smoothScrollEnabled : fallback.smoothScrollEnabled,
    specUnits: normalizeAoiSpecUnits(candidate.specUnits, fallback.specUnits),
    useRelativeDates: typeof candidate.useRelativeDates === "boolean" ? candidate.useRelativeDates : fallback.useRelativeDates
  }
}

function isPreferredTheme(value: unknown): value is AoiPreferredTheme {
  return value === "system" || value === "light" || value === "dark"
}

function isDataMode(value: unknown): value is AoiDataMode {
  return value === "economy" || value === "standard" || value === "turbo"
}

function isLocale(value: unknown): value is AoiLocale {
  return value === "zh-CN" || value === "en" || value === "ja"
}

function isAppearanceDensity(value: unknown): value is AoiAppearanceDensity {
  return value === "comfortable" || value === "compact"
}

function isAppearanceSize(value: unknown): value is AoiAppearanceSize {
  return value === "small" || value === "default" || value === "large"
}

function isAppearanceShape(value: unknown): value is AoiAppearanceShape {
  return value === "square" || value === "soft" || value === "pill"
}

function isAppearanceContrast(value: unknown): value is AoiAppearanceContrast {
  return value === "normal" || value === "high"
}

function isSettingsDisplayDepth(value: unknown): value is AoiSettingsDisplayDepth {
  return value === "basic" || value === "all"
}

function isAccentPreset(value: unknown): value is string {
  return typeof value === "string" && AOI_ACCENT_PRESETS.some((preset) => preset.value === value)
}

function clampNumber(value: unknown, min: number, max: number, fallback: number) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return fallback
  }

  return Math.min(max, Math.max(min, value))
}

function createAccentDerivationStrengthsFromSettingPreset(preset: AoiDerivationPreset) {
  const value = preset === "custom"
    ? AOI_SETTING_DERIVATION_DEFAULTS.auxiliaryPalette
    : createAoiSettingDerivationStrengthsForPreset(preset).auxiliaryPalette

  return normalizeAoiAccentDerivationStrengths({
    accent10: value,
    accent20: value,
    accent40: value,
    accent50: value
  })
}

function deriveOpacity(value: number, strength: number, min: number, max: number) {
  return deriveAoiSettingNumber(value, strength, {
    amount: 0.18,
    fallback: value,
    max,
    min,
    precision: 2
  })
}

function openBackgroundDb() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(AOI_BACKGROUND_DB_NAME, 1)

    request.onupgradeneeded = () => {
      const db = request.result

      if (!db.objectStoreNames.contains(AOI_BACKGROUND_STORE_NAME)) {
        db.createObjectStore(AOI_BACKGROUND_STORE_NAME)
      }
    }
    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve(request.result)
  })
}

function runBackgroundTransaction<T>(
  mode: IDBTransactionMode,
  operation: (store: IDBObjectStore) => IDBRequest<T>
) {
  return new Promise<T>((resolve, reject) => {
    openBackgroundDb()
      .then((db) => {
        const transaction = db.transaction(AOI_BACKGROUND_STORE_NAME, mode)
        const store = transaction.objectStore(AOI_BACKGROUND_STORE_NAME)
        const request = operation(store)

        request.onerror = () => reject(request.error)
        request.onsuccess = () => resolve(request.result)
        transaction.oncomplete = () => db.close()
        transaction.onerror = () => {
          db.close()
          reject(transaction.error)
        }
      })
      .catch(reject)
  })
}

async function readBackgroundBlob() {
  if (!import.meta.client || !("indexedDB" in window)) {
    return undefined
  }

  return await runBackgroundTransaction<Blob | undefined>("readonly", (store) => store.get(AOI_BACKGROUND_CURRENT_KEY))
}

async function writeBackgroundBlob(blob: Blob) {
  if (!import.meta.client || !("indexedDB" in window)) {
    return
  }

  await runBackgroundTransaction<IDBValidKey>("readwrite", (store) => store.put(blob, AOI_BACKGROUND_CURRENT_KEY))
}

async function deleteBackgroundBlob() {
  if (!import.meta.client || !("indexedDB" in window)) {
    return
  }

  await runBackgroundTransaction<undefined>("readwrite", (store) => store.delete(AOI_BACKGROUND_CURRENT_KEY))
}

export const useAppSettingsStore = defineStore("app-settings", () => {
  const initialState = emptyState()
  const hydrated = ref(false)
  const backgroundError = ref("")
  const backgroundObjectUrl = ref("")
  const selectedCategory = ref(initialState.selectedCategory)
  const settingsDisplayDepth = ref<AoiSettingsDisplayDepth>(initialState.settingsDisplayDepth)
  const preferredTheme = ref<AoiPreferredTheme>(initialState.preferredTheme)
  const locale = ref<AoiLocale>(initialState.locale)
  const appearanceContrast = ref<AoiAppearanceContrast>(initialState.appearanceContrast)
  const appearanceDensity = ref<AoiAppearanceDensity>(initialState.appearanceDensity)
  const appearanceShape = ref<AoiAppearanceShape>(initialState.appearanceShape)
  const appearanceSize = ref<AoiAppearanceSize>(initialState.appearanceSize)
  const accentMode = ref<AoiAccentMode>(initialState.accentMode)
  const accentPreset = ref(initialState.accentPreset)
  const accentPresetCards = ref(normalizeAoiAccentPresetCards(createAoiActiveBuildDefaultAppSettings().accentPresetCards))
  const accentDerivationStrengths = reactive<AoiAccentDerivationStrengths>({ ...initialState.accentDerivationStrengths })
  const derivationPreset = ref<AoiDerivationPreset>(initialState.derivationPreset)
  const settingDerivationStrengths = reactive<AoiSettingDerivationStrengths>({ ...initialState.settingDerivationStrengths })
  const customAccent = ref<AoiRgbaColor>({ ...initialState.customAccent })
  const backgroundImageId = ref<string | null>(initialState.backgroundImageId)
  const backgroundFileName = ref(initialState.backgroundFileName)
  const backgroundFileSize = ref(initialState.backgroundFileSize)
  const backgroundOpacity = ref(initialState.backgroundOpacity)
  const backgroundBlur = ref(initialState.backgroundBlur)
  const backgroundDim = ref(initialState.backgroundDim)
  const colorfulNavigation = ref(initialState.colorfulNavigation)
  const danmakuBlocklist = ref(initialState.danmakuBlocklist)
  const danmakuBottomModeEnabled = ref(initialState.danmakuBottomModeEnabled)
  const danmakuEnabled = ref(initialState.danmakuEnabled)
  const danmakuFontScale = ref(initialState.danmakuFontScale)
  const danmakuOpacity = ref(initialState.danmakuOpacity)
  const danmakuScrollModeEnabled = ref(initialState.danmakuScrollModeEnabled)
  const danmakuSpeed = ref(initialState.danmakuSpeed)
  const danmakuTopModeEnabled = ref(initialState.danmakuTopModeEnabled)
  const danmakuVisibleArea = ref(initialState.danmakuVisibleArea)
  const openVideosInNewTab = ref(initialState.openVideosInNewTab)
  const useRelativeDates = ref(initialState.useRelativeDates)
  const dataMode = ref<AoiDataMode>(initialState.dataMode)
  const hideRecentSearches = ref(initialState.hideRecentSearches)
  const disableWatchHistory = ref(initialState.disableWatchHistory)
  const noSearchRecommendations = ref(initialState.noSearchRecommendations)
  const noRelatedVideos = ref(initialState.noRelatedVideos)
  const pageScrollbarStrategy = ref<AoiPageScrollbarStrategy>(initialState.pageScrollbarStrategy)
  const revealMotionEnabled = ref(initialState.revealMotionEnabled)
  const revealMotionEffect = ref<AoiRevealMotionEffectValue>(initialState.revealMotionEffect)
  const revealMotionReplay = ref<AoiRevealMotionReplayValue>(initialState.revealMotionReplay)
  const revealMotionDurationMs = ref(initialState.revealMotionDurationMs)
  const revealMotionDistancePx = ref(initialState.revealMotionDistancePx)
  const revealMotionStaggerMs = ref(initialState.revealMotionStaggerMs)
  const revealMotionMaxDelayMs = ref(initialState.revealMotionMaxDelayMs)
  const routeProgressDelayMs = ref(initialState.routeProgressDelayMs)
  const routeProgressDelayMigrated = ref(initialState.routeProgressDelayMigrated)
  const routeProgressEasing = ref<AoiRouteProgressEasing>(initialState.routeProgressEasing)
  const routeProgressEnabled = ref(initialState.routeProgressEnabled)
  const routeProgressHeightPx = ref(initialState.routeProgressHeightPx)
  const routeProgressMinimum = ref(initialState.routeProgressMinimum)
  const routeProgressShowSpinner = ref(initialState.routeProgressShowSpinner)
  const routeProgressSpeedMs = ref(initialState.routeProgressSpeedMs)
  const routeProgressTrickle = ref(initialState.routeProgressTrickle)
  const routeProgressTrickleSpeedMs = ref(initialState.routeProgressTrickleSpeedMs)
  const smoothScrollEnabled = ref(initialState.smoothScrollEnabled)
  const smoothScrollDurationMs = ref(initialState.smoothScrollDurationMs)
  const smoothScrollDamping = ref(initialState.smoothScrollDamping)
  const scrollSnapEnabled = ref(initialState.scrollSnapEnabled)
  const scrollSnapMode = ref<AoiScrollSnapMode>(initialState.scrollSnapMode)
  const scrollSnapStrength = ref(initialState.scrollSnapStrength)
  const scrollHijackEnabled = ref(initialState.scrollHijackEnabled)
  const scrollHijackMode = ref<AoiScrollHijackMode>(initialState.scrollHijackMode)
  const scrollHijackThresholdPx = ref(initialState.scrollHijackThresholdPx)
  const rubberBandEnabled = ref(initialState.rubberBandEnabled)
  const rubberBandStrength = ref(initialState.rubberBandStrength)
  const rubberBandMaxOffsetPx = ref(initialState.rubberBandMaxOffsetPx)
  const specUnits = reactive<AoiSpecUnitSettings>({ ...initialState.specUnits })

  const activePreset = computed(() => {
    return AOI_ACCENT_PRESETS.find((preset) => preset.value === accentPreset.value) || DEFAULT_ACCENT_PRESET_OPTION
  })
  const activeAccent = computed(() => accentMode.value === "custom" ? aoiRgbaToCss(customAccent.value) : activePreset.value.accent60)
  const accentScale = computed<AoiAccentScale>(() => {
    if (accentMode.value === "custom") {
      return createAoiAccentScaleFromColor(customAccent.value, accentDerivationStrengths, DEFAULT_ACCENT)
    }

    if (!isDefaultAoiAccentDerivationStrengths(accentDerivationStrengths)) {
      return createAoiAccentScaleFromColor(activePreset.value.accent60, accentDerivationStrengths, DEFAULT_ACCENT)
    }

    return {
      accent10: activePreset.value.accent10,
      accent20: activePreset.value.accent20,
      accent40: activePreset.value.accent40,
      accent50: activePreset.value.accent50,
      accent60: activePreset.value.accent60
    }
  })
  const accentPresetCardOptions = computed(() => createAoiAccentPresetCardOptions(accentPresetCards.value))
  const effectiveRevealMotionSettings = computed(() => ({
    durationMs: deriveAoiSettingNumber(revealMotionDurationMs.value, settingDerivationStrengths.revealMotion, {
      amount: 0.18,
      fallback: revealMotionDurationMs.value,
      max: 800,
      min: 120
    }),
    distancePx: deriveAoiSettingNumber(revealMotionDistancePx.value, settingDerivationStrengths.revealMotion, {
      amount: 0.52,
      fallback: revealMotionDistancePx.value,
      max: 48,
      min: 0
    }),
    effect: revealMotionEffect.value,
    enabled: revealMotionEnabled.value,
    maxDelayMs: deriveAoiSettingNumber(revealMotionMaxDelayMs.value, settingDerivationStrengths.revealMotion, {
      amount: 0.28,
      fallback: revealMotionMaxDelayMs.value,
      max: 600,
      min: 0
    }),
    replay: revealMotionReplay.value,
    staggerMs: deriveAoiSettingNumber(revealMotionStaggerMs.value, settingDerivationStrengths.revealMotion, {
      amount: 0.38,
      fallback: revealMotionStaggerMs.value,
      max: 120,
      min: 0
    })
  }))
  const effectiveRouteProgressSettings = computed(() => ({
    delayMs: routeProgressDelayMs.value,
    easing: routeProgressEasing.value,
    enabled: routeProgressEnabled.value,
    heightPx: deriveAoiSettingNumber(routeProgressHeightPx.value, settingDerivationStrengths.routeProgress, {
      amount: 0.34,
      fallback: routeProgressHeightPx.value,
      max: 8,
      min: 1
    }),
    minimum: deriveAoiSettingNumber(routeProgressMinimum.value, settingDerivationStrengths.routeProgress, {
      amount: 0.42,
      fallback: routeProgressMinimum.value,
      max: 0.5,
      min: 0,
      precision: 2
    }),
    showSpinner: routeProgressShowSpinner.value,
    speedMs: deriveAoiSettingNumber(routeProgressSpeedMs.value, settingDerivationStrengths.routeProgress, {
      amount: 0.16,
      fallback: routeProgressSpeedMs.value,
      inverse: true,
      max: 800,
      min: 80
    }),
    trickle: routeProgressTrickle.value,
    trickleSpeedMs: deriveAoiSettingNumber(routeProgressTrickleSpeedMs.value, settingDerivationStrengths.routeProgress, {
      amount: 0.16,
      fallback: routeProgressTrickleSpeedMs.value,
      inverse: true,
      max: 1000,
      min: 80
    })
  }))
  const effectiveScrollSettings = computed(() => ({
    hijack: {
      enabled: scrollHijackEnabled.value,
      mode: scrollHijackMode.value,
      thresholdPx: deriveAoiSettingNumber(scrollHijackThresholdPx.value, settingDerivationStrengths.scrollHijack, {
        amount: 0.42,
        fallback: scrollHijackThresholdPx.value,
        inverse: true,
        max: 180,
        min: 24
      })
    },
    pageScrollbar: {
      strategy: pageScrollbarStrategy.value
    },
    rubberBand: {
      enabled: rubberBandEnabled.value,
      maxOffsetPx: deriveAoiSettingNumber(rubberBandMaxOffsetPx.value, settingDerivationStrengths.rubberBand, {
        amount: 0.46,
        fallback: rubberBandMaxOffsetPx.value,
        max: 36,
        min: 8
      }),
      strength: deriveAoiSettingPercent(rubberBandStrength.value, settingDerivationStrengths.rubberBand, {
        amount: 0.48,
        fallback: rubberBandStrength.value,
        max: 100,
        min: 0
      })
    },
    smooth: {
      damping: deriveAoiSettingNumber(smoothScrollDamping.value, settingDerivationStrengths.smoothScroll, {
        amount: 0.3,
        fallback: smoothScrollDamping.value,
        inverse: true,
        max: 0.22,
        min: 0.04,
        precision: 2
      }),
      durationMs: deriveAoiSettingNumber(smoothScrollDurationMs.value, settingDerivationStrengths.smoothScroll, {
        amount: 0.22,
        fallback: smoothScrollDurationMs.value,
        max: 1800,
        min: 600
      }),
      enabled: smoothScrollEnabled.value
    },
    snap: {
      enabled: scrollSnapEnabled.value,
      mode: scrollSnapMode.value,
      strength: deriveAoiSettingPercent(scrollSnapStrength.value, settingDerivationStrengths.scrollSnap, {
        amount: 0.48,
        fallback: scrollSnapStrength.value,
        max: 100,
        min: 0
      })
    }
  }))
  const effectiveDanmakuRuntimeSettings = computed<AoiDanmakuRuntimeSettings>(() => normalizeAoiDanmakuSettings({
    blocklist: danmakuBlocklist.value,
    bottomModeEnabled: danmakuBottomModeEnabled.value,
    enabled: danmakuEnabled.value,
    fontScale: deriveAoiSettingNumber(danmakuFontScale.value, settingDerivationStrengths.danmaku, {
      amount: 0.18,
      fallback: danmakuFontScale.value,
      max: 1.6,
      min: 0.7,
      precision: 2
    }),
    opacity: deriveOpacity(danmakuOpacity.value, settingDerivationStrengths.danmaku, 0.2, 1),
    scrollModeEnabled: danmakuScrollModeEnabled.value,
    speed: deriveAoiSettingNumber(danmakuSpeed.value, settingDerivationStrengths.danmaku, {
      amount: 0.26,
      fallback: danmakuSpeed.value,
      max: 2,
      min: 0.5,
      precision: 2
    }),
    topModeEnabled: danmakuTopModeEnabled.value,
    visibleArea: deriveAoiSettingPercent(danmakuVisibleArea.value, settingDerivationStrengths.danmaku, {
      amount: 0.18,
      fallback: danmakuVisibleArea.value,
      max: 100,
      min: 20
    })
  }))
  const danmakuRuntimeSettings = effectiveDanmakuRuntimeSettings

  function currentState(): PersistedAppSettings {
    return {
      accentDerivationStrengths: { ...accentDerivationStrengths },
      accentMode: accentMode.value,
      accentPreset: accentPreset.value,
      appearanceContrast: appearanceContrast.value,
      appearanceDensity: appearanceDensity.value,
      appearanceShape: appearanceShape.value,
      appearanceSize: appearanceSize.value,
      backgroundBlur: backgroundBlur.value,
      backgroundDim: backgroundDim.value,
      backgroundFileName: backgroundFileName.value,
      backgroundFileSize: backgroundFileSize.value,
      backgroundImageId: backgroundImageId.value,
      backgroundOpacity: backgroundOpacity.value,
      colorfulNavigation: colorfulNavigation.value,
      customAccent: { ...customAccent.value },
      danmakuBlocklist: danmakuBlocklist.value,
      danmakuBottomModeEnabled: danmakuBottomModeEnabled.value,
      danmakuEnabled: danmakuEnabled.value,
      danmakuFontScale: danmakuFontScale.value,
      danmakuOpacity: danmakuOpacity.value,
      danmakuScrollModeEnabled: danmakuScrollModeEnabled.value,
      danmakuSpeed: danmakuSpeed.value,
      danmakuTopModeEnabled: danmakuTopModeEnabled.value,
      danmakuVisibleArea: danmakuVisibleArea.value,
      dataMode: dataMode.value,
      derivationPreset: derivationPreset.value,
      disableWatchHistory: disableWatchHistory.value,
      hideRecentSearches: hideRecentSearches.value,
      locale: locale.value,
      noRelatedVideos: noRelatedVideos.value,
      noSearchRecommendations: noSearchRecommendations.value,
      openVideosInNewTab: openVideosInNewTab.value,
      pageScrollbarStrategy: pageScrollbarStrategy.value,
      preferredTheme: preferredTheme.value,
      revealMotionDistancePx: revealMotionDistancePx.value,
      revealMotionDurationMs: revealMotionDurationMs.value,
      revealMotionEffect: revealMotionEffect.value,
      revealMotionEnabled: revealMotionEnabled.value,
      revealMotionMaxDelayMs: revealMotionMaxDelayMs.value,
      revealMotionReplay: revealMotionReplay.value,
      revealMotionStaggerMs: revealMotionStaggerMs.value,
      routeProgressDelayMs: routeProgressDelayMs.value,
      routeProgressDelayMigrated: routeProgressDelayMigrated.value,
      routeProgressEasing: routeProgressEasing.value,
      routeProgressEnabled: routeProgressEnabled.value,
      routeProgressHeightPx: routeProgressHeightPx.value,
      routeProgressMinimum: routeProgressMinimum.value,
      routeProgressSettingsVersion: AOI_ROUTE_PROGRESS_SETTINGS_VERSION,
      routeProgressShowSpinner: routeProgressShowSpinner.value,
      routeProgressSpeedMs: routeProgressSpeedMs.value,
      routeProgressTrickle: routeProgressTrickle.value,
      routeProgressTrickleSpeedMs: routeProgressTrickleSpeedMs.value,
      rubberBandEnabled: rubberBandEnabled.value,
      rubberBandMaxOffsetPx: rubberBandMaxOffsetPx.value,
      rubberBandStrength: rubberBandStrength.value,
      scrollHijackEnabled: scrollHijackEnabled.value,
      scrollHijackMode: scrollHijackMode.value,
      scrollHijackThresholdPx: scrollHijackThresholdPx.value,
      scrollSnapEnabled: scrollSnapEnabled.value,
      scrollSnapMode: scrollSnapMode.value,
      scrollSnapStrength: scrollSnapStrength.value,
      selectedCategory: selectedCategory.value,
      settingsDisplayDepth: settingsDisplayDepth.value,
      settingDerivationStrengths: { ...settingDerivationStrengths },
      smoothScrollDamping: smoothScrollDamping.value,
      smoothScrollDurationMs: smoothScrollDurationMs.value,
      smoothScrollEnabled: smoothScrollEnabled.value,
      specUnits: { ...specUnits },
      useRelativeDates: useRelativeDates.value
    }
  }

  function assignState(state: PersistedAppSettings) {
    Object.assign(accentDerivationStrengths, normalizeAoiAccentDerivationStrengths(state.accentDerivationStrengths))
    accentMode.value = state.accentMode
    accentPreset.value = state.accentPreset
    appearanceContrast.value = state.appearanceContrast
    appearanceDensity.value = state.appearanceDensity
    appearanceShape.value = state.appearanceShape
    appearanceSize.value = state.appearanceSize
    backgroundBlur.value = state.backgroundBlur
    backgroundDim.value = state.backgroundDim
    backgroundFileName.value = state.backgroundFileName
    backgroundFileSize.value = state.backgroundFileSize
    backgroundImageId.value = state.backgroundImageId
    backgroundOpacity.value = state.backgroundOpacity
    colorfulNavigation.value = state.colorfulNavigation
    customAccent.value = normalizeAoiRgbaColor(state.customAccent, DEFAULT_ACCENT)
    danmakuBlocklist.value = state.danmakuBlocklist
    danmakuBottomModeEnabled.value = state.danmakuBottomModeEnabled
    danmakuEnabled.value = state.danmakuEnabled
    danmakuFontScale.value = state.danmakuFontScale
    danmakuOpacity.value = state.danmakuOpacity
    danmakuScrollModeEnabled.value = state.danmakuScrollModeEnabled
    danmakuSpeed.value = state.danmakuSpeed
    danmakuTopModeEnabled.value = state.danmakuTopModeEnabled
    danmakuVisibleArea.value = state.danmakuVisibleArea
    dataMode.value = state.dataMode
    derivationPreset.value = state.derivationPreset
    disableWatchHistory.value = state.disableWatchHistory
    hideRecentSearches.value = state.hideRecentSearches
    locale.value = state.locale
    noRelatedVideos.value = state.noRelatedVideos
    noSearchRecommendations.value = state.noSearchRecommendations
    openVideosInNewTab.value = state.openVideosInNewTab
    pageScrollbarStrategy.value = state.pageScrollbarStrategy
    preferredTheme.value = state.preferredTheme
    revealMotionDistancePx.value = state.revealMotionDistancePx
    revealMotionDurationMs.value = state.revealMotionDurationMs
    revealMotionEffect.value = state.revealMotionEffect
    revealMotionEnabled.value = state.revealMotionEnabled
    revealMotionMaxDelayMs.value = state.revealMotionMaxDelayMs
    revealMotionReplay.value = state.revealMotionReplay
    revealMotionStaggerMs.value = state.revealMotionStaggerMs
    routeProgressDelayMs.value = state.routeProgressDelayMs
    routeProgressDelayMigrated.value = state.routeProgressDelayMigrated
    routeProgressEasing.value = state.routeProgressEasing
    routeProgressEnabled.value = state.routeProgressEnabled
    routeProgressHeightPx.value = state.routeProgressHeightPx
    routeProgressMinimum.value = state.routeProgressMinimum
    routeProgressShowSpinner.value = state.routeProgressShowSpinner
    routeProgressSpeedMs.value = state.routeProgressSpeedMs
    routeProgressTrickle.value = state.routeProgressTrickle
    routeProgressTrickleSpeedMs.value = state.routeProgressTrickleSpeedMs
    rubberBandEnabled.value = state.rubberBandEnabled
    rubberBandMaxOffsetPx.value = state.rubberBandMaxOffsetPx
    rubberBandStrength.value = state.rubberBandStrength
    scrollHijackEnabled.value = state.scrollHijackEnabled
    scrollHijackMode.value = state.scrollHijackMode
    scrollHijackThresholdPx.value = state.scrollHijackThresholdPx
    scrollSnapEnabled.value = state.scrollSnapEnabled
    scrollSnapMode.value = state.scrollSnapMode
    scrollSnapStrength.value = state.scrollSnapStrength
    selectedCategory.value = normalizeCommunityCategorySelection(state.selectedCategory)
    settingsDisplayDepth.value = state.settingsDisplayDepth
    Object.assign(settingDerivationStrengths, normalizeAoiSettingDerivationStrengths(state.settingDerivationStrengths))
    smoothScrollDamping.value = state.smoothScrollDamping
    smoothScrollDurationMs.value = state.smoothScrollDurationMs
    smoothScrollEnabled.value = state.smoothScrollEnabled
    Object.assign(specUnits, normalizeAoiSpecUnits(state.specUnits))
    useRelativeDates.value = state.useRelativeDates
  }

  function persist() {
    if (!import.meta.client || !hydrated.value) {
      return
    }

    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(currentState()))
    } catch {
      // Local settings are optional in this frontend prototype.
    }
  }

  function revokeBackgroundObjectUrl() {
    if (backgroundObjectUrl.value && import.meta.client) {
      URL.revokeObjectURL(backgroundObjectUrl.value)
    }

    backgroundObjectUrl.value = ""
  }

  async function restoreBackgroundObjectUrl() {
    revokeBackgroundObjectUrl()

    if (!backgroundImageId.value || !import.meta.client) {
      return
    }

    try {
      const blob = await readBackgroundBlob()

      if (!blob) {
        backgroundImageId.value = null
        backgroundFileName.value = ""
        backgroundFileSize.value = 0
        return
      }

      backgroundObjectUrl.value = URL.createObjectURL(blob)
    } catch {
      backgroundImageId.value = null
      backgroundFileName.value = ""
      backgroundFileSize.value = 0
      backgroundError.value = "背景图读取失败，已恢复为默认背景。"
    }
  }

  async function restore() {
    if (!import.meta.client) {
      return
    }

    try {
      const raw = window.localStorage.getItem(STORAGE_KEY)
      assignState(raw ? coercePersistedState(JSON.parse(raw)) : emptyState())
    } catch {
      assignState(emptyState())
    }

    await restoreBackgroundObjectUrl()
    hydrated.value = true
  }

  function setSelectedCategory(slug: string) {
    selectedCategory.value = normalizeCommunityCategorySelection(slug)
    persist()
  }

  function setSettingsDisplayDepth(value: AoiSettingsDisplayDepth) {
    if (!isSettingsDisplayDepth(value)) {
      return
    }

    settingsDisplayDepth.value = value
    persist()
  }

  function setPreferredTheme(theme: AoiPreferredTheme) {
    preferredTheme.value = theme
    persist()
  }

  function setLocalePreference(value: AoiLocale) {
    locale.value = value
    persist()
  }

  function setAppearanceDensity(value: AoiAppearanceDensity) {
    if (!isAppearanceDensity(value)) {
      return
    }

    appearanceDensity.value = value
    persist()
  }

  function setAppearanceSize(value: AoiAppearanceSize) {
    if (!isAppearanceSize(value)) {
      return
    }

    appearanceSize.value = value
    persist()
  }

  function setAppearanceShape(value: AoiAppearanceShape) {
    if (!isAppearanceShape(value)) {
      return
    }

    appearanceShape.value = value
    persist()
  }

  function setAppearanceContrast(value: AoiAppearanceContrast) {
    if (!isAppearanceContrast(value)) {
      return
    }

    appearanceContrast.value = value
    persist()
  }

  function setRevealMotionEffect(value: AoiRevealMotionEffectValue) {
    if (!isAoiRevealMotionEffect(value)) {
      return
    }

    revealMotionEffect.value = value
    persist()
  }

  function setRevealMotionReplay(value: AoiRevealMotionReplayValue) {
    if (!isAoiRevealMotionReplay(value)) {
      return
    }

    revealMotionReplay.value = value
    persist()
  }

  function setRouteProgressEasing(value: AoiRouteProgressEasing) {
    if (!isAoiRouteProgressEasing(value)) {
      return
    }

    routeProgressEasing.value = value
    persist()
  }

  function setScrollSnapMode(value: AoiScrollSnapMode) {
    if (!isAoiScrollSnapMode(value)) {
      return
    }

    scrollSnapMode.value = value
    persist()
  }

  function setScrollHijackMode(value: AoiScrollHijackMode) {
    if (!isAoiScrollHijackMode(value)) {
      return
    }

    scrollHijackMode.value = value
    persist()
  }

  function setPageScrollbarStrategy(value: AoiPageScrollbarStrategy) {
    if (!isAoiPageScrollbarStrategy(value)) {
      return
    }

    pageScrollbarStrategy.value = value
    persist()
  }

  function setDanmakuBlocklist(value: string) {
    danmakuBlocklist.value = value.slice(0, 2000)
    persist()
  }

  function setDanmakuFontScale(value: number) {
    danmakuFontScale.value = clampNumber(value, 0.7, 1.6, AOI_DANMAKU_DEFAULTS.fontScale)
    persist()
  }

  function setDanmakuOpacity(value: number) {
    danmakuOpacity.value = clampNumber(value, 0.2, 1, AOI_DANMAKU_DEFAULTS.opacity)
    persist()
  }

  function setDanmakuSpeed(value: number) {
    danmakuSpeed.value = clampNumber(value, 0.5, 2, AOI_DANMAKU_DEFAULTS.speed)
    persist()
  }

  function setDanmakuVisibleArea(value: number) {
    danmakuVisibleArea.value = clampNumber(value, 20, 100, AOI_DANMAKU_DEFAULTS.visibleArea)
    persist()
  }

  function setSpecUnit(key: AoiSpecUnitKey, value: number) {
    specUnits[key] = clampAoiSpecUnit(key, value)
    persist()
  }

  function setContentWidthMode(scope: AoiContentWidthScope, value: AoiContentWidthMode) {
    if (!isAoiContentWidthMode(value)) {
      return
    }

    if (scope === "wide") {
      specUnits.contentWideWidthMode = value
    } else {
      specUnits.contentWidthMode = value
    }

    persist()
  }

  function setContentWidthPercent(scope: AoiContentWidthScope, value: number) {
    if (scope === "wide") {
      specUnits.contentWideWidthPercent = clampAoiContentWidthPercent("contentWideWidthPercent", value)
    } else {
      specUnits.contentWidthPercent = clampAoiContentWidthPercent("contentWidthPercent", value)
    }

    persist()
  }

  function resetSpecUnits() {
    Object.assign(specUnits, emptyState().specUnits)
    persist()
  }

  function activeDefaultCustomAccent() {
    return { ...emptyState().customAccent }
  }

  function setDerivationPreset(value: AoiDerivationPreset) {
    if (!isAoiDerivationPreset(value)) {
      return
    }

    derivationPreset.value = value

    if (value !== "custom") {
      Object.assign(settingDerivationStrengths, createAoiSettingDerivationStrengthsForPreset(value))
      Object.assign(accentDerivationStrengths, createAccentDerivationStrengthsFromSettingPreset(value))
    }

    persist()
  }

  function setSettingDerivationStrength(key: AoiSettingDerivationStrengthKey, value: number) {
    if (!(key in settingDerivationStrengths)) {
      return
    }

    settingDerivationStrengths[key] = clampAoiSettingDerivationStrength(value, settingDerivationStrengths[key])
    derivationPreset.value = "custom"
    persist()
  }

  function resetSettingDerivationStrengths() {
    derivationPreset.value = "balanced"
    Object.assign(settingDerivationStrengths, AOI_SETTING_DERIVATION_DEFAULTS)
    Object.assign(accentDerivationStrengths, AOI_ACCENT_DERIVATION_DEFAULTS)
    persist()
  }

  function setAccentDerivationStrength(tone: AoiAccentDerivedTone, value: number) {
    accentDerivationStrengths[tone] = clampAoiAccentDerivationStrength(value, accentDerivationStrengths[tone])
    derivationPreset.value = "custom"
    persist()
  }

  function resetAccentDerivationStrengths() {
    Object.assign(accentDerivationStrengths, AOI_ACCENT_DERIVATION_DEFAULTS)
    derivationPreset.value = "custom"
    persist()
  }

  function setAccentPreset(value: string) {
    if (!isAccentPreset(value)) {
      return
    }

    accentPreset.value = value
    accentMode.value = "preset"
    persist()
  }

  function setBuildAccentPresetCards(value: unknown) {
    accentPresetCards.value = normalizeAoiAccentPresetCards(value)
  }

  function setCustomAccent(value: AoiRgbaColor | string) {
    customAccent.value = normalizeAoiRgbaColor(value, customAccent.value)
    accentMode.value = "custom"
    persist()
  }

  async function setBackgroundFile(file: File) {
    backgroundError.value = ""

    if (!AOI_BACKGROUND_TYPES.includes(file.type)) {
      backgroundError.value = "请选择 PNG、JPG 或 WebP 图片。"
      return false
    }

    if (file.size > AOI_BACKGROUND_MAX_BYTES) {
      backgroundError.value = "背景图不能超过 8MB。"
      return false
    }

    try {
      await writeBackgroundBlob(file)
      backgroundImageId.value = AOI_BACKGROUND_CURRENT_KEY
      backgroundFileName.value = file.name
      backgroundFileSize.value = file.size
      revokeBackgroundObjectUrl()
      backgroundObjectUrl.value = URL.createObjectURL(file)
      persist()
      return true
    } catch {
      backgroundError.value = "背景图保存失败，请换一张更小的图片。"
      return false
    }
  }

  async function clearBackground() {
    backgroundError.value = ""

    try {
      await deleteBackgroundBlob()
    } catch {
      backgroundError.value = "背景图清理失败，但页面已恢复默认背景。"
    }

    revokeBackgroundObjectUrl()
    backgroundImageId.value = null
    backgroundFileName.value = ""
    backgroundFileSize.value = 0
    persist()
  }

  async function resetAppearance() {
    const next = emptyState()

    preferredTheme.value = next.preferredTheme
    Object.assign(accentDerivationStrengths, next.accentDerivationStrengths)
    derivationPreset.value = next.derivationPreset
    Object.assign(settingDerivationStrengths, next.settingDerivationStrengths)
    accentMode.value = next.accentMode
    accentPreset.value = next.accentPreset
    appearanceContrast.value = next.appearanceContrast
    appearanceDensity.value = next.appearanceDensity
    appearanceShape.value = next.appearanceShape
    appearanceSize.value = next.appearanceSize
    customAccent.value = { ...next.customAccent }
    backgroundOpacity.value = next.backgroundOpacity
    backgroundBlur.value = next.backgroundBlur
    backgroundDim.value = next.backgroundDim
    colorfulNavigation.value = next.colorfulNavigation
    Object.assign(specUnits, next.specUnits)
    await clearBackground()
    persist()
  }

  function resetLanguage() {
    const next = emptyState()

    locale.value = next.locale
    persist()
  }

  function resetDanmakuSettings() {
    const next = emptyState()

    danmakuBlocklist.value = next.danmakuBlocklist
    danmakuBottomModeEnabled.value = next.danmakuBottomModeEnabled
    danmakuEnabled.value = next.danmakuEnabled
    danmakuFontScale.value = next.danmakuFontScale
    danmakuOpacity.value = next.danmakuOpacity
    danmakuScrollModeEnabled.value = next.danmakuScrollModeEnabled
    danmakuSpeed.value = next.danmakuSpeed
    danmakuTopModeEnabled.value = next.danmakuTopModeEnabled
    danmakuVisibleArea.value = next.danmakuVisibleArea
    settingDerivationStrengths.danmaku = next.settingDerivationStrengths.danmaku
    derivationPreset.value = "custom"
    persist()
  }

  function resetPreference() {
    const next = emptyState()

    dataMode.value = next.dataMode
    openVideosInNewTab.value = next.openVideosInNewTab
    useRelativeDates.value = next.useRelativeDates
    hideRecentSearches.value = next.hideRecentSearches
    disableWatchHistory.value = next.disableWatchHistory
    noSearchRecommendations.value = next.noSearchRecommendations
    noRelatedVideos.value = next.noRelatedVideos
    pageScrollbarStrategy.value = next.pageScrollbarStrategy
    revealMotionDistancePx.value = next.revealMotionDistancePx
    revealMotionDurationMs.value = next.revealMotionDurationMs
    revealMotionEffect.value = next.revealMotionEffect
    revealMotionEnabled.value = next.revealMotionEnabled
    revealMotionMaxDelayMs.value = next.revealMotionMaxDelayMs
    revealMotionReplay.value = next.revealMotionReplay
    revealMotionStaggerMs.value = next.revealMotionStaggerMs
    routeProgressDelayMs.value = next.routeProgressDelayMs
    routeProgressDelayMigrated.value = next.routeProgressDelayMigrated
    routeProgressEasing.value = next.routeProgressEasing
    routeProgressEnabled.value = next.routeProgressEnabled
    routeProgressHeightPx.value = next.routeProgressHeightPx
    routeProgressMinimum.value = next.routeProgressMinimum
    routeProgressShowSpinner.value = next.routeProgressShowSpinner
    routeProgressSpeedMs.value = next.routeProgressSpeedMs
    routeProgressTrickle.value = next.routeProgressTrickle
    routeProgressTrickleSpeedMs.value = next.routeProgressTrickleSpeedMs
    rubberBandEnabled.value = next.rubberBandEnabled
    rubberBandMaxOffsetPx.value = next.rubberBandMaxOffsetPx
    rubberBandStrength.value = next.rubberBandStrength
    scrollHijackEnabled.value = next.scrollHijackEnabled
    scrollHijackMode.value = next.scrollHijackMode
    scrollHijackThresholdPx.value = next.scrollHijackThresholdPx
    scrollSnapEnabled.value = next.scrollSnapEnabled
    scrollSnapMode.value = next.scrollSnapMode
    scrollSnapStrength.value = next.scrollSnapStrength
    smoothScrollDamping.value = next.smoothScrollDamping
    smoothScrollDurationMs.value = next.smoothScrollDurationMs
    smoothScrollEnabled.value = next.smoothScrollEnabled
    settingDerivationStrengths.revealMotion = next.settingDerivationStrengths.revealMotion
    settingDerivationStrengths.routeProgress = next.settingDerivationStrengths.routeProgress
    settingDerivationStrengths.smoothScroll = next.settingDerivationStrengths.smoothScroll
    settingDerivationStrengths.scrollSnap = next.settingDerivationStrengths.scrollSnap
    settingDerivationStrengths.scrollHijack = next.settingDerivationStrengths.scrollHijack
    settingDerivationStrengths.rubberBand = next.settingDerivationStrengths.rubberBand
    derivationPreset.value = "custom"
    persist()
  }

  async function resetAllAppSettings() {
    assignState(emptyState())
    await clearBackground()

    if (import.meta.client) {
      try {
        window.localStorage.removeItem(STORAGE_KEY)
      } catch {
        // Local settings are optional in this frontend prototype.
      }
    }

    persist()
  }

  if (import.meta.client) {
    watch([
      preferredTheme,
      locale,
      appearanceContrast,
      appearanceDensity,
      appearanceShape,
      appearanceSize,
      accentMode,
      accentPreset,
      () => ({ ...accentDerivationStrengths }),
      derivationPreset,
      () => ({ ...settingDerivationStrengths }),
      customAccent,
      backgroundImageId,
      backgroundFileName,
      backgroundFileSize,
      backgroundOpacity,
      backgroundBlur,
      backgroundDim,
      colorfulNavigation,
      danmakuBlocklist,
      danmakuBottomModeEnabled,
      danmakuEnabled,
      danmakuFontScale,
      danmakuOpacity,
      danmakuScrollModeEnabled,
      danmakuSpeed,
      danmakuTopModeEnabled,
      danmakuVisibleArea,
      openVideosInNewTab,
      useRelativeDates,
      dataMode,
      hideRecentSearches,
      disableWatchHistory,
      noSearchRecommendations,
      noRelatedVideos,
      pageScrollbarStrategy,
      revealMotionEnabled,
      revealMotionEffect,
      revealMotionReplay,
      revealMotionDurationMs,
      revealMotionDistancePx,
      revealMotionStaggerMs,
      revealMotionMaxDelayMs,
      routeProgressEnabled,
      routeProgressMinimum,
      routeProgressTrickle,
      routeProgressTrickleSpeedMs,
      routeProgressSpeedMs,
      routeProgressDelayMs,
      routeProgressHeightPx,
      routeProgressShowSpinner,
      routeProgressEasing,
      smoothScrollEnabled,
      smoothScrollDurationMs,
      smoothScrollDamping,
      scrollSnapEnabled,
      scrollSnapMode,
      scrollSnapStrength,
      scrollHijackEnabled,
      scrollHijackMode,
      scrollHijackThresholdPx,
      rubberBandEnabled,
      rubberBandStrength,
      rubberBandMaxOffsetPx,
      () => ({ ...specUnits }),
      selectedCategory,
      settingsDisplayDepth
    ], persist, { flush: "sync" })
  }

  return {
    accentDerivationStrengths,
    accentMode,
    accentPreset,
    accentPresetCardOptions,
    accentPresetCards,
    accentScale,
    activeAccent,
    activePreset,
    appearanceContrast,
    appearanceDensity,
    appearanceShape,
    appearanceSize,
    backgroundBlur,
    backgroundDim,
    backgroundError,
    backgroundFileName,
    backgroundFileSize,
    backgroundImageId,
    backgroundObjectUrl,
    backgroundOpacity,
    clearBackground,
    colorfulNavigation,
    customAccent,
    danmakuBlocklist,
    danmakuBottomModeEnabled,
    danmakuEnabled,
    danmakuFontScale,
    danmakuOpacity,
    danmakuRuntimeSettings,
    danmakuScrollModeEnabled,
    danmakuSpeed,
    danmakuTopModeEnabled,
    danmakuVisibleArea,
    dataMode,
    derivationPreset,
    disableWatchHistory,
    effectiveDanmakuRuntimeSettings,
    effectiveRevealMotionSettings,
    effectiveRouteProgressSettings,
    effectiveScrollSettings,
    hideRecentSearches,
    hydrated,
    locale,
    noRelatedVideos,
    noSearchRecommendations,
    openVideosInNewTab,
    pageScrollbarStrategy,
    persist,
    preferredTheme,
    revealMotionDistancePx,
    revealMotionDurationMs,
    revealMotionEffect,
    revealMotionEnabled,
    revealMotionMaxDelayMs,
    revealMotionReplay,
    revealMotionStaggerMs,
    routeProgressDelayMs,
    routeProgressEasing,
    routeProgressEnabled,
    routeProgressHeightPx,
    routeProgressMinimum,
    routeProgressShowSpinner,
    routeProgressSpeedMs,
    routeProgressTrickle,
    routeProgressTrickleSpeedMs,
    rubberBandEnabled,
    rubberBandMaxOffsetPx,
    rubberBandStrength,
    scrollHijackEnabled,
    scrollHijackMode,
    scrollHijackThresholdPx,
    scrollSnapEnabled,
    scrollSnapMode,
    scrollSnapStrength,
    resetAllAppSettings,
    resetAccentDerivationStrengths,
    resetAppearance,
    resetDanmakuSettings,
    resetLanguage,
    resetPreference,
    resetSettingDerivationStrengths,
    restore,
    restoreBackgroundObjectUrl,
    selectedCategory,
    settingsDisplayDepth,
    setAccentDerivationStrength,
    setAccentPreset,
    setAppearanceContrast,
    setAppearanceDensity,
    setAppearanceShape,
    setAppearanceSize,
    setBackgroundFile,
    setBuildAccentPresetCards,
    setContentWidthMode,
    setContentWidthPercent,
    setCustomAccent,
    setDerivationPreset,
    setDanmakuBlocklist,
    setDanmakuFontScale,
    setDanmakuOpacity,
    setDanmakuSpeed,
    setDanmakuVisibleArea,
    setLocalePreference,
    setPageScrollbarStrategy,
    setPreferredTheme,
    setRevealMotionEffect,
    setRevealMotionReplay,
    setRouteProgressEasing,
    setScrollHijackMode,
    setScrollSnapMode,
    setSelectedCategory,
    setSettingsDisplayDepth,
    setSettingDerivationStrength,
    settingDerivationStrengths,
    smoothScrollDamping,
    smoothScrollDurationMs,
    smoothScrollEnabled,
    specUnits,
    activeDefaultCustomAccent,
    resetSpecUnits,
    setSpecUnit,
    useRelativeDates
  }
})
