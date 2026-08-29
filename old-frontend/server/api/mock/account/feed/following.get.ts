import { getMockCommunityAccountForSession, mockCommunityAuthCookieName } from "../../../../../shared/mocks/auth"
import { getMockFollowingFeed } from "../../../../../shared/mocks/home"

export default defineEventHandler((event) => {
  const sessionId = getCookie(event, mockCommunityAuthCookieName)
  const account = sessionId ? getMockCommunityAccountForSession(sessionId) : null

  if (!account) {
    throw createError({
      statusCode: 401,
      statusMessage: "Community session not found"
    })
  }

  const payload = getMockFollowingFeed(account.clientId)

  return {
    ...payload,
    authenticated: true,
    message: "社区账号关注动态会跟随当前登录账号同步。"
  }
})
