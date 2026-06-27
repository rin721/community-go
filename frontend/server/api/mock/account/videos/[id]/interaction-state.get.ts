import { getMockCommunityAccountForSession, mockCommunityAuthCookieName } from "../../../../../../shared/mocks/auth"
import { getMockVideoInteractionState } from "../../../../../../shared/mocks/home"

export default defineEventHandler((event) => {
  const sessionId = getCookie(event, mockCommunityAuthCookieName)
  const account = sessionId ? getMockCommunityAccountForSession(sessionId) : null

  if (!account) {
    throw createError({
      statusCode: 401,
      statusMessage: "Community session not found"
    })
  }

  const id = String(getRouterParam(event, "id") || "")
  const state = getMockVideoInteractionState(id, account.clientId)

  if (!state) {
    throw createError({ statusCode: 404, statusMessage: "Video interaction state not found" })
  }

  return state
})
