import { deleteMockCommunityDynamic } from "../../../../shared/mocks/home"

export default defineEventHandler((event) => {
  const dynamicId = getRouterParam(event, "dynamicId") || ""
  const query = getQuery(event)
  const clientId = typeof query.clientId === "string" ? query.clientId : ""

  if (!clientId) {
    throw createError({
      statusCode: 400,
      statusMessage: "Invalid community dynamic client"
    })
  }

  const result = deleteMockCommunityDynamic(dynamicId, clientId)

  if (!result) {
    throw createError({
      statusCode: 404,
      statusMessage: "Community dynamic not found"
    })
  }

  return result
})
