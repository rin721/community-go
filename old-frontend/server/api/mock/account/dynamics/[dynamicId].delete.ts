import { getMockCommunityAccountForSession, mockCommunityAuthCookieName } from "../../../../../shared/mocks/auth"
import { deleteMockCommunityDynamic } from "../../../../../shared/mocks/home"

export default defineEventHandler((event) => {
  const sessionId = getCookie(event, mockCommunityAuthCookieName)
  const account = sessionId ? getMockCommunityAccountForSession(sessionId) : null

  if (!account) {
    throw createError({
      statusCode: 401,
      statusMessage: "Community session not found"
    })
  }

  const dynamicId = getRouterParam(event, "dynamicId") || ""
  const result = deleteMockCommunityDynamic(dynamicId, account.clientId)

  if (!result) {
    throw createError({
      statusCode: 404,
      statusMessage: "Community dynamic not found"
    })
  }

  return result
})
