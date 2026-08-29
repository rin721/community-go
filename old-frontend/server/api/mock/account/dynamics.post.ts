import { getMockCommunityAccountForSession, mockCommunityAuthCookieName } from "../../../../shared/mocks/auth"
import { createMockCommunityDynamic } from "../../../../shared/mocks/home"

export default defineEventHandler(async (event) => {
  const sessionId = getCookie(event, mockCommunityAuthCookieName)
  const account = sessionId ? getMockCommunityAccountForSession(sessionId) : null

  if (!account) {
    throw createError({
      statusCode: 401,
      statusMessage: "Community session not found"
    })
  }

  const body = await readBody<{
    body?: unknown
    videoId?: unknown
  }>(event)
  const dynamic = createMockCommunityDynamic({
    authorName: account.authorName,
    body: typeof body?.body === "string" ? body.body : "",
    clientId: account.clientId,
    videoId: typeof body?.videoId === "string" ? body.videoId : undefined
  })

  if (!dynamic) {
    throw createError({
      statusCode: 400,
      statusMessage: "Invalid community dynamic"
    })
  }

  return dynamic
})
