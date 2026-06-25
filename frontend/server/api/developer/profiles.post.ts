import { promises as fs } from "node:fs"
import { dirname, resolve } from "node:path"
import {
  AOI_BUILD_DEFAULT_CONFIG_PATHS,
  normalizeAoiBuildDefaultAppSettings
} from "../../../app/lib/aoiBuildDefaultSerialization"
import {
  AOI_DEFAULT_BUILD_PROFILE_ID,
  createAoiSettingsProfile,
  isAoiSettingsProfileId,
  normalizeAoiSettingsProfile,
  normalizeAoiSettingsProfileFieldKeys
} from "../../../app/lib/aoiSettingsProfiles"
import type {
  AoiBuildProfileManifest,
  AoiBuildProfileSummary,
  AoiSettingsProfile
} from "../../../app/lib/aoiSettingsProfiles"

type DeveloperProfilesAction =
  | "copyBuild"
  | "createBuild"
  | "deleteBuild"
  | "listBuild"
  | "restoreBuild"
  | "setActiveBuild"
  | "updateBuildMeta"
  | "writeBuild"

interface DeveloperProfilesBody {
  action?: DeveloperProfilesAction
  description?: string
  fields?: string[]
  id?: string
  name?: string
  settings?: unknown
  sourceId?: string
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

function assertProfileId(value: unknown) {
  if (!isAoiSettingsProfileId(value)) {
    throw createError({
      statusCode: 400,
      statusMessage: "Invalid profile id"
    })
  }

  return value
}

function profilePath(id: string, kind: "original" | "profile") {
  return resolve(kind === "profile" ? profilesDir : originalsDir, `${id}.json`)
}

function normalizeRequestedFields(value: unknown) {
  const fields = normalizeAoiSettingsProfileFieldKeys(value, "build", { fallbackToAll: false })

  if (!fields.length) {
    throw createError({
      statusCode: 400,
      statusMessage: "At least one field is required"
    })
  }

  return fields
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

async function writeBuildProfile(profile: AoiSettingsProfile, kind: "original" | "profile" = "profile") {
  await writeJson(profilePath(profile.id, kind), profile)
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

async function listBuildProfiles() {
  const manifest = await readManifest()
  const originalProfiles: AoiSettingsProfile[] = []
  const profiles: AoiSettingsProfile[] = []

  for (const summary of manifest.profiles) {
    try {
      profiles.push(await readBuildProfile(summary.id))
    } catch {
      // Ignore missing files; the manifest stays fixed-path and can be repaired by create/copy.
    }

    try {
      originalProfiles.push(await readBuildProfile(summary.id, "original"))
    } catch {
      // Missing original backups are surfaced when a restore is attempted.
    }
  }

  return {
    manifest,
    originalProfiles,
    paths: AOI_BUILD_DEFAULT_CONFIG_PATHS,
    profiles
  }
}

async function ensureProfileMissing(id: string) {
  try {
    await fs.access(profilePath(id, "profile"))
  } catch {
    return
  }

  throw createError({
    statusCode: 409,
    statusMessage: "Profile already exists"
  })
}

async function createBuildProfile(body: DeveloperProfilesBody) {
  const id = assertProfileId(body.id)

  await ensureProfileMissing(id)

  const fields = normalizeRequestedFields(body.fields)
  const normalizedSettings = normalizeAoiBuildDefaultAppSettings(body.settings)
  const profile = createAoiSettingsProfile({
    description: body.description,
    fields,
    id,
    name: body.name,
    scope: "build",
    settings: normalizedSettings
  })
  const manifest = await readManifest()

  await writeBuildProfile(profile)
  await writeBuildProfile(profile, "original")
  updateManifestProfile(manifest, summarizeProfile(profile, id === AOI_DEFAULT_BUILD_PROFILE_ID))
  await writeManifest(manifest)
}

async function copyBuildProfile(body: DeveloperProfilesBody) {
  const id = assertProfileId(body.id)
  const sourceId = assertProfileId(body.sourceId)

  await ensureProfileMissing(id)

  const source = await readBuildProfile(sourceId)
  const now = new Date().toISOString()
  const profile: AoiSettingsProfile = {
    ...source,
    createdAt: now,
    description: body.description?.trim() || source.description,
    id,
    name: body.name?.trim() || `${source.name} Copy`,
    updatedAt: now
  }
  const manifest = await readManifest()

  await writeBuildProfile(profile)
  await writeBuildProfile(profile, "original")
  updateManifestProfile(manifest, summarizeProfile(profile, false))
  await writeManifest(manifest)
}

async function updateBuildProfileMeta(body: DeveloperProfilesBody) {
  const id = assertProfileId(body.id)
  const profile = await readBuildProfile(id)
  const manifest = await readManifest()
  const updated: AoiSettingsProfile = {
    ...profile,
    description: typeof body.description === "string" ? body.description.trim() : profile.description,
    name: typeof body.name === "string" && body.name.trim() ? body.name.trim() : profile.name,
    updatedAt: new Date().toISOString()
  }
  const builtin = manifest.profiles.find((item) => item.id === id)?.builtin === true

  await writeBuildProfile(updated)
  updateManifestProfile(manifest, summarizeProfile(updated, builtin))
  await writeManifest(manifest)
}

async function writeBuildProfileSettings(body: DeveloperProfilesBody) {
  const id = assertProfileId(body.id)
  const profile = await readBuildProfile(id)
  const manifest = await readManifest()
  const fields = normalizeRequestedFields(body.fields)
  const normalizedSettings = normalizeAoiBuildDefaultAppSettings(body.settings)
  const updated = createAoiSettingsProfile({
    description: profile.description,
    fields,
    id,
    name: profile.name,
    scope: "build",
    settings: normalizedSettings
  })
  const builtin = manifest.profiles.find((item) => item.id === id)?.builtin === true

  updated.createdAt = profile.createdAt
  await writeBuildProfile(updated)
  updateManifestProfile(manifest, summarizeProfile(updated, builtin))
  await writeManifest(manifest)
}

async function restoreBuildProfile(body: DeveloperProfilesBody) {
  const id = assertProfileId(body.id)
  const original = await readBuildProfile(id, "original")
  const manifest = await readManifest()
  const builtin = manifest.profiles.find((item) => item.id === id)?.builtin === true

  await writeBuildProfile(original)
  updateManifestProfile(manifest, summarizeProfile(original, builtin))
  await writeManifest(manifest)
}

async function deleteBuildProfile(body: DeveloperProfilesBody) {
  const id = assertProfileId(body.id)

  if (id === AOI_DEFAULT_BUILD_PROFILE_ID) {
    throw createError({
      statusCode: 400,
      statusMessage: "Default profile cannot be deleted"
    })
  }

  const manifest = await readManifest()
  const summary = manifest.profiles.find((profile) => profile.id === id)

  if (!summary) {
    throw createError({
      statusCode: 404,
      statusMessage: "Profile not found"
    })
  }

  if (summary.builtin) {
    throw createError({
      statusCode: 400,
      statusMessage: "Builtin profile cannot be deleted"
    })
  }

  await fs.rm(profilePath(id, "profile"), { force: true })
  await fs.rm(profilePath(id, "original"), { force: true })
  manifest.profiles = manifest.profiles.filter((profile) => profile.id !== id)

  if (manifest.activeProfileId === id) {
    manifest.activeProfileId = AOI_DEFAULT_BUILD_PROFILE_ID
  }

  await writeManifest(manifest)
}

async function setActiveBuildProfile(body: DeveloperProfilesBody) {
  const id = assertProfileId(body.id)
  const manifest = await readManifest()

  if (!manifest.profiles.some((profile) => profile.id === id)) {
    throw createError({
      statusCode: 404,
      statusMessage: "Profile not found"
    })
  }

  manifest.activeProfileId = id
  await writeManifest(manifest)
}

export default defineEventHandler(async (event) => {
  assertDeveloperApiAvailable()

  const body = await readBody<DeveloperProfilesBody>(event)

  switch (body?.action) {
    case "copyBuild":
      await copyBuildProfile(body)
      break
    case "createBuild":
      await createBuildProfile(body)
      break
    case "deleteBuild":
      await deleteBuildProfile(body)
      break
    case "listBuild":
      break
    case "restoreBuild":
      await restoreBuildProfile(body)
      break
    case "setActiveBuild":
      await setActiveBuildProfile(body)
      break
    case "updateBuildMeta":
      await updateBuildProfileMeta(body)
      break
    case "writeBuild":
      await writeBuildProfileSettings(body)
      break
    default:
      throw createError({
        statusCode: 400,
        statusMessage: "Unsupported developer profiles action"
      })
  }

  return {
    ok: true,
    updatedAt: new Date().toISOString(),
    ...await listBuildProfiles()
  }
})
