import { getMockVideoHistory } from "../../../shared/mocks/home"

export default defineEventHandler((event) => {
  const clientId = String(getQuery(event).clientId || "")
  const limitValue = Number(getQuery(event).limit || 48)
  const payload = getMockVideoHistory(clientId, Number.isFinite(limitValue) ? limitValue : 48)

  if (!payload) {
    throw createError({
      statusCode: 400,
      statusMessage: "Invalid video history request"
    })
  }

  return payload
})
