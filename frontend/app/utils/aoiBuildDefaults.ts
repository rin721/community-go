import { AOI_BUILD_DEFAULT_APP_SETTINGS } from "../config/aoi-build-defaults"
import { AOI_ORIGINAL_BUILD_DEFAULT_APP_SETTINGS } from "../config/aoi-build-defaults.original"
import {
  AOI_FALLBACK_BUILD_DEFAULT_APP_SETTINGS,
  normalizeAoiBuildDefaultAppSettings
} from "../lib/aoiBuildDefaultSerialization"

export {
  AOI_BUILD_DEFAULT_CONFIG_PATHS,
  AOI_FALLBACK_BUILD_DEFAULT_APP_SETTINGS,
  normalizeAoiBuildDefaultAppSettings,
  serializeAoiBuildDefaultConfig
} from "../lib/aoiBuildDefaultSerialization"
export type {
  AoiBuildAccentMode,
  AoiBuildAppearanceContrast,
  AoiBuildAppearanceDensity,
  AoiBuildAppearanceShape,
  AoiBuildAppearanceSize,
  AoiBuildDataMode,
  AoiBuildDefaultAppSettings,
  AoiBuildLocale,
  AoiBuildPreferredTheme
} from "../lib/aoiBuildDefaultSerialization"

export function createAoiOriginalBuildDefaultAppSettings() {
  return normalizeAoiBuildDefaultAppSettings(
    AOI_ORIGINAL_BUILD_DEFAULT_APP_SETTINGS,
    AOI_FALLBACK_BUILD_DEFAULT_APP_SETTINGS
  )
}

export function createAoiActiveBuildDefaultAppSettings() {
  const originalDefaults = createAoiOriginalBuildDefaultAppSettings()

  return normalizeAoiBuildDefaultAppSettings(AOI_BUILD_DEFAULT_APP_SETTINGS, originalDefaults)
}

export function createAoiBuildDefaultFromAppSettings(value: unknown) {
  return normalizeAoiBuildDefaultAppSettings(value, createAoiActiveBuildDefaultAppSettings())
}
