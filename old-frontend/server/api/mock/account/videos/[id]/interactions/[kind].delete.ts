import { getMockCommunityAccountForSession, mockCommunityAuthCookieName } from "../../../../../../../shared/mocks/auth"
import { unsetMockVideoInteraction } from "../../../../../../../shared/mocks/home"
import type { VideoInteractionKind } from "../../../../../../../shared/types/api"

export default defineEventHandler((event) => {
  const sessionId = getCookie(event, mockCommunityAuthCookieName)
  const account = sessionId ? getMockCommunityAccountForSession(sessionId) : null

  if (!account) {
    throw createError({
      statusCode: 401,
      statusMessage: "Community session not found"
    })
  }

  const id = String(getRouterParam(event, "id") || "")
  const kind = String(getRouterParam(event, "kind") || "") as VideoInteractionKind
  const state = unsetMockVideoInteraction(id, kind, account.clientId)

  if (!state) {
    throw createError({ statusCode: 404, statusMessage: "Video interaction target not found" })
  }

  return state
})
