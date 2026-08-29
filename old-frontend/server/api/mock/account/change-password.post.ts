import { getMockCommunitySession, mockCommunityAuthCookieName } from "../../../../shared/mocks/auth"

export default defineEventHandler(async (event) => {
  const sessionId = getCookie(event, mockCommunityAuthCookieName)
  const session = sessionId ? getMockCommunitySession(sessionId) : null

  if (!session) {
    throw createError({ statusCode: 401, statusMessage: "Unauthorized" })
  }

  const body = await readBody(event)
  const currentPassword = String(body?.currentPassword || "").trim()
  const newPassword = String(body?.newPassword || "").trim()

  if (!currentPassword || newPassword.length < 8) {
    throw createError({ statusCode: 400, statusMessage: "Invalid password" })
  }

  // [mock] always succeeds — real mode verifies with backend bcrypt
  return { changed: true }
})
