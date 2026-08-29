import { getMockCommunityAccountForSession, mockCommunityAuthCookieName } from "../../../../../../shared/mocks/auth"
import { recordMockVideoHistory } from "../../../../../../shared/mocks/home"

export default defineEventHandler(async (event) => {
  const sessionId = getCookie(event, mockCommunityAuthCookieName)
  const account = sessionId ? getMockCommunityAccountForSession(sessionId) : null

  if (!account) {
    throw createError({
      statusCode: 401,
      statusMessage: "Community session not found"
    })
  }

  const id = String(getRouterParam(event, "id") || "")
  const body = await readBody<{ progressSeconds?: number }>(event)
  const item = recordMockVideoHistory(id, {
    clientId: account.clientId,
    progressSeconds: Number(body?.progressSeconds || 0)
  })

  if (!item) {
    throw createError({ statusCode: 404, statusMessage: "Video history target not found" })
  }

  return item
})
