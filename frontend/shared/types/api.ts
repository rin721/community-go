export interface UserSummary {
  id: string
  handle: string
  displayName: string
  avatarUrl: string | null
}

export interface CommunitySetupStatus {
  required: boolean
  completed: boolean
  currentStep: string
}

export interface ApiStatus {
  mode: "mock" | "go"
  basePath: string
  generatedAt: string
  latencyMs: number
  endpoints: string[]
  setup: CommunitySetupStatus
}

export interface ApiResultEnvelope<T> {
  code: number
  messageKey: string
  message: string
  messageArgs?: Record<string, unknown>
  data?: T
  traceId?: string
  serverTime: number
}

export interface CommunityAuthAccount {
  id: string
  handle: string
  displayName: string
}

export interface CommunityAuthSession {
  userId: string
  sessionId: string
  account: CommunityAuthAccount
  accessExpiresAt: string
  refreshExpiresAt: string
}

export type CommunitySignupStatus = "authenticated" | "verification_pending"

export interface CommunityAuthNotificationDelivery {
  debug: boolean
  token?: string
  url?: string
}

export interface CommunitySignupResult {
  status: CommunitySignupStatus
  session?: CommunityAuthSession | null
  delivery?: CommunityAuthNotificationDelivery | null
}

export interface CommunitySignupRequest {
  username: string
  email: string
  displayName?: string
  password: string
}

export interface LoginRequest {
  identifier: string
  password: string
  captchaId?: string
  captchaCode?: string
  mfaCode?: string
}

export interface Category {
  id: string
  slug: string
  name: string
  description: string | null
  accentColor: string | null
  parentSlug: string | null
  order: number
}

export interface CategoryTreeNode extends Category {
  children: CategoryTreeNode[]
}

export interface VideoSummary {
  id: string
  slug: string
  title: string
  description: string | null
  thumbnailUrl: string
  durationSeconds: number
  viewCount: number
  commentCount: number
  publishedAt: string
  uploader: UserSummary
  categories: Category[]
}

export interface VideoDetail extends VideoSummary {
  sourceUrl: string
  sources?: VideoSourceOption[]
  likeCount: number
  tags: string[]
  related: VideoSummary[]
}

export type VideoSourceKind = "native" | "hls" | "dash"

export interface VideoSourceOption {
  id: string
  src: string
  kind: VideoSourceKind
  label: string
  mimeType?: string
  qualityLabel?: string
  bitrateKbps?: number
  isDefault?: boolean
}

export type VideoDanmakuMode = "scroll" | "top" | "bottom"

export interface VideoDanmakuItem {
  id: string
  videoId: string
  body: string
  timeSeconds: number
  mode: VideoDanmakuMode
  color: string
  authorName: string
  createdAt: string
}

export interface VideoDanmakuPayload {
  items: VideoDanmakuItem[]
  nextCursor: string | null
  totalCount: number
  videoId: string
}

export interface CreateVideoDanmakuRequest {
  authorName: string
  body: string
  timeSeconds: number
  mode: VideoDanmakuMode
  color: string
  clientId?: string
}

export type VideoReportReason = "spam" | "abuse" | "copyright" | "misleading" | "other"

export interface CreateVideoReportRequest {
  clientId: string
  reason: VideoReportReason
  detail: string
}

export interface CommunityReportReceipt {
  id: string
  targetKind: "video"
  targetId: string
  videoId: string
  clientId: string
  reason: VideoReportReason
  status: "pending"
  createdAt: string
}

export type VideoCommentSortMode = "newest" | "oldest"

export interface VideoComment {
  id: string
  videoId: string
  body: string
  authorName: string
  status: "visible"
  createdAt: string
  updatedAt: string
  ownedByCurrentClient?: boolean
}

export interface VideoCommentPayload {
  items: VideoComment[]
  nextCursor: string | null
  sort: VideoCommentSortMode
  totalCount: number
  videoId: string
}

export interface CreateVideoCommentRequest {
  authorName: string
  body: string
  clientId?: string
}

export interface UpdateVideoCommentRequest {
  body: string
  clientId?: string
}

export interface DeleteVideoCommentResult {
  commentId: string
  videoId: string
  clientId: string
  deleted: boolean
}

export type CommunityDynamicKind = "text" | "video_update"

export interface CommunityDynamicItem {
  id: string
  kind: CommunityDynamicKind
  authorName: string
  author?: UserSummary | null
  body: string
  videoId: string
  video?: VideoSummary | null
  createdAt: string
  updatedAt: string
  ownedByCurrentClient?: boolean
}

export interface CommunityDynamicPayload {
  authenticated: boolean
  clientId?: string | null
  message: string | null
  items: PageResult<CommunityDynamicItem>
}

export interface CreateCommunityDynamicRequest {
  clientId: string
  authorName: string
  body: string
  videoId?: string
}

export type CreateCommunityAccountDynamicRequest = Omit<CreateCommunityDynamicRequest, "authorName" | "clientId">

export interface UpdateCommunityDynamicRequest {
  body: string
  clientId?: string
}

export interface DeleteCommunityDynamicResult {
  dynamicId: string
  clientId: string
  deleted: boolean
}

export type CommunitySubmissionStatus = "pending_review" | "approved" | "rejected" | "published"

export type CommunitySubmissionVideoJobStatus = "queued" | "running" | "succeeded" | "failed" | "canceled"

export type CommunitySubmissionVisibility = "public" | "unlisted" | "private"

export interface CreateCommunitySubmissionRequest {
  clientId: string
  authorName: string
  title: string
  description: string
  categorySlug: string
  tags: string[]
  visibility: CommunitySubmissionVisibility
  sourceName: string
  sourceSize: number
  sourceType: string
  mediaAssetId?: string
  allowComments: boolean
  sensitive: boolean
}

export type CreateCommunityAccountSubmissionRequest = Omit<CreateCommunitySubmissionRequest, "authorName" | "clientId">

export interface CommunitySubmissionUploadResult {
  mediaAssetId: string
  displayName: string
  originalName: string
  url: string
  mimeType: string
  sizeBytes: number
}

export interface CommunitySubmissionVideoJobSummary {
  id: string
  status: CommunitySubmissionVideoJobStatus
  progress: number
  videoId?: string
  failureCode?: string
  errorMessage?: string
  outputPublicUrl?: string
  startedAt?: string | null
  finishedAt?: string | null
  createdAt: string
  updatedAt: string
}

export interface CommunitySubmissionItem {
  id: string
  clientId: string
  authorName: string
  title: string
  description: string
  categorySlug: string
  category?: Category | null
  tags: string[]
  visibility: CommunitySubmissionVisibility
  sourceName: string
  sourceSize: number
  sourceType: string
  allowComments: boolean
  sensitive: boolean
  status: CommunitySubmissionStatus
  reviewNote?: string
  reviewerId?: string
  reviewedAt?: string | null
  mediaAssetId?: string
  publishedVideoId?: string
  publishedAt?: string | null
  latestVideoJob?: CommunitySubmissionVideoJobSummary | null
  createdAt: string
  updatedAt: string
}

export interface ReviewCommunitySubmissionRequest {
  status: Extract<CommunitySubmissionStatus, "approved" | "rejected" | "published">
  reviewNote?: string
  publishedVideoId?: string
  mediaAssetId?: string
  sourceUrl?: string
  thumbnailUrl?: string
  durationSeconds?: number
  slug?: string
}

export interface CommunitySubmissionPayload {
  authenticated: boolean
  clientId?: string | null
  message: string | null
  items: PageResult<CommunitySubmissionItem>
}

export interface CreatorFollowRequest {
  clientId: string
}

export type VideoInteractionKind = "like" | "favorite" | "watch_later"

export interface VideoInteractionRequest {
  clientId: string
}

export interface VideoHistoryRequest {
  clientId: string
  progressSeconds: number
}

export interface RecordAccountVideoHistoryRequest {
  progressSeconds: number
}

export interface VideoHistoryClearRequest {
  clientId: string
}

export interface CreatorFollowState {
  clientId: string
  creatorId: string
  handle: string
  following: boolean
  followerCount: number
  followedAt: string | null
}

export interface VideoInteractionState {
  clientId: string
  videoId: string
  liked: boolean
  favorited: boolean
  watchLater: boolean
  likeCount: number
}

export interface Announcement {
  id: string
  title: string
  body: string
  href: string | null
  severity: "info" | "success" | "warning"
  startsAt: string
  endsAt: string | null
}

export interface PageResult<T> {
  items: T[]
  nextCursor: string | null
}

export interface CreatorProfile extends UserSummary {
  bio: string | null
  followerCount: number
  followedAt?: string | null
  videoCount: number
  joinedAt: string
  categories: Category[]
  latest: PageResult<VideoSummary>
}

export interface FollowingFeedPayload {
  authenticated: boolean
  clientId?: string | null
  followingCount: number
  message: string | null
  creators: CreatorProfile[]
  latest: PageResult<VideoSummary>
  dynamics: PageResult<CommunityDynamicItem>
}

export interface VideoLibraryPayload {
  authenticated: boolean
  clientId?: string | null
  favoriteCount: number
  watchLaterCount: number
  message: string | null
  favorites: PageResult<VideoSummary>
  watchLater: PageResult<VideoSummary>
}

export interface VideoHistoryItem {
  video: VideoSummary
  progressSeconds: number
  lastViewedAt: string
}

export interface VideoHistoryPayload {
  authenticated: boolean
  clientId?: string | null
  historyCount: number
  message: string | null
  items: PageResult<VideoHistoryItem>
}

export type CommunityNotificationKind = "comment" | "danmaku" | "follow" | "interaction" | "report" | "submission"

export type CommunityNotificationTargetKind = "video" | "creator" | "submission"

export interface CommunityNotificationItem {
  id: string
  kind: CommunityNotificationKind
  title: string
  body: string
  targetKind: CommunityNotificationTargetKind
  targetId: string
  videoId: string
  creatorId: string
  link: string
  readAt: string | null
  createdAt: string
}

export interface CommunityNotificationPayload {
  authenticated: boolean
  clientId?: string | null
  unreadCount: number
  message: string | null
  items: PageResult<CommunityNotificationItem>
}

export interface CommunityNotificationRequest {
  clientId: string
}

export interface SearchPayload {
  categories: PageResult<Category>
  creators: PageResult<CreatorProfile>
  query: string
  totalCount: number
  videos: PageResult<VideoSummary>
}

export interface ErrorResponse {
  error: {
    code: string
    message: string
    requestId: string
  }
}

export interface AoiApiErrorPayload {
  code: string
  endpoint: string
  messageArgs?: Record<string, unknown>
  messageKey?: string
  message: string
  requestId: string
  setup?: CommunitySetupStatus | null
  statusCode: number
}

export interface HomePayload {
  categories: CategoryTreeNode[]
  announcement: Announcement | null
  latest: PageResult<VideoSummary>
  dynamics: PageResult<CommunityDynamicItem>
}
