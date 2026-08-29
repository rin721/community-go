import {
  clearMockCommunitySession,
  mockCommunityAuthCookieName
} from "../../../../shared/mocks/auth"

export default defineEventHandler((event) => {
  const sessionId = getCookie(event, mockCommunityAuthCookieName)

  if (sessionId) {
    clearMockCommunitySession(sessionId)
  }

  deleteCookie(event, mockCommunityAuthCookieName, {
    path: "/"
  })

  return {
    loggedOut: true
  }
})
