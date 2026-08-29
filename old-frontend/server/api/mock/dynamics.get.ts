import { getMockCommunityDynamics } from "../../../shared/mocks/home"

export default defineEventHandler((event) => {
  const query = getQuery(event)
  const clientId = String(query.clientId || "")
  const limit = Number(query.limit || 24)

  return getMockCommunityDynamics(clientId, Number.isFinite(limit) ? limit : 24)
})
