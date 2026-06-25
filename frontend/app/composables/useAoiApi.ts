import type {
  AoiApiErrorPayload,
  ApiResultEnvelope,
  ApiStatus,
  CategoryTreeNode,
  CreateVideoCommentRequest,
  CreatorProfile,
  ErrorResponse,
  FollowingFeedPayload,
  HomePayload,
  PageResult,
  SearchPayload,
  VideoComment,
  VideoCommentPayload,
  VideoCommentSortMode,
  VideoDanmakuPayload,
  VideoDetail,
  VideoSummary
} from "~/types/api"
import { findCategoryInTree } from "~~/shared/utils/categories"

type RequestOptions = {
  body?: unknown
  method?: "GET" | "POST"
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

  async function getCreatorProfile(handle: string): Promise<CreatorProfile> {
    return await request<CreatorProfile>(`/users/${encodeURIComponent(handle)}`)
  }

  async function getFollowingFeed(): Promise<FollowingFeedPayload> {
    return await request<FollowingFeedPayload>("/feed/following")
  }

  async function getCategory(slug: string): Promise<CategoryTreeNode | null> {
    const categories = await listCategories()

    return findCategoryInTree(categories, slug)
  }

  return {
    getApiStatus,
    getCategory,
    getCreatorProfile,
    getFollowingFeed,
    getHomePayload,
    createVideoComment,
    getVideoDanmaku,
    getVideoComments,
    getVideoDetail,
    listCategories,
    listVideos,
    search,
    searchVideos
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
