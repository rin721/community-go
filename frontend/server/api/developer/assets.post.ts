import { defineEventHandler, readBody } from "h3"
import type { AoiDeveloperAssetRequest } from "../../../shared/types/developer-assets"
import {
  assertDeveloperAssetApiAvailable,
  runDeveloperAssetAction
} from "../../utils/developer-assets"

export default defineEventHandler(async (event) => {
  assertDeveloperAssetApiAvailable()

  const body = await readBody<AoiDeveloperAssetRequest>(event)

  return await runDeveloperAssetAction(body || { action: "list" })
})
