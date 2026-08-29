import { getMockCommunityAccountForSession, mockCommunityAuthCookieName } from "../../../../shared/mocks/auth"
import { getMockCommunitySubmissions } from "../../../../shared/mocks/home"

export default defineEventHandler((event) => {
  const sessionId = getCookie(event, mockCommunityAuthCookieName)
  const account = sessionId ? getMockCommunityAccountForSession(sessionId) : null

  if (!account) {
    throw createError({
      statusCode: 401,
      statusMessage: "Community session not found"
    })
  }

  const query = getQuery(event)
  const limit = Number(query.limit || 24)
  const payload = getMockCommunitySubmissions(account.clientId, Number.isFinite(limit) ? limit : 24)

  if (!payload) {
    throw createError({
      statusCode: 400,
      statusMessage: "Invalid submission request"
    })
  }

  return {
    ...payload,
    authenticated: true,
    message: "Community account submissions are stored in the shared review queue."
  }
})
