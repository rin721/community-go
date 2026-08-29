import { getMockCommunityAccountForSession, mockCommunityAuthCookieName } from "../../../../shared/mocks/auth"
import { getMockCommunityNotifications } from "../../../../shared/mocks/home"

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
  const limit = Number(query.limit || 48)
  const payload = getMockCommunityNotifications(account.clientId, Number.isFinite(limit) ? limit : 48)

  if (!payload) {
    throw createError({
      statusCode: 400,
      statusMessage: "Invalid notification request"
    })
  }

  return {
    ...payload,
    authenticated: true,
    message: "社区账号通知会跟随当前登录账号同步。"
  }
})
