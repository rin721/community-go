import { getMockCommunityAccountForSession, mockCommunityAuthCookieName } from "../../../../shared/mocks/auth"
import { getMockVideoLibrary } from "../../../../shared/mocks/home"

export default defineEventHandler((event) => {
  const sessionId = getCookie(event, mockCommunityAuthCookieName)
  const account = sessionId ? getMockCommunityAccountForSession(sessionId) : null

  if (!account) {
    throw createError({
      statusCode: 401,
      statusMessage: "Community session not found"
    })
  }

  const payload = getMockVideoLibrary(account.clientId)

  if (!payload) {
    throw createError({ statusCode: 400, statusMessage: "Invalid library request" })
  }

  return {
    ...payload,
    authenticated: true,
    message: "社区账号资料库会跟随当前登录账号同步。"
  }
})
