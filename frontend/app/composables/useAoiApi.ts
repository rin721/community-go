import type {
  AoiApiErrorPayload,
  ApiStatus,
  CategoryTreeNode,
  CreatorProfile,
  ErrorResponse,
  FollowingFeedPayload,
  HomePayload,
  PageResult,
  SearchPayload,
  VideoDanmakuPayload,
  VideoDetail,
  VideoSummary
} from "~/types/api"
import { findCategoryInTree } from "~~/shared/utils/categories"

type RequestOptions = {
  query?: Record<string, unknown>
}

export function useAoiApi() {
  const config = useRuntimeConfig()
  const telemetry = useAoiApiTelemetry()
  const baseURL = computed(() => config.public.apiMock ? "/api/mock" : config.public.apiBaseURL)

  async function request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
    try {
      const response = await $fetch<T>(endpoint, {
        baseURL: baseURL.value,
        query: options.query
      })

      return response as T
    } catch (error) {
      const apiError = toAoiApiError(error, endpoint)

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
    getVideoDanmaku,
    getVideoDetail,
    listCategories,
    listVideos,
    search,
    searchVideos
  }
}

function toAoiApiError(error: unknown, endpoint: string): AoiApiErrorPayload {
  const fetchError = error as {
    data?: ErrorResponse
    message?: string
    status?: number
    statusCode?: number
    statusMessage?: string
  }
  const responseError = fetchError.data?.error
  const statusCode = fetchError.statusCode || fetchError.status || 500
  const code = responseError?.code || fetchError.statusMessage || "AOI_API_ERROR"

  return {
    code,
    endpoint,
    message: responseError?.message || fetchError.message || "请求暂时失败，请稍后重试。",
    requestId: responseError?.requestId || `aoi-local-${Date.now()}`,
    statusCode
  }
}
