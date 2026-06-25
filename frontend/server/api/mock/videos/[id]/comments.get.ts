import { getMockVideoComments } from "../../../../../shared/mocks/home"
import type { VideoCommentSortMode } from "../../../../../shared/types/api"

export default defineEventHandler((event) => {
  const id = getRouterParam(event, "id") || ""
  const query = getQuery(event)
  const limit = typeof query.limit === "string" ? Number(query.limit) : undefined
  const sort = query.sort === "oldest" ? "oldest" : "newest"
  const payload = getMockVideoComments(id, {
    limit: Number.isFinite(limit) ? limit : undefined,
    sort: sort as VideoCommentSortMode
  })

  if (!payload) {
    throw createError({
      statusCode: 404,
      statusMessage: "Video comments not found"
    })
  }

  return payload
})
