import { updateMockVideoComment } from "../../../../../../shared/mocks/home"

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, "id") || ""
  const commentId = getRouterParam(event, "commentId") || ""
  const body = await readBody<{ body?: unknown, clientId?: unknown }>(event)
  const comment = updateMockVideoComment(id, commentId, {
    body: typeof body?.body === "string" ? body.body : "",
    clientId: typeof body?.clientId === "string" ? body.clientId : ""
  })

  if (!comment) {
    throw createError({
      statusCode: 404,
      statusMessage: "Video comment not editable"
    })
  }

  return comment
})
