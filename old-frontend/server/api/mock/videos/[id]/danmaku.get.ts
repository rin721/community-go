import { getMockVideoDanmaku } from "../../../../../shared/mocks/home"

export default defineEventHandler((event) => {
  const id = getRouterParam(event, "id") || ""
  const payload = getMockVideoDanmaku(id)

  if (!payload) {
    throw createError({
      statusCode: 404,
      statusMessage: "Video danmaku not found"
    })
  }

  return payload
})
