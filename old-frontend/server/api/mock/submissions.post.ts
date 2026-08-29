import { createMockCommunitySubmission } from "../../../shared/mocks/home"
import type { CommunitySubmissionVisibility } from "../../../shared/types/api"

export default defineEventHandler(async (event) => {
  const body = await readBody<{
    allowComments?: unknown
    authorName?: unknown
    categorySlug?: unknown
    clientId?: unknown
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
    authorName: typeof body?.authorName === "string" ? body.authorName : "",
    categorySlug: typeof body?.categorySlug === "string" ? body.categorySlug : "",
    clientId: typeof body?.clientId === "string" ? body.clientId : "",
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
