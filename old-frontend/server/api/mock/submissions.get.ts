import { getMockCommunitySubmissions } from "../../../shared/mocks/home"

export default defineEventHandler((event) => {
  const query = getQuery(event)
  const clientId = String(query.clientId || "")
  const limit = Number(query.limit || 24)
  const payload = getMockCommunitySubmissions(clientId, Number.isFinite(limit) ? limit : 24)

  if (!payload) {
    throw createError({
      statusCode: 400,
      statusMessage: "Invalid submission request"
    })
  }

  return payload
})
