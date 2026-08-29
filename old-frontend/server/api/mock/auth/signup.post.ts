import type { CommunitySignupRequest } from "../../../../shared/types/api"
import {
  createMockCommunitySignup,
  mockCommunityAuthCookieName
} from "../../../../shared/mocks/auth"

export default defineEventHandler(async (event) => {
  const body = await readBody<Partial<CommunitySignupRequest>>(event)
  const result = createMockCommunitySignup({
    displayName: typeof body?.displayName === "string" ? body.displayName : undefined,
    email: typeof body?.email === "string" ? body.email : "",
    password: typeof body?.password === "string" ? body.password : "",
    username: typeof body?.username === "string" ? body.username : ""
  })

  if (!result?.session) {
    throw createError({
      statusCode: 400,
      statusMessage: "Invalid community signup"
    })
  }

  setCookie(event, mockCommunityAuthCookieName, result.session.sessionId, {
    httpOnly: true,
    path: "/",
    sameSite: "lax"
  })

  return result
})
