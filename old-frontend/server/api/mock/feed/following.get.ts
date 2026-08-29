import { getMockFollowingFeed } from "../../../../shared/mocks/home"

export default defineEventHandler((event) => {
  const clientId = String(getQuery(event).clientId || "")

  return getMockFollowingFeed(clientId)
})
