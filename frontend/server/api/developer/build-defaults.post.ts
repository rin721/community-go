import { promises as fs } from "node:fs"
import { dirname, resolve } from "node:path"
import {
  AOI_BUILD_DEFAULT_CONFIG_PATHS,
  normalizeAoiBuildDefaultAppSettings
} from "../../../app/lib/aoiBuildDefaultSerialization"
import {
  AOI_DEFAULT_BUILD_PROFILE_ID,
  createAoiSettingsProfile,
  getAoiSettingsProfileFields,
  isAoiSettingsProfileId,
  normalizeAoiSettingsProfile
} from "../../../app/lib/aoiSettingsProfiles"
import type {
  AoiBuildProfileManifest,
  AoiBuildProfileSummary,
  AoiSettingsProfile
} from "../../../app/lib/aoiSettingsProfiles"

type DeveloperBuildDefaultsAction = "restore" | "write"

interface DeveloperBuildDefaultsBody {
  action?: DeveloperBuildDefaultsAction
  settings?: unknown
}

const manifestPath = resolve(process.cwd(), AOI_BUILD_DEFAULT_CONFIG_PATHS.manifest)
const profilesDir = resolve(process.cwd(), AOI_BUILD_DEFAULT_CONFIG_PATHS.profilesDir)
const originalsDir = resolve(process.cwd(), AOI_BUILD_DEFAULT_CONFIG_PATHS.originalsDir)

function assertDeveloperApiAvailable() {
  if (!import.meta.dev) {
    throw createError({
      statusCode: 404,
      statusMessage: "Not found"
    })
  }
}

function profilePath(id: string, kind: "original" | "profile") {
  return resolve(kind === "profile" ? profilesDir : originalsDir, `${id}.json`)
}

async function readJson<T>(path: string) {
  return JSON.parse(await fs.readFile(path, "utf8")) as T
}

async function writeJson(path: string, value: unknown) {
  await fs.mkdir(dirname(path), { recursive: true })
  await fs.writeFile(path, `${JSON.stringify(value, null, 2)}\n`, "utf8")
}

async function readManifest(): Promise<AoiBuildProfileManifest> {
  const manifest = await readJson<AoiBuildProfileManifest>(manifestPath)

  return {
    activeProfileId: isAoiSettingsProfileId(manifest.activeProfileId) ? manifest.activeProfileId : AOI_DEFAULT_BUILD_PROFILE_ID,
    profiles: Array.isArray(manifest.profiles) ? manifest.profiles.filter((profile) => isAoiSettingsProfileId(profile.id)) : []
  }
}

async function writeManifest(manifest: AoiBuildProfileManifest) {
  await writeJson(manifestPath, manifest)
}

async function readBuildProfile(id: string, kind: "original" | "profile" = "profile") {
  const profile = normalizeAoiSettingsProfile(await readJson(profilePath(id, kind)), "build")

  if (!profile) {
    throw createError({
      statusCode: 500,
      statusMessage: "Invalid build profile"
    })
  }

  return profile
}

function summarizeProfile(profile: AoiSettingsProfile, builtin = false): AoiBuildProfileSummary {
  return {
    builtin,
    createdAt: profile.createdAt,
    description: profile.description,
    id: profile.id,
    name: profile.name,
    updatedAt: profile.updatedAt
  }
}

function updateManifestProfile(manifest: AoiBuildProfileManifest, summary: AoiBuildProfileSummary) {
  const index = manifest.profiles.findIndex((profile) => profile.id === summary.id)

  if (index >= 0) {
    manifest.profiles[index] = {
      ...manifest.profiles[index],
      ...summary
    }
  } else {
    manifest.profiles.push(summary)
  }
}

function serializeProfileForResponse(profile: AoiSettingsProfile) {
  return `${JSON.stringify(profile, null, 2)}\n`
}

async function writeActiveBuildProfile(settings: unknown) {
  const manifest = await readManifest()
  const activeId = isAoiSettingsProfileId(manifest.activeProfileId)
    ? manifest.activeProfileId
    : AOI_DEFAULT_BUILD_PROFILE_ID
  const existing = await readBuildProfile(activeId)
  const builtin = manifest.profiles.find((profile) => profile.id === activeId)?.builtin === true
  const fields = existing.fields.length
    ? existing.fields
    : getAoiSettingsProfileFields("build").map((field) => field.key)
  const normalized = normalizeAoiBuildDefaultAppSettings(settings)
  const profile = createAoiSettingsProfile({
    description: existing.description,
    fields,
    id: activeId,
    name: existing.name,
    scope: "build",
    settings: normalized
  })

  profile.createdAt = existing.createdAt
  await writeJson(profilePath(profile.id, "profile"), profile)
  updateManifestProfile(manifest, summarizeProfile(profile, builtin))
  await writeManifest(manifest)

  const source = serializeProfileForResponse(profile)

  return {
    activeId,
    bytes: Buffer.byteLength(source, "utf8"),
    source
  }
}

async function restoreActiveBuildProfile() {
  const manifest = await readManifest()
  const activeId = isAoiSettingsProfileId(manifest.activeProfileId)
    ? manifest.activeProfileId
    : AOI_DEFAULT_BUILD_PROFILE_ID
  const original = await readBuildProfile(activeId, "original")
  const builtin = manifest.profiles.find((profile) => profile.id === activeId)?.builtin === true

  await writeJson(profilePath(activeId, "profile"), original)
  updateManifestProfile(manifest, summarizeProfile(original, builtin))
  await writeManifest(manifest)

  const source = serializeProfileForResponse(original)

  return {
    activeId,
    bytes: Buffer.byteLength(source, "utf8"),
    source
  }
}

export default defineEventHandler(async (event) => {
  assertDeveloperApiAvailable()

  const body = await readBody<DeveloperBuildDefaultsBody>(event)

  if (body?.action === "write") {
    const result = await writeActiveBuildProfile(body.settings)

    return {
      action: "write",
      activePath: `${AOI_BUILD_DEFAULT_CONFIG_PATHS.profilesDir}/${result.activeId}.json`,
      originalPath: `${AOI_BUILD_DEFAULT_CONFIG_PATHS.originalsDir}/${result.activeId}.json`,
      ok: true,
      updatedAt: new Date().toISOString(),
      ...result
    }
  }

  if (body?.action === "restore") {
    const result = await restoreActiveBuildProfile()

    return {
      action: "restore",
      activePath: `${AOI_BUILD_DEFAULT_CONFIG_PATHS.profilesDir}/${result.activeId}.json`,
      originalPath: `${AOI_BUILD_DEFAULT_CONFIG_PATHS.originalsDir}/${result.activeId}.json`,
      ok: true,
      updatedAt: new Date().toISOString(),
      ...result
    }
  }

  throw createError({
    statusCode: 400,
    statusMessage: "Unsupported developer build-default action"
  })
})
