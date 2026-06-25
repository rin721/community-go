import { createError, defineEventHandler, readMultipartFormData } from "h3"
import {
  assertDeveloperAssetApiAvailable,
  assertDeveloperAssetRootId,
  writeUploadedDeveloperAssets
} from "../../../utils/developer-assets"

export default defineEventHandler(async (event) => {
  assertDeveloperAssetApiAvailable()

  const parts = await readMultipartFormData(event)

  if (!parts?.length) {
    throw createError({
      statusCode: 400,
      statusMessage: "No multipart data"
    })
  }

  let rootIdValue: unknown = "public"
  let targetPath: unknown = ""
  let overwrite = false
  const files: Array<{
    data: Buffer
    filename: string
  }> = []

  for (const part of parts) {
    if (part.filename) {
      files.push({
        data: part.data,
        filename: part.filename
      })
      continue
    }

    const value = part.data.toString("utf8")

    if (part.name === "rootId") {
      rootIdValue = value
    } else if (part.name === "path") {
      targetPath = value
    } else if (part.name === "overwrite") {
      overwrite = value === "true"
    }
  }

  if (!files.length) {
    throw createError({
      statusCode: 400,
      statusMessage: "No files to upload"
    })
  }

  return await writeUploadedDeveloperAssets({
    files,
    overwrite,
    path: targetPath,
    rootId: assertDeveloperAssetRootId(rootIdValue)
  })
})
