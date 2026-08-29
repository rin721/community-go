import { followMockCreator } from "../../../../../shared/mocks/home"
import type { CreatorFollowRequest } from "../../../../../shared/types/api"

export default defineEventHandler(async (event) => {
  const handle = String(getRouterParam(event, "handle") || "")
  const body = await readBody<CreatorFollowRequest>(event)
  const state = followMockCreator(handle, {
    clientId: String(body?.clientId || "")
  })

  if (!state) {
    throw createError({ statusCode: 404, statusMessage: "Creator not found" })
  }

  return state
})
