import { searchMockAll } from "../../../shared/mocks/home"

export default defineEventHandler((event) => {
  const query = getQuery(event)
  const q = typeof query.q === "string" ? query.q : ""
  const limit = typeof query.limit === "string" ? Number(query.limit) : undefined

  return searchMockAll(q, Number.isFinite(limit) ? limit : undefined)
})
