import { getMockCommunityAccountForSession, mockCommunityAuthCookieName } from "../../../../../../shared/mocks/auth"
import { unfollowMockCreator } from "../../../../../../shared/mocks/home"

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
  const state = unfollowMockCreator(handle, account.clientId)

  if (!state) {
    throw createError({ statusCode: 404, statusMessage: "Creator not found" })
  }

  return state
})
