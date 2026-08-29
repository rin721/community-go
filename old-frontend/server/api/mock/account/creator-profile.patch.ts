import { getMockCommunitySession, mockCommunityAuthCookieName } from "../../../../shared/mocks/auth"

export default defineEventHandler(async (event) => {
  const sessionId = getCookie(event, mockCommunityAuthCookieName)
  const session = sessionId ? getMockCommunitySession(sessionId) : null

  if (!session) {
    throw createError({ statusCode: 401, statusMessage: "Unauthorized" })
  }

  const body = await readBody(event)

  // [mock] echo back the changes — in real mode the backend persists them
  return {
    id: session.userId,
    handle: session.account.handle,
    email: `${session.account.handle}@example.com`,
    displayName: session.account.displayName,
    role: "creator",
    status: "active",
    createdAt: new Date().toISOString(),
    bio: body?.bio ?? null,
    avatarUrl: body?.avatarUrl ?? null
  }
})
