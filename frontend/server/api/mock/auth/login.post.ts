import type { LoginRequest } from "../../../../shared/types/api"
import {
  createMockCommunityLogin,
  mockCommunityAuthCookieName
} from "../../../../shared/mocks/auth"

export default defineEventHandler(async (event) => {
  const body = await readBody<Partial<LoginRequest>>(event)
  const session = createMockCommunityLogin({
    identifier: typeof body?.identifier === "string" ? body.identifier : "",
    password: typeof body?.password === "string" ? body.password : ""
  })

  if (!session) {
    throw createError({
      statusCode: 401,
      statusMessage: "Invalid community login"
    })
  }

  setCookie(event, mockCommunityAuthCookieName, session.sessionId, {
    httpOnly: true,
    path: "/",
    sameSite: "lax"
  })

  return session
})
