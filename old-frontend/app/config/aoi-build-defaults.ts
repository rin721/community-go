import manifest from "./aoi-build-default-profiles/manifest.json"
import {
  normalizeAoiBuildDefaultAppSettings
} from "../lib/aoiBuildDefaultSerialization"
import type { AoiBuildDefaultAppSettings } from "../lib/aoiBuildDefaultSerialization"
import type {
  AoiBuildProfileManifest,
  AoiSettingsProfile
} from "../lib/aoiSettingsProfiles"

const profiles = import.meta.glob("./aoi-build-default-profiles/profiles/*.json", {
  eager: true,
  import: "default"
}) as Record<string, AoiSettingsProfile>

const originals = import.meta.glob("./aoi-build-default-profiles/original/*.json", {
  eager: true,
  import: "default"
}) as Record<string, AoiSettingsProfile>

const profileManifest = manifest as AoiBuildProfileManifest

function getProfile(collection: Record<string, AoiSettingsProfile>, id: string) {
  return collection[`./aoi-build-default-profiles/profiles/${id}.json`]
    || collection[`./aoi-build-default-profiles/original/${id}.json`]
}

function getOriginalProfile(id: string) {
  return originals[`./aoi-build-default-profiles/original/${id}.json`]
}

const originalDefaultProfile = getOriginalProfile("default")
const activeProfile = getProfile(profiles, profileManifest.activeProfileId)
const baseDefaults = normalizeAoiBuildDefaultAppSettings(originalDefaultProfile?.settings)

export const AOI_BUILD_DEFAULT_APP_SETTINGS = normalizeAoiBuildDefaultAppSettings(
  activeProfile?.settings,
  baseDefaults
) satisfies AoiBuildDefaultAppSettings
