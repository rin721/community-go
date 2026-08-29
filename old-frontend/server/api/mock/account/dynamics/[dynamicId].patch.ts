import { getMockCommunityAccountForSession, mockCommunityAuthCookieName } from "../../../../../shared/mocks/auth"
import { updateMockCommunityDynamic } from "../../../../../shared/mocks/home"

export default defineEventHandler(async (event) => {
  const sessionId = getCookie(event, mockCommunityAuthCookieName)
  const account = sessionId ? getMockCommunityAccountForSession(sessionId) : null

  if (!account) {
    throw createError({
      statusCode: 401,
      statusMessage: "Community session not found"
    })
  }

  const dynamicId = getRouterParam(event, "dynamicId") || ""
  const body = await readBody<{
    body?: unknown
  }>(event)

  if (typeof body?.body !== "string") {
    throw createError({
      statusCode: 400,
      statusMessage: "Invalid community dynamic"
    })
  }

  const dynamic = updateMockCommunityDynamic(dynamicId, {
    body: body.body,
    clientId: account.clientId
  })

  if (!dynamic) {
    throw createError({
      statusCode: 404,
      statusMessage: "Community dynamic not found"
    })
  }

  return dynamic
})
