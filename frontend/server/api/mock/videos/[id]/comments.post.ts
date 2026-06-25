import { createMockVideoComment } from "../../../../../shared/mocks/home"

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, "id") || ""
  const body = await readBody<{ authorName?: unknown, body?: unknown }>(event)
  const comment = createMockVideoComment(id, {
    authorName: typeof body?.authorName === "string" ? body.authorName : "",
    body: typeof body?.body === "string" ? body.body : ""
  })

  if (!comment) {
    throw createError({
      statusCode: 400,
      statusMessage: "Invalid video comment"
    })
  }

  return comment
})
