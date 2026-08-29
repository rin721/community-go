import { unsetMockVideoInteraction } from "../../../../../../shared/mocks/home"
import type { VideoInteractionKind } from "../../../../../../shared/types/api"

export default defineEventHandler((event) => {
  const id = getRouterParam(event, "id") || ""
  const kind = String(getRouterParam(event, "kind") || "") as VideoInteractionKind
  const clientId = String(getQuery(event).clientId || "")
  const state = unsetMockVideoInteraction(id, kind, clientId)

  if (!state) {
    throw createError({
      statusCode: 400,
      statusMessage: "Invalid video interaction"
    })
  }

  return state
})
