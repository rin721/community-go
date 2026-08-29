import { getMockCommunityAccountForSession, mockCommunityAuthCookieName } from "../../../../../../shared/mocks/auth"
import { getMockCreatorFollowState } from "../../../../../../shared/mocks/home"

export default defineEventHandler((event) => {
  const sessionId = getCookie(event, mockCommunityAuthCookieName)
  const account = sessionId ? getMockCommunityAccountForSession(sessionId) : null

  if (!account) {
    throw createError({
      statusCode: 401,
      statusMessage: "Community session not found"
    })
  }

  const handle = String(getRouterParam(event, "handle") || "")
  const state = getMockCreatorFollowState(handle, account.clientId)

  if (!state) {
    throw createError({ statusCode: 404, statusMessage: "Creator follow state not found" })
  }

  return state
})
