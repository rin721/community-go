import { clearMockVideoHistory } from "../../../../shared/mocks/home"
import type { VideoHistoryClearRequest } from "../../../../shared/types/api"

export default defineEventHandler(async (event) => {
  const body = await readBody<VideoHistoryClearRequest>(event)
  const payload = clearMockVideoHistory({
    clientId: String(body?.clientId || "")
  })

  if (!payload) {
    throw createError({
      statusCode: 400,
      statusMessage: "Invalid video history clear request"
    })
  }

  return payload
})
