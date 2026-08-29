import { createMockVideoReport } from "../../../../../shared/mocks/home"

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, "id") || ""
  const body = await readBody<{
    clientId?: unknown
    detail?: unknown
    reason?: unknown
  }>(event)
  const reason = body?.reason === "spam"
    || body?.reason === "abuse"
    || body?.reason === "copyright"
    || body?.reason === "misleading"
    || body?.reason === "other"
    ? body.reason
    : null

  if (!reason) {
    throw createError({
      statusCode: 400,
      statusMessage: "Invalid video report"
    })
  }

  const report = createMockVideoReport(id, {
    clientId: typeof body?.clientId === "string" ? body.clientId : "",
    detail: typeof body?.detail === "string" ? body.detail : "",
    reason
  })

  if (!report) {
    throw createError({
      statusCode: 400,
      statusMessage: "Invalid video report"
    })
  }

  return report
})
