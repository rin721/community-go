import { unfollowMockCreator } from "../../../../../shared/mocks/home"

export default defineEventHandler((event) => {
  const handle = String(getRouterParam(event, "handle") || "")
  const clientId = String(getQuery(event).clientId || "")
  const state = unfollowMockCreator(handle, clientId)

  if (!state) {
    throw createError({ statusCode: 404, statusMessage: "Creator not found" })
  }

  return state
})
