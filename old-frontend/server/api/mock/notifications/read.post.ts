import { markMockCommunityNotificationsRead } from "../../../../shared/mocks/home"
import type { CommunityNotificationRequest } from "../../../../shared/types/api"

export default defineEventHandler(async (event) => {
  const body = await readBody<CommunityNotificationRequest>(event)
  const payload = markMockCommunityNotificationsRead(String(body?.clientId || ""))

  if (!payload) {
    throw createError({
      statusCode: 400,
      statusMessage: "Invalid notification request"
    })
  }

  return payload
})
