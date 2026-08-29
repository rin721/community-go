import { getMockCommunityAccountForSession, mockCommunityAuthCookieName } from "../../../../../shared/mocks/auth"
import { clearMockVideoHistory } from "../../../../../shared/mocks/home"

export default defineEventHandler((event) => {
  const sessionId = getCookie(event, mockCommunityAuthCookieName)
  const account = sessionId ? getMockCommunityAccountForSession(sessionId) : null

  if (!account) {
    throw createError({
      statusCode: 401,
      statusMessage: "Community session not found"
    })
  }

  const payload = clearMockVideoHistory({ clientId: account.clientId })

  if (!payload) {
    throw createError({ statusCode: 400, statusMessage: "Invalid history request" })
  }

  return {
    ...payload,
    authenticated: true,
    message: "社区账号观看历史会跟随当前登录账号同步。"
  }
})
