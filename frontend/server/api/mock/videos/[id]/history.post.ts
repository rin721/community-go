import { recordMockVideoHistory } from "../../../../../shared/mocks/home"
import type { VideoHistoryRequest } from "../../../../../shared/types/api"

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, "id") || ""
  const body = await readBody<VideoHistoryRequest>(event)
  const item = recordMockVideoHistory(id, {
    clientId: String(body?.clientId || ""),
    progressSeconds: Number(body?.progressSeconds || 0)
  })

  if (!item) {
    throw createError({
      statusCode: 400,
      statusMessage: "Invalid video history request"
    })
  }

  return item
})
