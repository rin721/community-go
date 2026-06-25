import { getMockCreatorProfile } from "../../../../shared/mocks/home"

export default defineEventHandler((event) => {
  const handle = getRouterParam(event, "handle") || ""
  const creator = getMockCreatorProfile(handle)

  if (!creator) {
    throw createError({
      statusCode: 404,
      statusMessage: "Creator not found"
    })
  }

  return creator
})
