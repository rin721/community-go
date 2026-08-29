import { updateMockCommunityDynamic } from "../../../../shared/mocks/home"

export default defineEventHandler(async (event) => {
  const dynamicId = getRouterParam(event, "dynamicId") || ""
  const body = await readBody<{
    body?: unknown
    clientId?: unknown
  }>(event)

  if (typeof body?.body !== "string" || typeof body?.clientId !== "string") {
    throw createError({
      statusCode: 400,
      statusMessage: "Invalid community dynamic"
    })
  }

  const dynamic = updateMockCommunityDynamic(dynamicId, {
    body: body.body,
    clientId: body.clientId
  })

  if (!dynamic) {
    throw createError({
      statusCode: 404,
      statusMessage: "Community dynamic not found"
    })
  }

  return dynamic
})
