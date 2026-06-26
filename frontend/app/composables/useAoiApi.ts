import type {
  AoiApiErrorPayload,
  ApiResultEnvelope,
  ApiStatus,
  CategoryTreeNode,
  CommunityDynamicItem,
  CommunityDynamicPayload,
  CommunityNotificationPayload,
  CommunityNotificationRequest,
  CommunityReportReceipt,
  CommunitySubmissionItem,
  CommunitySubmissionPayload,
  CreatorFollowState,
  CreateCommunityDynamicRequest,
  CreateCommunitySubmissionRequest,
  CreateVideoCommentRequest,
  CreateVideoDanmakuRequest,
  CreateVideoReportRequest,
  CreatorFollowRequest,
  CreatorProfile,
  ErrorResponse,
  FollowingFeedPayload,
  HomePayload,
  PageResult,
  SearchPayload,
  VideoComment,
  VideoCommentPayload,
  VideoCommentSortMode,
  VideoDanmakuItem,
  VideoDanmakuPayload,
  VideoDetail,
  VideoInteractionKind,
  VideoInteractionRequest,
  VideoInteractionState,
  VideoLibraryPayload,
  VideoSummary
} from "~/types/api"
import { findCategoryInTree } from "~~/shared/utils/categories"

type RequestOptions = {
  body?: unknown
  method?: "DELETE" | "GET" | "POST"
  query?: Record<string, unknown>
}

export function useAoiApi() {
  const config = useRuntimeConfig()
  const telemetry = useAoiApiTelemetry()
  const baseURL = computed(() => config.public.apiMock ? "/api/mock" : config.public.apiBaseURL)

  async function request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
    try {
      const response = await $fetch<unknown>(endpoint, {
        baseURL: baseURL.value,
        body: options.body as BodyInit | Record<string, unknown> | null | undefined,
        method: options.method,
        query: options.query
      })

      return unwrapApiResponse<T>(response, endpoint)
    } catch (error) {
      const apiError = isAoiApiErrorPayload(error) ? error : toAoiApiError(error, endpoint)

      telemetry.recordError(apiError)
      throw apiError
    }
  }

  async function getApiStatus(): Promise<ApiStatus> {
    return await request<ApiStatus>("/status")
  }

  async function getHomePayload(): Promise<HomePayload> {
    return await request<HomePayload>("/home")
  }

  async function getCommunityDynamics(params: {
    clientId?: string
    limit?: number
  } = {}): Promise<CommunityDynamicPayload> {
    return await request<CommunityDynamicPayload>("/dynamics", {
      query: params
    })
  }

  async function createCommunityDynamic(body: CreateCommunityDynamicRequest): Promise<CommunityDynamicItem> {
    return await request<CommunityDynamicItem>("/dynamics", {
      body,
      method: "POST"
    })
  }

  async function getCommunitySubmissions(clientId: string, limit = 24): Promise<CommunitySubmissionPayload> {
    return await request<CommunitySubmissionPayload>("/submissions", {
      query: { clientId, limit }
    })
  }

  async function createCommunitySubmission(body: CreateCommunitySubmissionRequest): Promise<CommunitySubmissionItem> {
    return await request<CommunitySubmissionItem>("/submissions", {
      body,
      method: "POST"
    })
  }

  async function listCategories(): Promise<CategoryTreeNode[]> {
    return await request<CategoryTreeNode[]>("/categories")
  }

  async function listVideos(params: {
    category?: string
    cursor?: string | null
    limit?: number
  } = {}): Promise<PageResult<VideoSummary>> {
    return await request<PageResult<VideoSummary>>("/videos", {
      query: params
    })
  }

  async function search(params: {
    limit?: number
    q: string
  }): Promise<SearchPayload> {
    return await request<SearchPayload>("/search", {
      query: params
    })
  }

  async function searchVideos(params: {
    limit?: number
    q: string
  }): Promise<PageResult<VideoSummary>> {
    const payload = await search(params)

    return payload.videos
  }

  async function getVideoDetail(idOrSlug: string): Promise<VideoDetail> {
    return await request<VideoDetail>(`/videos/${encodeURIComponent(idOrSlug)}`)
  }

  async function getVideoDanmaku(idOrSlug: string): Promise<VideoDanmakuPayload> {
    return await request<VideoDanmakuPayload>(`/videos/${encodeURIComponent(idOrSlug)}/danmaku`)
  }

  async function createVideoDanmaku(idOrSlug: string, body: CreateVideoDanmakuRequest): Promise<VideoDanmakuItem> {
    return await request<VideoDanmakuItem>(`/videos/${encodeURIComponent(idOrSlug)}/danmaku`, {
      body,
      method: "POST"
    })
  }

  async function createVideoReport(idOrSlug: string, body: CreateVideoReportRequest): Promise<CommunityReportReceipt> {
    return await request<CommunityReportReceipt>(`/videos/${encodeURIComponent(idOrSlug)}/reports`, {
      body,
      method: "POST"
    })
  }

  async function getVideoComments(idOrSlug: string, params: {
    limit?: number
    sort?: VideoCommentSortMode
  } = {}): Promise<VideoCommentPayload> {
    return await request<VideoCommentPayload>(`/videos/${encodeURIComponent(idOrSlug)}/comments`, {
      query: params
    })
  }

  async function createVideoComment(idOrSlug: string, body: CreateVideoCommentRequest): Promise<VideoComment> {
    return await request<VideoComment>(`/videos/${encodeURIComponent(idOrSlug)}/comments`, {
      body,
      method: "POST"
    })
  }

  async function getVideoInteractionState(idOrSlug: string, clientId: string): Promise<VideoInteractionState> {
    return await request<VideoInteractionState>(`/videos/${encodeURIComponent(idOrSlug)}/interaction-state`, {
      query: { clientId }
    })
  }

  async function setVideoInteraction(idOrSlug: string, kind: VideoInteractionKind, body: VideoInteractionRequest): Promise<VideoInteractionState> {
    return await request<VideoInteractionState>(`/videos/${encodeURIComponent(idOrSlug)}/interactions/${encodeURIComponent(kind)}`, {
      body,
      method: "POST"
    })
  }

  async function unsetVideoInteraction(idOrSlug: string, kind: VideoInteractionKind, clientId: string): Promise<VideoInteractionState> {
    return await request<VideoInteractionState>(`/videos/${encodeURIComponent(idOrSlug)}/interactions/${encodeURIComponent(kind)}`, {
      method: "DELETE",
      query: { clientId }
    })
  }

  async function getCreatorProfile(handle: string): Promise<CreatorProfile> {
    return await request<CreatorProfile>(`/users/${encodeURIComponent(handle)}`)
  }

  async function getCreatorFollowState(handle: string, clientId: string): Promise<CreatorFollowState> {
    return await request<CreatorFollowState>(`/users/${encodeURIComponent(handle)}/follow-state`, {
      query: { clientId }
    })
  }

  async function followCreator(handle: string, body: CreatorFollowRequest): Promise<CreatorFollowState> {
    return await request<CreatorFollowState>(`/users/${encodeURIComponent(handle)}/follow`, {
      body,
      method: "POST"
    })
  }

  async function unfollowCreator(handle: string, clientId: string): Promise<CreatorFollowState> {
    return await request<CreatorFollowState>(`/users/${encodeURIComponent(handle)}/follow`, {
      method: "DELETE",
      query: { clientId }
    })
  }

  async function getFollowingFeed(clientId?: string): Promise<FollowingFeedPayload> {
    return await request<FollowingFeedPayload>("/feed/following", {
      query: clientId ? { clientId } : undefined
    })
  }

  async function getVideoLibrary(clientId: string): Promise<VideoLibraryPayload> {
    return await request<VideoLibraryPayload>("/library", {
      query: { clientId }
    })
  }

  async function getCommunityNotifications(clientId: string, limit = 48): Promise<CommunityNotificationPayload> {
    return await request<CommunityNotificationPayload>("/notifications", {
      query: { clientId, limit }
    })
  }

  async function markCommunityNotificationsRead(body: CommunityNotificationRequest): Promise<CommunityNotificationPayload> {
    return await request<CommunityNotificationPayload>("/notifications/read", {
      body,
      method: "POST"
    })
  }

  async function getCategory(slug: string): Promise<CategoryTreeNode | null> {
    const categories = await listCategories()

    return findCategoryInTree(categories, slug)
  }

  return {
    getApiStatus,
    getCategory,
    getCreatorFollowState,
    getCreatorProfile,
    getCommunityDynamics,
    getFollowingFeed,
    getVideoInteractionState,
    getVideoLibrary,
    followCreator,
    createCommunityDynamic,
    createCommunitySubmission,
    getHomePayload,
    getCommunityNotifications,
    getCommunitySubmissions,
    createVideoComment,
    createVideoDanmaku,
    createVideoReport,
    getVideoDanmaku,
    getVideoComments,
    getVideoDetail,
    listCategories,
    listVideos,
    search,
    searchVideos,
    markCommunityNotificationsRead,
    setVideoInteraction,
    unfollowCreator,
    unsetVideoInteraction
  }
}

function unwrapApiResponse<T>(response: unknown, endpoint: string): T {
  if (!isApiResultEnvelope<T>(response)) {
    return response as T
  }

  if (response.code !== 0) {
    throw {
      code: String(response.code),
      endpoint,
      message: response.message || response.messageKey || "请求暂时失败，请稍后重试。",
      requestId: response.traceId || `aoi-local-${Date.now()}`,
      statusCode: 200
    } satisfies AoiApiErrorPayload
  }

  return response.data as T
}

function toAoiApiError(error: unknown, endpoint: string): AoiApiErrorPayload {
  const fetchError = error as {
    data?: ErrorResponse | ApiResultEnvelope<unknown>
    message?: string
    status?: number
    statusCode?: number
    statusMessage?: string
  }
  const responseError = isErrorResponse(fetchError.data) ? fetchError.data.error : null
  const resultError = isApiResultEnvelope(fetchError.data) ? fetchError.data : null
  const statusCode = fetchError.statusCode || fetchError.status || 500
  const code = responseError?.code || (resultError ? String(resultError.code) : null) || fetchError.statusMessage || "AOI_API_ERROR"

  return {
    code,
    endpoint,
    message: responseError?.message || resultError?.message || fetchError.message || "请求暂时失败，请稍后重试。",
    requestId: responseError?.requestId || resultError?.traceId || `aoi-local-${Date.now()}`,
    statusCode
  }
}

function isApiResultEnvelope<T = unknown>(value: unknown): value is ApiResultEnvelope<T> {
  return Boolean(
    value &&
    typeof value === "object" &&
    "code" in value &&
    "messageKey" in value &&
    "serverTime" in value
  )
}

function isErrorResponse(value: unknown): value is ErrorResponse {
  return Boolean(
    value &&
    typeof value === "object" &&
    "error" in value
  )
}

function isAoiApiErrorPayload(value: unknown): value is AoiApiErrorPayload {
  return Boolean(
    value &&
    typeof value === "object" &&
    "endpoint" in value &&
    "statusCode" in value &&
    "requestId" in value
  )
}
