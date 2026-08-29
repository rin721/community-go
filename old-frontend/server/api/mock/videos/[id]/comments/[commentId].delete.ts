import { deleteMockVideoComment } from "../../../../../../shared/mocks/home"

export default defineEventHandler((event) => {
  const id = getRouterParam(event, "id") || ""
  const commentId = getRouterParam(event, "commentId") || ""
  const query = getQuery(event)
  const payload = deleteMockVideoComment(id, commentId, typeof query.clientId === "string" ? query.clientId : "")

  if (!payload) {
    throw createError({
      statusCode: 404,
      statusMessage: "Video comment not deletable"
    })
  }

  return payload
})
