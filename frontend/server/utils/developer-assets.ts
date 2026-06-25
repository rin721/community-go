import { promises as fs } from "node:fs"
import { dirname, extname, posix, relative, resolve, sep } from "node:path"
import { createError } from "h3"
import type {
  AoiDeveloperAssetActionResponse,
  AoiDeveloperAssetEntry,
  AoiDeveloperAssetKind,
  AoiDeveloperAssetListResponse,
  AoiDeveloperAssetPreviewKind,
  AoiDeveloperAssetReadTextResponse,
  AoiDeveloperAssetRequest,
  AoiDeveloperAssetRoot,
  AoiDeveloperAssetRootId,
  AoiDeveloperAssetUploadResponse
} from "../../shared/types/developer-assets"

interface DeveloperAssetRootInternal extends AoiDeveloperAssetRoot {
  absolutePath: string
}

export const AOI_DEVELOPER_ASSET_TEXT_LIMIT_BYTES = 1024 * 1024
export const AOI_DEVELOPER_ASSET_UPLOAD_LIMIT_BYTES = 50 * 1024 * 1024

const roots: DeveloperAssetRootInternal[] = [
  {
    id: "public",
    label: "public",
    relativePath: "public",
    absolutePath: resolve(process.cwd(), "public"),
    publicBaseUrl: "/"
  },
  {
    id: "app-assets",
    label: "app/assets",
    relativePath: "app/assets",
    absolutePath: resolve(process.cwd(), "app/assets")
  },
  {
    id: "i18n-locales",
    label: "i18n/locales",
    relativePath: "i18n/locales",
    absolutePath: resolve(process.cwd(), "i18n/locales")
  }
]

const textExtensions = new Set([
  ".css",
  ".csv",
  ".html",
  ".js",
  ".json",
  ".md",
  ".mjs",
  ".scss",
  ".svg",
  ".toml",
  ".ts",
  ".tsx",
  ".txt",
  ".vue",
  ".xml",
  ".yaml",
  ".yml"
])

const imageExtensions = new Set([".avif", ".gif", ".jpg", ".jpeg", ".png", ".svg", ".webp"])
const audioExtensions = new Set([".aac", ".flac", ".m4a", ".mp3", ".ogg", ".wav", ".weba"])
const videoExtensions = new Set([".m4v", ".mov", ".mp4", ".ogv", ".webm"])

export function assertDeveloperAssetApiAvailable() {
  if (!import.meta.dev) {
    throw createError({
      statusCode: 404,
      statusMessage: "Not found"
    })
  }
}

export function publicDeveloperAssetRoots(): AoiDeveloperAssetRoot[] {
  return roots.map(({ absolutePath: _absolutePath, ...root }) => root)
}

export function assertDeveloperAssetRootId(value: unknown): AoiDeveloperAssetRootId {
  if (value === "public" || value === "app-assets" || value === "i18n-locales") {
    return value
  }

  throw createError({
    statusCode: 400,
    statusMessage: "Invalid asset root"
  })
}

function getRoot(rootId: AoiDeveloperAssetRootId) {
  return roots.find((root) => root.id === rootId)!
}

export function normalizeDeveloperAssetPath(value: unknown) {
  if (value === undefined || value === null || value === "") {
    return ""
  }

  if (typeof value !== "string") {
    throw createError({
      statusCode: 400,
      statusMessage: "Invalid asset path"
    })
  }

  const input = value.replace(/\\/g, "/")

  if (input.includes("\0") || input.startsWith("/") || /^[a-zA-Z]:/.test(input)) {
    throw createError({
      statusCode: 400,
      statusMessage: "Invalid asset path"
    })
  }

  const segments = input.split("/").filter(Boolean)

  if (segments.some((segment) => segment === "." || segment === "..")) {
    throw createError({
      statusCode: 400,
      statusMessage: "Invalid asset path"
    })
  }

  return segments.join("/")
}

export function assertDeveloperAssetName(value: unknown) {
  if (typeof value !== "string") {
    throw createError({
      statusCode: 400,
      statusMessage: "Invalid asset name"
    })
  }

  const name = value.trim()

  if (
    !name
    || name === "."
    || name === ".."
    || name.includes("/")
    || name.includes("\\")
    || name.includes("\0")
    || /^[a-zA-Z]:/.test(name)
  ) {
    throw createError({
      statusCode: 400,
      statusMessage: "Invalid asset name"
    })
  }

  return name
}

export function resolveDeveloperAssetPath(rootId: AoiDeveloperAssetRootId, path: unknown) {
  const root = getRoot(rootId)
  const normalizedPath = normalizeDeveloperAssetPath(path)
  const absolutePath = resolve(root.absolutePath, normalizedPath)
  const relativeToRoot = relative(root.absolutePath, absolutePath)

  if (relativeToRoot && (relativeToRoot === ".." || relativeToRoot.startsWith(`..${sep}`) || resolve(relativeToRoot) === relativeToRoot)) {
    throw createError({
      statusCode: 400,
      statusMessage: "Asset path escapes root"
    })
  }

  return {
    absolutePath,
    path: normalizedPath,
    root
  }
}

export function joinDeveloperAssetPath(parentPath: string, name: string) {
  return normalizeDeveloperAssetPath(parentPath ? `${parentPath}/${name}` : name)
}

export function parentDeveloperAssetPath(path: string) {
  return normalizeDeveloperAssetPath(posix.dirname(path) === "." ? "" : posix.dirname(path))
}

export async function ensureDeveloperAssetDirectory(rootId: AoiDeveloperAssetRootId, path: unknown) {
  const resolved = resolveDeveloperAssetPath(rootId, path)
  let stat

  try {
    stat = await fs.lstat(resolved.absolutePath)
  } catch (error) {
    if (
      rootId === "public"
      && !resolved.path
      && error
      && typeof error === "object"
      && "code" in error
      && error.code === "ENOENT"
    ) {
      await fs.mkdir(resolved.absolutePath, { recursive: true })
      stat = await fs.lstat(resolved.absolutePath)
    } else {
      throw error
    }
  }

  if (!stat.isDirectory()) {
    throw createError({
      statusCode: 400,
      statusMessage: "Asset path is not a directory"
    })
  }

  return resolved
}

async function assertNotSymlink(absolutePath: string) {
  const stat = await fs.lstat(absolutePath)

  if (stat.isSymbolicLink()) {
    throw createError({
      statusCode: 400,
      statusMessage: "Symbolic links are not supported"
    })
  }

  return stat
}

async function pathExists(absolutePath: string) {
  try {
    await fs.lstat(absolutePath)
    return true
  } catch {
    return false
  }
}

function modeText(mode: number) {
  const value = mode & 0o7777

  return value.toString(8).padStart(value > 0o777 ? 4 : 3, "0")
}

function previewKind(extension: string): AoiDeveloperAssetPreviewKind {
  if (imageExtensions.has(extension)) {
    return "image"
  }

  if (videoExtensions.has(extension)) {
    return "video"
  }

  if (audioExtensions.has(extension)) {
    return "audio"
  }

  if (textExtensions.has(extension)) {
    return "text"
  }

  return "other"
}

function publicUrl(root: DeveloperAssetRootInternal, path: string, kind: AoiDeveloperAssetKind) {
  if (root.id !== "public" || kind !== "file") {
    return null
  }

  const encoded = path
    .split("/")
    .filter(Boolean)
    .map((segment) => encodeURIComponent(segment))
    .join("/")

  return `/${encoded}`
}

export async function getDeveloperAssetEntry(rootId: AoiDeveloperAssetRootId, path: unknown): Promise<AoiDeveloperAssetEntry> {
  const resolved = resolveDeveloperAssetPath(rootId, path)
  const stat = await assertNotSymlink(resolved.absolutePath)
  const kind: AoiDeveloperAssetKind = stat.isDirectory() ? "directory" : "file"
  const extension = kind === "file" ? extname(resolved.path).toLowerCase() : ""
  const entryPreviewKind = kind === "file" ? previewKind(extension) : "other"

  return {
    extension,
    kind,
    mode: stat.mode & 0o7777,
    modeText: modeText(stat.mode),
    modifiedAt: stat.mtime.toISOString(),
    name: resolved.path ? posix.basename(resolved.path) : resolved.root.label,
    path: resolved.path,
    previewKind: entryPreviewKind,
    publicUrl: publicUrl(resolved.root, resolved.path, kind),
    rootId,
    size: stat.size,
    textEditable: kind === "file" && entryPreviewKind === "text" && stat.size <= AOI_DEVELOPER_ASSET_TEXT_LIMIT_BYTES
  }
}

export async function listDeveloperAssets(
  rootId: AoiDeveloperAssetRootId = "public",
  path: unknown = "",
  warning?: string
): Promise<AoiDeveloperAssetListResponse> {
  const root = getRoot(rootId)
  const directory = await ensureDeveloperAssetDirectory(rootId, path)
  const dirents = await fs.readdir(directory.absolutePath, { withFileTypes: true })
  const entries: AoiDeveloperAssetEntry[] = []

  for (const dirent of dirents) {
    if (dirent.isSymbolicLink()) {
      continue
    }

    entries.push(await getDeveloperAssetEntry(rootId, joinDeveloperAssetPath(directory.path, dirent.name)))
  }

  entries.sort((a, b) => {
    if (a.kind !== b.kind) {
      return a.kind === "directory" ? -1 : 1
    }

    return a.name.localeCompare(b.name)
  })

  const { absolutePath: _absolutePath, ...publicRoot } = root

  return {
    currentPath: directory.path,
    entries,
    ok: true,
    root: publicRoot,
    roots: publicDeveloperAssetRoots(),
    updatedAt: new Date().toISOString(),
    warning
  }
}

async function assertWritableTargetMissing(absolutePath: string, overwrite = false) {
  if (await pathExists(absolutePath)) {
    if (overwrite) {
      await fs.rm(absolutePath, { force: true, recursive: true })
      return
    }

    throw createError({
      statusCode: 409,
      statusMessage: "Asset already exists"
    })
  }
}

function parseMode(value: unknown) {
  if (typeof value !== "string" || !/^[0-7]{3,4}$/.test(value)) {
    throw createError({
      statusCode: 400,
      statusMessage: "Invalid chmod mode"
    })
  }

  return Number.parseInt(value, 8)
}

function targetDirectoryForResponse(path: string) {
  return parentDeveloperAssetPath(path)
}

export async function readDeveloperTextAsset(body: AoiDeveloperAssetRequest): Promise<AoiDeveloperAssetReadTextResponse> {
  const rootId = assertDeveloperAssetRootId(body.rootId)
  const entry = await getDeveloperAssetEntry(rootId, body.path)

  if (!entry.textEditable) {
    throw createError({
      statusCode: 400,
      statusMessage: "Asset is not editable text"
    })
  }

  const resolved = resolveDeveloperAssetPath(rootId, entry.path)
  const content = await fs.readFile(resolved.absolutePath, "utf8")

  return {
    ...await listDeveloperAssets(rootId, targetDirectoryForResponse(entry.path)),
    content,
    entry
  }
}

export async function writeDeveloperTextAsset(body: AoiDeveloperAssetRequest): Promise<AoiDeveloperAssetActionResponse> {
  const rootId = assertDeveloperAssetRootId(body.rootId)
  const entry = await getDeveloperAssetEntry(rootId, body.path)

  if (!entry.textEditable) {
    throw createError({
      statusCode: 400,
      statusMessage: "Asset is not editable text"
    })
  }

  if (typeof body.content !== "string" || Buffer.byteLength(body.content, "utf8") > AOI_DEVELOPER_ASSET_TEXT_LIMIT_BYTES) {
    throw createError({
      statusCode: 400,
      statusMessage: "Text content is too large"
    })
  }

  const resolved = resolveDeveloperAssetPath(rootId, entry.path)

  await fs.writeFile(resolved.absolutePath, body.content, "utf8")

  return {
    ...await listDeveloperAssets(rootId, targetDirectoryForResponse(entry.path)),
    entry: await getDeveloperAssetEntry(rootId, entry.path)
  }
}

export async function createDeveloperAssetFile(body: AoiDeveloperAssetRequest): Promise<AoiDeveloperAssetActionResponse> {
  const rootId = assertDeveloperAssetRootId(body.rootId)
  const directory = await ensureDeveloperAssetDirectory(rootId, body.path)
  const name = assertDeveloperAssetName(body.name)
  const targetPath = joinDeveloperAssetPath(directory.path, name)
  const target = resolveDeveloperAssetPath(rootId, targetPath)
  const content = typeof body.content === "string" ? body.content : ""

  if (Buffer.byteLength(content, "utf8") > AOI_DEVELOPER_ASSET_TEXT_LIMIT_BYTES) {
    throw createError({
      statusCode: 400,
      statusMessage: "Text content is too large"
    })
  }

  await assertWritableTargetMissing(target.absolutePath, body.overwrite === true)
  await fs.mkdir(dirname(target.absolutePath), { recursive: true })
  await fs.writeFile(target.absolutePath, content, "utf8")

  return {
    ...await listDeveloperAssets(rootId, directory.path),
    entry: await getDeveloperAssetEntry(rootId, targetPath)
  }
}

export async function createDeveloperAssetDirectory(body: AoiDeveloperAssetRequest): Promise<AoiDeveloperAssetActionResponse> {
  const rootId = assertDeveloperAssetRootId(body.rootId)
  const directory = await ensureDeveloperAssetDirectory(rootId, body.path)
  const name = assertDeveloperAssetName(body.name)
  const targetPath = joinDeveloperAssetPath(directory.path, name)
  const target = resolveDeveloperAssetPath(rootId, targetPath)

  await assertWritableTargetMissing(target.absolutePath, body.overwrite === true)
  await fs.mkdir(target.absolutePath)

  return {
    ...await listDeveloperAssets(rootId, directory.path),
    entry: await getDeveloperAssetEntry(rootId, targetPath)
  }
}

export async function renameDeveloperAsset(body: AoiDeveloperAssetRequest): Promise<AoiDeveloperAssetActionResponse> {
  const rootId = assertDeveloperAssetRootId(body.rootId)
  const source = resolveDeveloperAssetPath(rootId, body.path)
  const sourceEntry = await getDeveloperAssetEntry(rootId, source.path)
  const name = assertDeveloperAssetName(body.name)
  const targetPath = joinDeveloperAssetPath(parentDeveloperAssetPath(source.path), name)
  const target = resolveDeveloperAssetPath(rootId, targetPath)

  if (!source.path) {
    throw createError({
      statusCode: 400,
      statusMessage: "Root cannot be renamed"
    })
  }

  await assertWritableTargetMissing(target.absolutePath, body.overwrite === true)
  await fs.rename(source.absolutePath, target.absolutePath)

  return {
    ...await listDeveloperAssets(rootId, parentDeveloperAssetPath(targetPath)),
    entry: {
      ...await getDeveloperAssetEntry(rootId, targetPath),
      kind: sourceEntry.kind
    }
  }
}

async function resolveMoveTarget(rootId: AoiDeveloperAssetRootId, sourcePath: string, sourceAbsolutePath: string, destinationPath: unknown, overwrite = false) {
  const sourceName = posix.basename(sourcePath)
  const requestedTarget = resolveDeveloperAssetPath(rootId, destinationPath)
  let targetPath = requestedTarget.path
  let targetAbsolutePath = requestedTarget.absolutePath

  if (await pathExists(requestedTarget.absolutePath)) {
    const destinationStat = await assertNotSymlink(requestedTarget.absolutePath)

    if (destinationStat.isDirectory()) {
      targetPath = joinDeveloperAssetPath(requestedTarget.path, sourceName)
      targetAbsolutePath = resolveDeveloperAssetPath(rootId, targetPath).absolutePath
    }
  }

  if (targetAbsolutePath === sourceAbsolutePath) {
    throw createError({
      statusCode: 400,
      statusMessage: "Source and destination are the same"
    })
  }

  await assertWritableTargetMissing(targetAbsolutePath, overwrite)

  return {
    absolutePath: targetAbsolutePath,
    path: targetPath
  }
}

export async function copyDeveloperAsset(body: AoiDeveloperAssetRequest): Promise<AoiDeveloperAssetActionResponse> {
  const rootId = assertDeveloperAssetRootId(body.rootId)
  const source = resolveDeveloperAssetPath(rootId, body.path)
  const sourceEntry = await getDeveloperAssetEntry(rootId, source.path)

  if (!source.path) {
    throw createError({
      statusCode: 400,
      statusMessage: "Root cannot be copied"
    })
  }

  const target = await resolveMoveTarget(rootId, source.path, source.absolutePath, body.destinationPath, body.overwrite === true)

  if (sourceEntry.kind === "directory" && target.absolutePath.startsWith(`${source.absolutePath}${sep}`)) {
    throw createError({
      statusCode: 400,
      statusMessage: "Directory cannot be copied into itself"
    })
  }

  if (sourceEntry.kind === "directory") {
    await fs.cp(source.absolutePath, target.absolutePath, { recursive: true })
  } else {
    await fs.mkdir(dirname(target.absolutePath), { recursive: true })
    await fs.copyFile(source.absolutePath, target.absolutePath)
  }

  return {
    ...await listDeveloperAssets(rootId, parentDeveloperAssetPath(target.path)),
    entry: await getDeveloperAssetEntry(rootId, target.path)
  }
}

export async function moveDeveloperAsset(body: AoiDeveloperAssetRequest): Promise<AoiDeveloperAssetActionResponse> {
  const rootId = assertDeveloperAssetRootId(body.rootId)
  const source = resolveDeveloperAssetPath(rootId, body.path)
  const sourceEntry = await getDeveloperAssetEntry(rootId, source.path)

  if (!source.path) {
    throw createError({
      statusCode: 400,
      statusMessage: "Root cannot be moved"
    })
  }

  const target = await resolveMoveTarget(rootId, source.path, source.absolutePath, body.destinationPath, body.overwrite === true)

  if (sourceEntry.kind === "directory" && target.absolutePath.startsWith(`${source.absolutePath}${sep}`)) {
    throw createError({
      statusCode: 400,
      statusMessage: "Directory cannot be moved into itself"
    })
  }

  await fs.mkdir(dirname(target.absolutePath), { recursive: true })
  await fs.rename(source.absolutePath, target.absolutePath)

  return {
    ...await listDeveloperAssets(rootId, parentDeveloperAssetPath(target.path)),
    entry: await getDeveloperAssetEntry(rootId, target.path)
  }
}

export async function deleteDeveloperAsset(body: AoiDeveloperAssetRequest): Promise<AoiDeveloperAssetActionResponse> {
  const rootId = assertDeveloperAssetRootId(body.rootId)
  const target = resolveDeveloperAssetPath(rootId, body.path)

  if (!target.path) {
    throw createError({
      statusCode: 400,
      statusMessage: "Root cannot be deleted"
    })
  }

  await assertNotSymlink(target.absolutePath)
  await fs.rm(target.absolutePath, { force: true, recursive: true })

  return await listDeveloperAssets(rootId, parentDeveloperAssetPath(target.path))
}

export async function chmodDeveloperAsset(body: AoiDeveloperAssetRequest): Promise<AoiDeveloperAssetActionResponse> {
  const rootId = assertDeveloperAssetRootId(body.rootId)
  const target = resolveDeveloperAssetPath(rootId, body.path)
  const mode = parseMode(body.mode)

  await assertNotSymlink(target.absolutePath)
  await fs.chmod(target.absolutePath, mode)

  const warning = process.platform === "win32"
    ? "Windows uses NTFS ACLs, so chmod is applied on a best-effort basis."
    : undefined

  return {
    ...await listDeveloperAssets(rootId, target.path ? parentDeveloperAssetPath(target.path) : "", warning),
    entry: await getDeveloperAssetEntry(rootId, target.path),
    warning
  }
}

export async function runDeveloperAssetAction(body: AoiDeveloperAssetRequest): Promise<AoiDeveloperAssetActionResponse | AoiDeveloperAssetReadTextResponse> {
  const rootId = body.rootId ? assertDeveloperAssetRootId(body.rootId) : "public"

  switch (body.action || "list") {
    case "chmod":
      return await chmodDeveloperAsset(body)
    case "copy":
      return await copyDeveloperAsset(body)
    case "createDirectory":
      return await createDeveloperAssetDirectory(body)
    case "createFile":
      return await createDeveloperAssetFile(body)
    case "delete":
      return await deleteDeveloperAsset(body)
    case "list":
      return await listDeveloperAssets(rootId, body.path)
    case "move":
      return await moveDeveloperAsset(body)
    case "readText":
      return await readDeveloperTextAsset(body)
    case "rename":
      return await renameDeveloperAsset(body)
    case "writeText":
      return await writeDeveloperTextAsset(body)
    default:
      throw createError({
        statusCode: 400,
        statusMessage: "Unsupported developer asset action"
      })
  }
}

export async function writeUploadedDeveloperAssets(input: {
  files: Array<{
    data: Buffer
    filename: string
  }>
  overwrite: boolean
  path: unknown
  rootId: AoiDeveloperAssetRootId
}): Promise<AoiDeveloperAssetUploadResponse> {
  const directory = await ensureDeveloperAssetDirectory(input.rootId, input.path)
  const targets = input.files.map((file) => {
    const name = assertDeveloperAssetName(file.filename)

    if (file.data.byteLength > AOI_DEVELOPER_ASSET_UPLOAD_LIMIT_BYTES) {
      throw createError({
        statusCode: 413,
        statusMessage: "Uploaded asset is too large"
      })
    }

    const targetPath = joinDeveloperAssetPath(directory.path, name)
    const target = resolveDeveloperAssetPath(input.rootId, targetPath)

    return {
      data: file.data,
      path: targetPath,
      target
    }
  })

  for (const target of targets) {
    await assertWritableTargetMissing(target.target.absolutePath, input.overwrite)
  }

  const uploaded: AoiDeveloperAssetEntry[] = []

  for (const target of targets) {
    await fs.writeFile(target.target.absolutePath, target.data)
    uploaded.push(await getDeveloperAssetEntry(input.rootId, target.path))
  }

  return {
    ...await listDeveloperAssets(input.rootId, directory.path),
    uploaded
  }
}
