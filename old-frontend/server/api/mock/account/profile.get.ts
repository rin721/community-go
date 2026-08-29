import { getMockCommunitySession, mockCommunityAuthCookieName } from "../../../../shared/mocks/auth"
import { mockUsers } from "../../../../shared/mocks/home"

export default defineEventHandler(async (event) => {
  const sessionId = getCookie(event, mockCommunityAuthCookieName)
  const session = sessionId ? getMockCommunitySession(sessionId) : null

  if (!session) {
    throw createError({ statusCode: 401, statusMessage: "Unauthorized" })
  }

  const handle = session.account.handle
  if (!mockUsers[handle]) {
    mockUsers[handle] = {
      id: session.userId,
      handle,
      displayName: session.account.displayName,
      avatarUrl: `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(session.account.displayName)}`
    }
  }

  return {
    id: session.userId,
    handle: session.account.handle,
    email: `${session.account.handle}@example.com`,
    displayName: session.account.displayName,
    role: "registered",
    status: "active",
    createdAt: new Date().toISOString(),
    lastLoginAt: new Date().toISOString()
  }
})
