import { getMockVideoLibrary } from "../../../shared/mocks/home"

export default defineEventHandler((event) => {
  const clientId = String(getQuery(event).clientId || "")
  const payload = getMockVideoLibrary(clientId)

  if (!payload) {
    throw createError({
      statusCode: 400,
      statusMessage: "Invalid video library request"
    })
  }

  return payload
})
