import { getMockCommunityNotifications } from "../../../shared/mocks/home"

export default defineEventHandler((event) => {
  const query = getQuery(event)
  const clientId = String(query.clientId || "")
  const limit = Number(query.limit || 48)
  const payload = getMockCommunityNotifications(clientId, Number.isFinite(limit) ? limit : 48)

  if (!payload) {
    throw createError({
      statusCode: 400,
      statusMessage: "Invalid notification request"
    })
  }

  return payload
})
