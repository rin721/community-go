import { createReadStream } from "node:fs"
import { extname } from "node:path"
import { createError, defineEventHandler, getQuery, sendStream, setHeader } from "h3"
import {
  assertDeveloperAssetApiAvailable,
  assertDeveloperAssetRootId,
  getDeveloperAssetEntry,
  resolveDeveloperAssetPath
} from "../../../utils/developer-assets"

const contentTypes: Record<string, string> = {
  ".css": "text/css; charset=utf-8",
  ".csv": "text/csv; charset=utf-8",
  ".gif": "image/gif",
  ".html": "text/html; charset=utf-8",
  ".jpeg": "image/jpeg",
  ".jpg": "image/jpeg",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".md": "text/markdown; charset=utf-8",
  ".mp3": "audio/mpeg",
  ".mp4": "video/mp4",
  ".png": "image/png",
  ".svg": "image/svg+xml; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
  ".webm": "video/webm",
  ".webp": "image/webp",
  ".xml": "application/xml; charset=utf-8"
}

function contentDisposition(name: string) {
  const fallback = name.replace(/[^\x20-\x7e]+/g, "_").replace(/["\\]/g, "_")

  return `attachment; filename="${fallback}"; filename*=UTF-8''${encodeURIComponent(name)}`
}

export default defineEventHandler(async (event) => {
  assertDeveloperAssetApiAvailable()

  const query = getQuery(event)
  const rootId = assertDeveloperAssetRootId(query.rootId)
  const entry = await getDeveloperAssetEntry(rootId, query.path)

  if (entry.kind !== "file") {
    throw createError({
      statusCode: 400,
      statusMessage: "Only files can be downloaded"
    })
  }

  const resolved = resolveDeveloperAssetPath(rootId, entry.path)
  const extension = extname(entry.name).toLowerCase()

  setHeader(event, "content-type", contentTypes[extension] || "application/octet-stream")
  setHeader(event, "content-length", entry.size)
  setHeader(event, "content-disposition", contentDisposition(entry.name))

  return sendStream(event, createReadStream(resolved.absolutePath))
})
