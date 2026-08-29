import { createMockVideoDanmaku } from "../../../../../shared/mocks/home"

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, "id") || ""
  const body = await readBody<{
    authorName?: unknown
    body?: unknown
    color?: unknown
    mode?: unknown
    timeSeconds?: unknown
  }>(event)
  const item = createMockVideoDanmaku(id, {
    authorName: typeof body?.authorName === "string" ? body.authorName : "",
    body: typeof body?.body === "string" ? body.body : "",
    color: typeof body?.color === "string" ? body.color : "",
    mode: body?.mode === "top" || body?.mode === "bottom" || body?.mode === "scroll" ? body.mode : "scroll",
    timeSeconds: typeof body?.timeSeconds === "number" ? body.timeSeconds : 0
  })

  if (!item) {
    throw createError({
      statusCode: 400,
      statusMessage: "Invalid video danmaku"
    })
  }

  return item
})
