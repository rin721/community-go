export interface UserSummary {
  id: string
  handle: string
  displayName: string
  avatarUrl: string | null
}

export interface ApiStatus {
  mode: "mock" | "go"
  basePath: string
  generatedAt: string
  latencyMs: number
  endpoints: string[]
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

export type VideoCommentSortMode = "newest" | "oldest"

export interface VideoComment {
  id: string
  videoId: string
  body: string
  authorName: string
  status: "visible"
  createdAt: string
  updatedAt: string
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
  videoCount: number
  joinedAt: string
  categories: Category[]
  latest: PageResult<VideoSummary>
}

export interface FollowingFeedPayload {
  authenticated: boolean
  message: string | null
  creators: CreatorProfile[]
  latest: PageResult<VideoSummary>
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
  message: string
  requestId: string
  statusCode: number
}

export interface HomePayload {
  categories: CategoryTreeNode[]
  announcement: Announcement | null
  latest: PageResult<VideoSummary>
}
