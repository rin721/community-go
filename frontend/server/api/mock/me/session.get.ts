import {
  getMockCommunitySession,
  mockCommunityAuthCookieName
} from "../../../../shared/mocks/auth"

export default defineEventHandler((event) => {
  const sessionId = getCookie(event, mockCommunityAuthCookieName)
  const session = sessionId ? getMockCommunitySession(sessionId) : null

  if (!session) {
    throw createError({
      statusCode: 401,
      statusMessage: "Community session not found"
    })
  }

  return session
})
