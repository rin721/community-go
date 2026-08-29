import { getMockVideoInteractionState } from "../../../../../shared/mocks/home"

export default defineEventHandler((event) => {
  const id = getRouterParam(event, "id") || ""
  const clientId = String(getQuery(event).clientId || "")
  const state = getMockVideoInteractionState(id, clientId)

  if (!state) {
    throw createError({
      statusCode: 404,
      statusMessage: "Video interaction state not found"
    })
  }

  return state
})
