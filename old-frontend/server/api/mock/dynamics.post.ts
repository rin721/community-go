import { createMockCommunityDynamic } from "../../../shared/mocks/home"

export default defineEventHandler(async (event) => {
  const body = await readBody<{
    authorName?: unknown
    body?: unknown
    clientId?: unknown
    videoId?: unknown
  }>(event)
  const dynamic = createMockCommunityDynamic({
    authorName: typeof body?.authorName === "string" ? body.authorName : "",
    body: typeof body?.body === "string" ? body.body : "",
    clientId: typeof body?.clientId === "string" ? body.clientId : "",
    videoId: typeof body?.videoId === "string" ? body.videoId : undefined
  })

  if (!dynamic) {
    throw createError({
      statusCode: 400,
      statusMessage: "Invalid community dynamic"
    })
  }

  return dynamic
})
