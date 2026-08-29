import { getMockCommunitySession, mockCommunityAuthCookieName } from "../../../../shared/mocks/auth"

export default defineEventHandler(async (event) => {
  const sessionId = getCookie(event, mockCommunityAuthCookieName)
  const session = sessionId ? getMockCommunitySession(sessionId) : null

  if (!session) {
    throw createError({ statusCode: 401, statusMessage: "Unauthorized" })
  }

  const body = await readBody(event)
  const displayName = String(body?.displayName || "").trim()

  if (!displayName) {
    throw createError({ statusCode: 400, statusMessage: "displayName is required" })
  }

  return {
    id: session.userId,
    handle: session.account.handle,
    email: `${session.account.handle}@example.com`,
    displayName,
    role: "registered",
    status: "active",
    createdAt: new Date().toISOString(),
    lastLoginAt: new Date().toISOString()
  }
})
