import defaultOriginalProfile from "./aoi-build-default-profiles/original/default.json"
import {
  normalizeAoiBuildDefaultAppSettings
} from "../lib/aoiBuildDefaultSerialization"
import type { AoiBuildDefaultAppSettings } from "../lib/aoiBuildDefaultSerialization"
import type { AoiSettingsProfile } from "../lib/aoiSettingsProfiles"

const originalProfile = defaultOriginalProfile as AoiSettingsProfile

export const AOI_ORIGINAL_BUILD_DEFAULT_APP_SETTINGS = normalizeAoiBuildDefaultAppSettings(
  originalProfile.settings
) satisfies AoiBuildDefaultAppSettings
