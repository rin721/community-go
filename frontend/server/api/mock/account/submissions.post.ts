import { getMockCommunityAccountForSession, mockCommunityAuthCookieName } from "../../../../shared/mocks/auth"
import { createMockCommunitySubmission } from "../../../../shared/mocks/home"
import type { CommunitySubmissionVisibility } from "../../../../shared/types/api"

export default defineEventHandler(async (event) => {
  const sessionId = getCookie(event, mockCommunityAuthCookieName)
  const account = sessionId ? getMockCommunityAccountForSession(sessionId) : null

  if (!account) {
    throw createError({
      statusCode: 401,
      statusMessage: "Community session not found"
    })
  }

  const body = await readBody<{
    allowComments?: unknown
    categorySlug?: unknown
    description?: unknown
    sensitive?: unknown
    sourceName?: unknown
    sourceSize?: unknown
    sourceType?: unknown
    tags?: unknown
    title?: unknown
    visibility?: unknown
  }>(event)
  const visibility = typeof body?.visibility === "string" && isSubmissionVisibility(body.visibility)
    ? body.visibility
    : "public"
  const submission = createMockCommunitySubmission({
    allowComments: Boolean(body?.allowComments),
    authorName: account.authorName,
    categorySlug: typeof body?.categorySlug === "string" ? body.categorySlug : "",
    clientId: account.clientId,
    description: typeof body?.description === "string" ? body.description : "",
    sensitive: Boolean(body?.sensitive),
    sourceName: typeof body?.sourceName === "string" ? body.sourceName : "",
    sourceSize: Number(body?.sourceSize || 0),
    sourceType: typeof body?.sourceType === "string" ? body.sourceType : "",
    tags: Array.isArray(body?.tags) ? body.tags.filter((tag): tag is string => typeof tag === "string") : [],
    title: typeof body?.title === "string" ? body.title : "",
    visibility
  })

  if (!submission) {
    throw createError({
      statusCode: 400,
      statusMessage: "Invalid submission request"
    })
  }

  return submission
})

function isSubmissionVisibility(value: string): value is CommunitySubmissionVisibility {
  return value === "public" || value === "unlisted" || value === "private"
}
