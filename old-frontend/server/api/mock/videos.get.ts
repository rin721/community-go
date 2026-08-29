import { listMockVideos } from "../../../shared/mocks/home"

export default defineEventHandler((event) => {
  const query = getQuery(event)
  const category = typeof query.category === "string" ? query.category : undefined
  const limit = typeof query.limit === "string" ? Number(query.limit) : undefined

  return {
    items: listMockVideos({
      category,
      limit: Number.isFinite(limit) ? limit : undefined
    }),
    nextCursor: null
  }
})
