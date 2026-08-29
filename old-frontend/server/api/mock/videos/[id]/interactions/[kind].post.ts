import { setMockVideoInteraction } from "../../../../../../shared/mocks/home"
import type { VideoInteractionKind, VideoInteractionRequest } from "../../../../../../shared/types/api"

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, "id") || ""
  const kind = String(getRouterParam(event, "kind") || "") as VideoInteractionKind
  const body = await readBody<VideoInteractionRequest>(event)
  const state = setMockVideoInteraction(id, kind, {
    clientId: String(body?.clientId || "")
  })

  if (!state) {
    throw createError({
      statusCode: 400,
      statusMessage: "Invalid video interaction"
    })
  }

  return state
})
