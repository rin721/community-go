import type {
  AccountProfileResponse,
  AccountAvatarResult,
  DeleteCommunitySubmissionResult,
  AoiApiErrorPayload,
  ApiResultEnvelope,
  ApiStatus,
  CategoryTreeNode,
  ChangeAccountPasswordRequest,
  CommunityDynamicItem,
  CommunityDynamicPayload,
  CommunityNotificationPayload,
  CommunityNotificationRequest,
  CommunityReportReceipt,
  CommunitySetupStatus,
  CommunitySubmissionItem,
  CommunitySubmissionPayload,
  CommunitySubmissionUploadResult,
  CreatorFollowState,
  CreateCommunityAccountDynamicRequest,
  CreateCommunityAccountSubmissionRequest,
  CreateCommunityDynamicRequest,
  CreateCommunitySubmissionRequest,
  RecordAccountVideoHistoryRequest,
  DeleteCommunityDynamicResult,
  CreateVideoCommentRequest,
  CreateVideoDanmakuRequest,
  CreateVideoReportRequest,
  CreatorFollowRequest,
  CreatorProfile,
  DeleteVideoCommentResult,
  ErrorResponse,
  FollowingFeedPayload,
  HomePayload,
  PageResult,
  SearchPayload,
  UpdateAccountCreatorProfileRequest,
  UpdateAccountProfileRequest,
  UpdateCommunityDynamicRequest,
  UpdateVideoCommentRequest,
  VideoComment,
  VideoCommentPayload,
  VideoCommentSortMode,
  VideoDanmakuItem,
  VideoDanmakuPayload,
  VideoDetail,
  VideoInteractionKind,
  VideoInteractionRequest,
  VideoInteractionState,
  VideoHistoryClearRequest,
  VideoHistoryItem,
  VideoHistoryPayload,
  VideoHistoryRequest,
  VideoLibraryPayload,
  VideoSummary
} from "~/types/api"
import { findCategoryInTree } from "~~/shared/utils/categories"
import { createAoiCredentialHeaders } from "~/utils/apiCredentials"

type RequestOptions = {
  body?: unknown
  method?: "DELETE" | "GET" | "PATCH" | "POST"
  query?: Record<string, unknown>
  signal?: AbortSignal
  direct?: boolean
}

type RequestControlOptions = Pick<RequestOptions, "signal">

export function useAoiApi() {
  const config = useRuntimeConfig()
  const telemetry = useAoiApiTelemetry()
  const baseURL = computed(() => config.public.apiMock ? "/api/mock" : config.public.apiBaseURL)
  const directBaseURL = computed(() => config.public.apiMock ? "/api/mock" : config.public.directApiBaseURL)

  async function request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
    try {
      const targetBaseURL = options.direct ? directBaseURL.value : baseURL.value
      const response = await $fetch<unknown>(endpoint, {
        baseURL: targetBaseURL,
        body: options.body as BodyInit | Record<string, unknown> | null | undefined,
        credentials: "include",
        headers: createAoiCredentialHeaders(options.method, config),
        method: options.method,
        query: options.query,
        signal: options.signal
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

  async function createCommunityAccountDynamic(body: CreateCommunityAccountDynamicRequest): Promise<CommunityDynamicItem> {
    return await request<CommunityDynamicItem>("/account/dynamics", {
      body,
      method: "POST"
    })
  }

  async function updateCommunityDynamic(dynamicId: string, body: UpdateCommunityDynamicRequest): Promise<CommunityDynamicItem> {
    return await request<CommunityDynamicItem>(`/dynamics/${encodeURIComponent(dynamicId)}`, {
      body,
      method: "PATCH"
    })
  }

  async function updateCommunityAccountDynamic(dynamicId: string, body: UpdateCommunityDynamicRequest): Promise<CommunityDynamicItem> {
    return await request<CommunityDynamicItem>(`/account/dynamics/${encodeURIComponent(dynamicId)}`, {
      body,
      method: "PATCH"
    })
  }

  async function deleteCommunityDynamic(dynamicId: string, clientId: string): Promise<DeleteCommunityDynamicResult> {
    return await request<DeleteCommunityDynamicResult>(`/dynamics/${encodeURIComponent(dynamicId)}`, {
      method: "DELETE",
      query: { clientId }
    })
  }

  async function deleteCommunityAccountDynamic(dynamicId: string): Promise<DeleteCommunityDynamicResult> {
    return await request<DeleteCommunityDynamicResult>(`/account/dynamics/${encodeURIComponent(dynamicId)}`, {
      method: "DELETE"
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

  async function getCommunityAccountSubmissions(limit = 24): Promise<CommunitySubmissionPayload> {
    return await request<CommunitySubmissionPayload>("/account/submissions", {
      query: { limit }
    })
  }

  async function createCommunityAccountSubmission(body: CreateCommunityAccountSubmissionRequest): Promise<CommunitySubmissionItem> {
    return await request<CommunitySubmissionItem>("/account/submissions", {
      body,
      method: "POST"
    })
  }

  async function uploadCommunityAccountSubmissionSource(file: File): Promise<CommunitySubmissionUploadResult> {
    if (config.public.apiMock) {
      return {
        displayName: file.name,
        mediaAssetId: `mock-asset-${Date.now()}`,
        mimeType: file.type || "video/*",
        originalName: file.name,
        sizeBytes: file.size,
        url: `/api/mock/account/submissions/upload/${encodeURIComponent(file.name)}`
      }
    }

    const formData = new FormData()
    formData.append("file", file)

    return await request<CommunitySubmissionUploadResult>("/account/submissions/upload", {
      body: formData,
      method: "POST",
      direct: true
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
  }, options: RequestControlOptions = {}): Promise<SearchPayload> {
    return await request<SearchPayload>("/search", {
      query: params,
      signal: options.signal
    })
  }

  async function searchVideos(params: {
    limit?: number
    q: string
  }, options: RequestControlOptions = {}): Promise<PageResult<VideoSummary>> {
    const payload = await search(params, options)

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
    clientId?: string
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

  async function updateVideoComment(idOrSlug: string, commentId: string, body: UpdateVideoCommentRequest): Promise<VideoComment> {
    return await request<VideoComment>(`/videos/${encodeURIComponent(idOrSlug)}/comments/${encodeURIComponent(commentId)}`, {
      body,
      method: "PATCH"
    })
  }

  async function deleteVideoComment(idOrSlug: string, commentId: string, clientId: string): Promise<DeleteVideoCommentResult> {
    return await request<DeleteVideoCommentResult>(`/videos/${encodeURIComponent(idOrSlug)}/comments/${encodeURIComponent(commentId)}`, {
      method: "DELETE",
      query: { clientId }
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

  async function getAccountVideoInteractionState(idOrSlug: string): Promise<VideoInteractionState> {
    return await request<VideoInteractionState>(`/account/videos/${encodeURIComponent(idOrSlug)}/interaction-state`)
  }

  async function setAccountVideoInteraction(idOrSlug: string, kind: VideoInteractionKind): Promise<VideoInteractionState> {
    return await request<VideoInteractionState>(`/account/videos/${encodeURIComponent(idOrSlug)}/interactions/${encodeURIComponent(kind)}`, {
      method: "POST"
    })
  }

  async function unsetAccountVideoInteraction(idOrSlug: string, kind: VideoInteractionKind): Promise<VideoInteractionState> {
    return await request<VideoInteractionState>(`/account/videos/${encodeURIComponent(idOrSlug)}/interactions/${encodeURIComponent(kind)}`, {
      method: "DELETE"
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

  async function getAccountCreatorFollowState(handle: string): Promise<CreatorFollowState> {
    return await request<CreatorFollowState>(`/account/users/${encodeURIComponent(handle)}/follow-state`)
  }

  async function followAccountCreator(handle: string): Promise<CreatorFollowState> {
    return await request<CreatorFollowState>(`/account/users/${encodeURIComponent(handle)}/follow`, {
      method: "POST"
    })
  }

  async function unfollowAccountCreator(handle: string): Promise<CreatorFollowState> {
    return await request<CreatorFollowState>(`/account/users/${encodeURIComponent(handle)}/follow`, {
      method: "DELETE"
    })
  }

  async function getFollowingFeed(clientId?: string): Promise<FollowingFeedPayload> {
    return await request<FollowingFeedPayload>("/feed/following", {
      query: clientId ? { clientId } : undefined
    })
  }

  async function getAccountFollowingFeed(): Promise<FollowingFeedPayload> {
    return await request<FollowingFeedPayload>("/account/feed/following")
  }

  async function getVideoLibrary(clientId: string): Promise<VideoLibraryPayload> {
    return await request<VideoLibraryPayload>("/library", {
      query: { clientId }
    })
  }

  async function getAccountVideoLibrary(): Promise<VideoLibraryPayload> {
    return await request<VideoLibraryPayload>("/account/library")
  }

  async function getVideoHistory(clientId: string, limit = 48): Promise<VideoHistoryPayload> {
    return await request<VideoHistoryPayload>("/history", {
      query: { clientId, limit }
    })
  }

  async function getAccountVideoHistory(limit = 48): Promise<VideoHistoryPayload> {
    return await request<VideoHistoryPayload>("/account/history", {
      query: { limit }
    })
  }

  async function recordVideoHistory(idOrSlug: string, body: VideoHistoryRequest): Promise<VideoHistoryItem> {
    return await request<VideoHistoryItem>(`/videos/${encodeURIComponent(idOrSlug)}/history`, {
      body,
      method: "POST"
    })
  }

  async function recordAccountVideoHistory(idOrSlug: string, body: RecordAccountVideoHistoryRequest): Promise<VideoHistoryItem> {
    return await request<VideoHistoryItem>(`/account/videos/${encodeURIComponent(idOrSlug)}/history`, {
      body,
      method: "POST"
    })
  }

  async function clearVideoHistory(body: VideoHistoryClearRequest): Promise<VideoHistoryPayload> {
    return await request<VideoHistoryPayload>("/history/clear", {
      body,
      method: "POST"
    })
  }

  async function clearAccountVideoHistory(): Promise<VideoHistoryPayload> {
    return await request<VideoHistoryPayload>("/account/history/clear", {
      method: "POST"
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

  async function getCommunityAccountNotifications(limit = 48): Promise<CommunityNotificationPayload> {
    return await request<CommunityNotificationPayload>("/account/notifications", {
      query: { limit }
    })
  }

  async function markCommunityAccountNotificationsRead(): Promise<CommunityNotificationPayload> {
    return await request<CommunityNotificationPayload>("/account/notifications/read", {
      method: "POST"
    })
  }

  // ── Account Profile Management ──────────────────────────────────────────

  async function getAccountProfile(): Promise<AccountProfileResponse> {
    return await request<AccountProfileResponse>("/account/profile")
  }

  async function updateAccountProfile(body: UpdateAccountProfileRequest): Promise<AccountProfileResponse> {
    return await request<AccountProfileResponse>("/account/profile", {
      body,
      method: "PATCH"
    })
  }

  async function updateAccountCreatorProfile(body: UpdateAccountCreatorProfileRequest): Promise<AccountProfileResponse> {
    return await request<AccountProfileResponse>("/account/creator-profile", {
      body,
      method: "PATCH"
    })
  }

  async function changeAccountPassword(body: ChangeAccountPasswordRequest): Promise<{ changed: boolean }> {
    return await request<{ changed: boolean }>("/account/change-password", {
      body,
      method: "POST"
    })
  }

  async function getAccountSubmission(submissionId: string): Promise<CommunitySubmissionItem> {
    return await request<CommunitySubmissionItem>(`/account/submissions/${encodeURIComponent(submissionId)}`)
  }

  async function getAccountSessions(): Promise<AccountSessionPayload> {
    if (config.public.apiMock) {
      return {
        items: [
          {
            id: "mock-session-1",
            productCode: "platform",
            clientType: "community_web",
            ipAddress: "127.0.0.1",
            userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
            accessExpiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
            refreshExpiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
            createdAt: new Date().toISOString()
          }
        ]
      }
    }
    return await request<AccountSessionPayload>("/account/sessions")
  }

  async function revokeAccountSession(sessionId: string): Promise<boolean> {
    if (config.public.apiMock) {
      return true
    }
    const res = await request<{ success: boolean }>(`/account/sessions/${encodeURIComponent(sessionId)}`, {
      method: "DELETE"
    })
    return res.success
  }

  async function uploadAccountAvatar(file: File): Promise<AccountAvatarResult> {
    if (config.public.apiMock) {
      const mockUrl = `/api/mock/account/avatar/${encodeURIComponent(file.name)}`
      return {
        avatarUrl: mockUrl,
        profile: {
          id: "mock-user-id",
          handle: "mockuser",
          email: "mockuser@example.com",
          displayName: "Mock User",
          role: "creator",
          status: "active",
          createdAt: new Date().toISOString(),
          avatarUrl: mockUrl
        }
      }
    }
    const ext = file.name.split(".").pop() || "png"
    const safeFile = new File([file], `avatar.${ext}`, { type: file.type })
    const formData = new FormData()
    formData.append("file", safeFile)
    return await request<AccountAvatarResult>("/account/avatar/upload", {
      body: formData,
      method: "POST",
      direct: true
    })
  }

  async function deleteAccountAvatar(): Promise<AccountAvatarResult> {
    if (config.public.apiMock) {
      return {
        avatarUrl: "",
        profile: {
          id: "mock-user-id",
          handle: "mockuser",
          email: "mockuser@example.com",
          displayName: "Mock User",
          role: "creator",
          status: "active",
          createdAt: new Date().toISOString(),
          avatarUrl: ""
        }
      }
    }
    return await request<AccountAvatarResult>("/account/avatar", {
      method: "DELETE"
    })
  }

  async function uploadAccountBanner(file: File): Promise<AccountBannerResult> {
    if (config.public.apiMock) {
      const mockUrl = `/api/mock/account/banner/${encodeURIComponent(file.name)}`
      return {
        bannerUrl: mockUrl,
        profile: {
          id: "mock-user-id",
          handle: "mockuser",
          email: "mockuser@example.com",
          displayName: "Mock User",
          role: "creator",
          status: "active",
          createdAt: new Date().toISOString(),
          bannerUrl: mockUrl
        }
      }
    }
    const ext = file.name.split(".").pop() || "png"
    const safeFile = new File([file], `banner.${ext}`, { type: file.type })
    const formData = new FormData()
    formData.append("file", safeFile)
    return await request<AccountBannerResult>("/account/banner/upload", {
      body: formData,
      method: "POST",
      direct: true
    })
  }

  async function deleteAccountBanner(): Promise<AccountBannerResult> {
    if (config.public.apiMock) {
      return {
        bannerUrl: "",
        profile: {
          id: "mock-user-id",
          handle: "mockuser",
          email: "mockuser@example.com",
          displayName: "Mock User",
          role: "creator",
          status: "active",
          createdAt: new Date().toISOString(),
          bannerUrl: ""
        }
      }
    }
    return await request<AccountBannerResult>("/account/banner", {
      method: "DELETE"
    })
  }

  async function deleteAccountSubmission(submissionId: string): Promise<DeleteCommunitySubmissionResult> {
    if (config.public.apiMock) {
      return {
        submissionId,
        deleted: true
      }
    }
    return await request<DeleteCommunitySubmissionResult>(`/account/submissions/${encodeURIComponent(submissionId)}`, {
      method: "DELETE"
    })
  }



  async function getCategory(slug: string): Promise<CategoryTreeNode | null> {
    const categories = await listCategories()

    return findCategoryInTree(categories, slug)
  }

  return {
    getApiStatus,
    getAccountCreatorFollowState,
    getAccountFollowingFeed,
    getCategory,
    getCreatorFollowState,
    getCreatorProfile,
    getCommunityDynamics,
    getFollowingFeed,
    clearVideoHistory,
    clearAccountVideoHistory,
    getAccountVideoHistory,
    getAccountVideoInteractionState,
    getAccountVideoLibrary,
    getVideoInteractionState,
    getVideoHistory,
    getVideoLibrary,
    followCreator,
    followAccountCreator,
    createCommunityAccountDynamic,
    createCommunityAccountSubmission,
    createCommunityDynamic,
    createCommunitySubmission,
    deleteCommunityAccountDynamic,
    deleteCommunityDynamic,
    getHomePayload,
    getCommunityAccountNotifications,
    getCommunityAccountSubmissions,
    getCommunityNotifications,
    getCommunitySubmissions,
    createVideoComment,
    deleteVideoComment,
    createVideoDanmaku,
    createVideoReport,
    getVideoDanmaku,
    getVideoComments,
    updateCommunityAccountDynamic,
    updateCommunityDynamic,
    uploadCommunityAccountSubmissionSource,
    updateVideoComment,
    getVideoDetail,
    listCategories,
    listVideos,
    search,
    searchVideos,
    markCommunityAccountNotificationsRead,
    markCommunityNotificationsRead,
    recordAccountVideoHistory,
    recordVideoHistory,
    setAccountVideoInteraction,
    setVideoInteraction,
    unfollowAccountCreator,
    unfollowCreator,
    unsetAccountVideoInteraction,
    unsetVideoInteraction,
    // account profile
    getAccountProfile,
    updateAccountProfile,
    updateAccountCreatorProfile,
    changeAccountPassword,
    getAccountSubmission,
    getAccountSessions,
    revokeAccountSession,
    uploadAccountAvatar,
    deleteAccountAvatar,
    uploadAccountBanner,
    deleteAccountBanner,
    deleteAccountSubmission
  }
}

export function isAoiSetupRequiredError(error: unknown): boolean {
  return hasAoiSetupRequiredError(error)
}

function unwrapApiResponse<T>(response: unknown, endpoint: string): T {
  if (!isApiResultEnvelope<T>(response)) {
    return response as T
  }

  if (response.code !== 0) {
    const responseData = response.data

    throw {
      code: String(response.code),
      endpoint,
      message: response.message || response.messageKey || "请求暂时失败，请稍后重试。",
      messageArgs: response.messageArgs,
      messageKey: response.messageKey,
      requestId: response.traceId || `aoi-local-${Date.now()}`,
      setup: isCommunitySetupStatus(responseData) ? responseData : null,
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
  const resultData = resultError?.data
  const statusCode = fetchError.statusCode || fetchError.status || 500
  const code = responseError?.code || (resultError ? String(resultError.code) : null) || fetchError.statusMessage || "AOI_API_ERROR"

  return {
    code,
    endpoint,
    message: responseError?.message || resultError?.message || fetchError.message || "请求暂时失败，请稍后重试。",
    messageArgs: resultError?.messageArgs,
    messageKey: resultError?.messageKey,
    requestId: responseError?.requestId || resultError?.traceId || `aoi-local-${Date.now()}`,
    setup: isCommunitySetupStatus(resultData) ? resultData : null,
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

function isCommunitySetupStatus(value: unknown): value is CommunitySetupStatus {
  return Boolean(
    value &&
    typeof value === "object" &&
    "required" in value &&
    "completed" in value &&
    "currentStep" in value
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

function hasAoiSetupRequiredError(value: unknown, visited = new Set<unknown>()): boolean {
  if (!value || typeof value !== "object" || visited.has(value)) {
    return false
  }

  visited.add(value)

  if (isAoiApiErrorPayload(value) && (
    value.messageKey === "api.setup.required"
    || (value.statusCode === 503 && value.setup?.required === true && value.setup.completed === false)
  )) {
    return true
  }

  const record = value as Record<string, unknown>

  if (record.messageKey === "api.setup.required") {
    return true
  }

  if (
    (record.statusCode === 503 || record.status === 503)
    && isCommunitySetupStatus(record.setup)
    && record.setup.required === true
    && record.setup.completed === false
  ) {
    return true
  }

  return ["data", "cause", "error", "response", "value"].some((key) => hasAoiSetupRequiredError(record[key], visited))
}
