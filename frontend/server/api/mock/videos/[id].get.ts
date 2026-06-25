import { getMockVideoDetail } from "../../../../shared/mocks/home"

export default defineEventHandler((event) => {
  const id = getRouterParam(event, "id") || ""
  const video = getMockVideoDetail(id)

  if (!video) {
    throw createError({
      statusCode: 404,
      statusMessage: "Video not found"
    })
  }

  return video
})
