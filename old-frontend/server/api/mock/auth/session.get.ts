import {
  getMockCommunitySession,
  mockCommunityAuthCookieName
} from "../../../../shared/mocks/auth"
import { mockUsers } from "../../../../shared/mocks/home"

export default defineEventHandler((event) => {
  const sessionId = getCookie(event, mockCommunityAuthCookieName)
  const session = sessionId ? getMockCommunitySession(sessionId) : null

  if (session) {
    const handle = session.account.handle
    if (!mockUsers[handle]) {
      mockUsers[handle] = {
        id: session.userId,
        handle,
        displayName: session.account.displayName,
        avatarUrl: `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(session.account.displayName)}`
      }
    }
  }

  return session || null
})
