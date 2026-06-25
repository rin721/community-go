import type {
  Announcement,
  Category,
  CategoryTreeNode,
  CreatorProfile,
  FollowingFeedPayload,
  HomePayload,
  SearchPayload,
  CreateVideoCommentRequest,
  VideoDanmakuItem,
  VideoDanmakuMode,
  VideoDanmakuPayload,
  VideoComment,
  VideoCommentPayload,
  VideoCommentSortMode,
  UserSummary,
  VideoDetail,
  VideoSummary
} from "../types/api"
import {
  findCategoryInTree,
  flattenCategoryTree,
  getCategorySelfAndDescendants
} from "../utils/categories"

export const mockCategoryTree: CategoryTreeNode[] = [
  { id: "cat-home", slug: "home", name: "首页", description: "全部精选内容", accentColor: "#f2709c", parentSlug: null, order: 0, children: [] },
  {
    id: "cat-creative",
    slug: "creative",
    name: "创作",
    description: "动画、音乐、MAD 与视觉表达",
    accentColor: "#f2709c",
    parentSlug: null,
    order: 10,
    children: [
      { id: "cat-animation", slug: "animation", name: "动画", description: "动画与短片", accentColor: "#22b8cf", parentSlug: "creative", order: 10, children: [] },
      { id: "cat-music", slug: "music", name: "音乐", description: "音乐视频与现场", accentColor: "#5b8def", parentSlug: "creative", order: 20, children: [] },
      { id: "cat-mad", slug: "mad", name: "音 MAD", description: "混剪与再创作", accentColor: "#f2709c", parentSlug: "creative", order: 30, children: [] },
      { id: "cat-design", slug: "design", name: "设计", description: "视觉与交互", accentColor: "#f7b955", parentSlug: "creative", order: 40, children: [] }
    ]
  },
  {
    id: "cat-knowledge",
    slug: "knowledge",
    name: "知识",
    description: "技术、开发与硬件知识",
    accentColor: "#0f9fb7",
    parentSlug: null,
    order: 20,
    children: [
      { id: "cat-tech", slug: "tech", name: "科技", description: "技术、开发与硬件", accentColor: "#0f9fb7", parentSlug: "knowledge", order: 10, children: [] }
    ]
  },
  {
    id: "cat-play",
    slug: "play",
    name: "游玩",
    description: "游戏、实况与互动娱乐",
    accentColor: "#7a68f0",
    parentSlug: null,
    order: 30,
    children: [
      { id: "cat-games", slug: "games", name: "游戏", description: "游戏与实况", accentColor: "#7a68f0", parentSlug: "play", order: 10, children: [] }
    ]
  },
  {
    id: "cat-community",
    slug: "community",
    name: "社区",
    description: "社区综合内容与站内动态",
    accentColor: "#64757b",
    parentSlug: null,
    order: 40,
    children: [
      { id: "cat-general", slug: "general", name: "综合", description: "社区综合内容", accentColor: "#64757b", parentSlug: "community", order: 10, children: [] }
    ]
  }
]

export const mockCategories: Category[] = flattenCategoryTree(mockCategoryTree).map(({ children: _children, depth: _depth, path: _path, ...category }) => category)

export const mockUsers: Record<string, UserSummary> = {
  backend: { id: "user-backend", handle: "aoi-backend", displayName: "Aoi Backend", avatarUrl: null },
  design: { id: "user-design", handle: "design-note", displayName: "Design Note", avatarUrl: null },
  frontend: { id: "user-frontend", handle: "frontend-memo", displayName: "Frontend Memo", avatarUrl: null },
  lab: { id: "user-lab", handle: "aoi-lab", displayName: "Aoi Lab", avatarUrl: null },
  motion: { id: "user-motion", handle: "aoi-motion", displayName: "Aoi Motion", avatarUrl: null },
  rin: { id: "user-rin", handle: "rin721", displayName: "Rin721", avatarUrl: null }
}

export function getMockCategory(slug: string): Category | null {
  const category = findCategoryInTree(mockCategoryTree, slug)

  if (!category) {
    return null
  }

  const { children: _children, depth: _depth, path: _path, ...flatCategory } = category

  return flatCategory
}

function category(slug: string) {
  return getMockCategory(slug) || mockCategories[0]!
}

export const mockAnnouncement: Announcement = {
  id: "ann-alpha",
  title: "公告",
  body: "Aoi 正在进行 KIRAKIRA 风格视觉与社区 API 接入。欢迎继续打磨创作者投稿、互动和通知能力。",
  href: null,
  severity: "info",
  startsAt: "2026-06-03T00:00:00.000Z",
  endsAt: null
}

export const mockVideos: VideoSummary[] = [
  {
    id: "video-aoi-alpha",
    slug: "aoi-alpha",
    title: "Aoi Alpha：清透社区首页的第一次视觉试映",
    description: "从静态设计原型迁移到 Nuxt 首页，并接入 Material Web 的 Aoi wrapper。",
    thumbnailUrl: "gradient:aoi-alpha",
    durationSeconds: 300,
    viewCount: 1200,
    commentCount: 36,
    publishedAt: "2026-06-03T10:00:00.000Z",
    uploader: mockUsers.rin!,
    categories: [category("design"), category("tech")]
  },
  {
    id: "video-token-array",
    slug: "token-array",
    title: "Colorful Array：蓝绿色主题 token 的组合实验",
    description: "Aoi token 与 Material Web token 的映射记录。",
    thumbnailUrl: "gradient:token-array",
    durationSeconds: 198,
    viewCount: 856,
    commentCount: 18,
    publishedAt: "2026-06-02T10:00:00.000Z",
    uploader: mockUsers.lab!,
    categories: [category("design")]
  },
  {
    id: "video-dark-mode",
    slug: "dark-mode",
    title: "夜间模式预览：暗色界面里的高可读内容网格",
    description: "暗色主题与媒体卡片可读性演示。",
    thumbnailUrl: "gradient:dark-mode",
    durationSeconds: 252,
    viewCount: 420,
    commentCount: 9,
    publishedAt: "2026-06-01T10:00:00.000Z",
    uploader: mockUsers.design!,
    categories: [category("design")]
  },
  {
    id: "video-mobile-grid",
    slug: "mobile-grid",
    title: "移动端双列卡片：避免裁切的响应式布局",
    description: "390px 移动视口下的网格约束与底部导航。",
    thumbnailUrl: "gradient:mobile-grid",
    durationSeconds: 384,
    viewCount: 638,
    commentCount: 12,
    publishedAt: "2026-05-30T10:00:00.000Z",
    uploader: mockUsers.frontend!,
    categories: [category("tech"), category("design")]
  },
  {
    id: "video-go-api",
    slug: "go-api-ready",
    title: "Community API Ready：前端数据如何平滑切换后端",
    description: "DTO、runtime config 与后端社区接口接入。",
    thumbnailUrl: "gradient:go-api",
    durationSeconds: 496,
    viewCount: 1800,
    commentCount: 44,
    publishedAt: "2026-05-28T10:00:00.000Z",
    uploader: mockUsers.backend!,
    categories: [category("tech")]
  },
  {
    id: "video-sakura-accent",
    slug: "sakura-accent",
    title: "Sakura Accent：柔和粉色在状态反馈中的使用方式",
    description: "状态、动效与品牌点缀。",
    thumbnailUrl: "gradient:sakura-accent",
    durationSeconds: 165,
    viewCount: 512,
    commentCount: 15,
    publishedAt: "2026-05-26T10:00:00.000Z",
    uploader: mockUsers.motion!,
    categories: [category("animation"), category("design")]
  },
  {
    id: "video-music-stream",
    slug: "music-stream",
    title: "Aoi Session：轻音乐频道的首个社区播放清单",
    description: "用内容 feed 模拟音乐频道的沉浸式浏览体验。",
    thumbnailUrl: "gradient:music-stream",
    durationSeconds: 276,
    viewCount: 980,
    commentCount: 22,
    publishedAt: "2026-05-24T10:00:00.000Z",
    uploader: mockUsers.lab!,
    categories: [category("music"), category("general")]
  },
  {
    id: "video-game-room",
    slug: "game-room",
    title: "Game Room：游戏分区的信息密度与卡片状态",
    description: "游戏内容如何在两列移动卡片里保持可读。",
    thumbnailUrl: "gradient:game-room",
    durationSeconds: 612,
    viewCount: 2310,
    commentCount: 67,
    publishedAt: "2026-05-21T10:00:00.000Z",
    uploader: mockUsers.frontend!,
    categories: [category("games"), category("tech")]
  }
]

export const mockHomePayload: HomePayload = {
  announcement: mockAnnouncement,
  categories: mockCategoryTree,
  latest: {
    items: mockVideos,
    nextCursor: null
  }
}

const creatorMeta: Record<string, {
  bio: string
  followerCount: number
  joinedAt: string
}> = {
  "aoi-backend": {
    bio: "记录 Aoi 前端与后端社区 API 的契约、数据流和工程化取舍。",
    followerCount: 1480,
    joinedAt: "2026-05-08T00:00:00.000Z"
  },
  "aoi-lab": {
    bio: "Aoi 的原型实验室，持续发布视觉、交互和内容社区探索。",
    followerCount: 2180,
    joinedAt: "2026-04-18T00:00:00.000Z"
  },
  "aoi-motion": {
    bio: "关注柔和动效、状态反馈和媒体界面的情绪表达。",
    followerCount: 760,
    joinedAt: "2026-05-12T00:00:00.000Z"
  },
  "design-note": {
    bio: "把复杂的视觉系统拆成可复用、可维护的产品界面记录。",
    followerCount: 960,
    joinedAt: "2026-04-25T00:00:00.000Z"
  },
  "frontend-memo": {
    bio: "前端布局、响应式细节和交互体验的实现备忘录。",
    followerCount: 1320,
    joinedAt: "2026-05-01T00:00:00.000Z"
  },
  rin721: {
    bio: "Aoi 发起者，关注清透、高信息可读性和可演进的社区产品体验。",
    followerCount: 3420,
    joinedAt: "2026-04-10T00:00:00.000Z"
  }
}

export function listMockCreators(limit?: number): CreatorProfile[] {
  const creators = Object.values(mockUsers)
    .map((user) => getMockCreatorProfile(user.handle))
    .filter((creator): creator is CreatorProfile => Boolean(creator))
    .sort((a, b) => b.followerCount - a.followerCount)

  return creators.slice(0, limit || creators.length)
}

export function getMockCreatorProfile(handle: string): CreatorProfile | null {
  const normalizedHandle = normalize(handle)
  const user = Object.values(mockUsers).find((item) => normalize(item.handle) === normalizedHandle)

  if (!user) {
    return null
  }

  const latest = mockVideos.filter((video) => video.uploader.handle === user.handle)
  const categories = uniqueCategories(latest.flatMap((video) => video.categories))
  const meta = creatorMeta[user.handle] || {
    bio: null,
    followerCount: Math.max(120, latest.length * 320),
    joinedAt: "2026-05-01T00:00:00.000Z"
  }

  return {
    ...user,
    bio: meta.bio,
    categories,
    followerCount: meta.followerCount,
    joinedAt: meta.joinedAt,
    latest: {
      items: latest,
      nextCursor: null
    },
    videoCount: latest.length
  }
}

export function getMockFollowingFeed(): FollowingFeedPayload {
  const creators = listMockCreators(4)

  return {
    authenticated: false,
    creators,
    latest: {
      items: creators.flatMap((creator) => creator.latest.items).slice(0, 6),
      nextCursor: null
    },
    message: "当前社区读接口未接入认证；这里展示推荐关注的创作者预览。"
  }
}

export function listMockVideos(params: {
  category?: string
  limit?: number
  q?: string
} = {}) {
  const normalizedQuery = normalize(params.q)
  const categorySlug = params.category || "home"
  const categorySlugs = categorySlug === "home"
    ? []
    : getCategorySelfAndDescendants(mockCategoryTree, categorySlug).map((category) => category.slug)
  let items = categorySlug === "home"
    ? mockVideos
    : mockVideos.filter((video) => video.categories.some((category) => categorySlugs.includes(category.slug)))

  if (normalizedQuery) {
    items = items.filter((video) => matchesVideo(video, normalizedQuery))
  }

  return items.slice(0, params.limit || items.length)
}

export function searchMockVideos(q: string, limit?: number) {
  return listMockVideos({ limit, q })
}

export function searchMockCreators(q: string, limit?: number) {
  const normalizedQuery = normalize(q)

  if (!normalizedQuery) {
    return []
  }

  return listMockCreators()
    .filter((creator) => matchesCreator(creator, normalizedQuery))
    .slice(0, limit || undefined)
}

export function searchMockCategories(q: string, limit?: number) {
  const normalizedQuery = normalize(q)

  if (!normalizedQuery) {
    return []
  }

  return mockCategories
    .filter((category) => category.slug !== "home")
    .filter((category) => matchesCategory(category, normalizedQuery))
    .slice(0, limit || undefined)
}

export function searchMockAll(q: string, limit?: number): SearchPayload {
  const videos = searchMockVideos(q, limit)
  const creators = searchMockCreators(q, limit)
  const categories = searchMockCategories(q, limit)

  return {
    categories: {
      items: categories,
      nextCursor: null
    },
    creators: {
      items: creators,
      nextCursor: null
    },
    query: q.trim(),
    totalCount: videos.length + creators.length + categories.length,
    videos: {
      items: videos,
      nextCursor: null
    }
  }
}

const primaryMockVideoUrl = "https://r2-store.kobayashi.eu.org/aoi/video/1e32a269-bde5-4eb6-9c7e-c35add52b482.mp4"
const secondaryMockVideoUrl = "https://r2-store.kobayashi.eu.org/aoi/video/BV1EF3uzeETo.mp4"

export function getMockVideoDetail(idOrSlug: string): VideoDetail | null {
  const video = mockVideos.find((item) => item.id === idOrSlug || item.slug === idOrSlug)

  if (!video) {
    return null
  }

  const tags = [
    ...new Set([
      ...video.categories.map((item) => item.name),
      video.uploader.displayName,
      "Aoi"
    ])
  ]

  return {
    ...video,
    likeCount: Math.max(24, Math.round(video.viewCount / 12)),
    related: mockVideos.filter((item) => item.id !== video.id).slice(0, 4),
    sourceUrl: primaryMockVideoUrl,
    sources: [
      {
        id: "r2-primary",
        src: primaryMockVideoUrl,
        kind: "native",
        label: "R2 示例 1",
        mimeType: "video/mp4",
        qualityLabel: "Auto",
        isDefault: true
      },
      {
        id: "r2-secondary",
        src: secondaryMockVideoUrl,
        kind: "native",
        label: "R2 示例 2",
        mimeType: "video/mp4",
        qualityLabel: "Alt"
      }
    ],
    tags
  }
}

const mockDanmakuSamples: Array<{
  body: string
  mode?: VideoDanmakuMode
  color?: string
  offset: number
}> = [
  { body: "开场好清爽", offset: 2 },
  { body: "这个控制条很有 Aoi 的味道", offset: 5 },
  { body: "弹幕层测试通过", offset: 8, color: "#7ee7ff" },
  { body: "注意看右侧列表", offset: 11 },
  { body: "顶部固定弹幕", mode: "top", offset: 14, color: "#ffe58a" },
  { body: "节奏刚好", offset: 17 },
  { body: "底部固定弹幕", mode: "bottom", offset: 20, color: "#ffb4d8" },
  { body: "Aoi wrapper 化很舒服", offset: 23 },
  { body: "这里已经可以接后端社区 API", offset: 27 },
  { body: "移动端也要稳", offset: 31 }
]

const mockVideoComments: Record<string, VideoComment[]> = {
  "video-aoi-alpha": [
    {
      id: "comment-aoi-alpha-1",
      videoId: "video-aoi-alpha",
      body: "后端社区模块接上以后，页面里的信息密度终于不只是 mock 了。",
      authorName: "Frontend Memo",
      status: "visible",
      createdAt: "2026-06-03T10:05:00.000Z",
      updatedAt: "2026-06-03T10:05:00.000Z"
    },
    {
      id: "comment-aoi-alpha-2",
      videoId: "video-aoi-alpha",
      body: "黑白几何底色加一点青粉状态色，确实更接近 kirakira 那种清爽锋利感。",
      authorName: "Design Note",
      status: "visible",
      createdAt: "2026-06-03T10:07:00.000Z",
      updatedAt: "2026-06-03T10:07:00.000Z"
    }
  ],
  "video-go-api": [
    {
      id: "comment-go-api-1",
      videoId: "video-go-api",
      body: "route contract 生成 OpenAPI 后，前端接口字段终于有稳定来源。",
      authorName: "Aoi Viewer",
      status: "visible",
      createdAt: "2026-05-28T10:05:00.000Z",
      updatedAt: "2026-05-28T10:05:00.000Z"
    }
  ]
}

export function getMockVideoDanmaku(idOrSlug: string): VideoDanmakuPayload | null {
  const video = mockVideos.find((item) => item.id === idOrSlug || item.slug === idOrSlug)

  if (!video) {
    return null
  }

  const items: VideoDanmakuItem[] = mockDanmakuSamples.map((item, index) => ({
    id: `danmaku-${video.id}-${index + 1}`,
    videoId: video.id,
    body: item.body,
    timeSeconds: Math.min(video.durationSeconds - 1, item.offset + index * 2),
    mode: item.mode || "scroll",
    color: item.color || "#ffffff",
    authorName: index % 3 === 0 ? video.uploader.displayName : "Aoi Viewer",
    createdAt: new Date(Date.parse(video.publishedAt) + index * 90_000).toISOString()
  }))

  return {
    items,
    nextCursor: null,
    totalCount: items.length,
    videoId: video.id
  }
}

export function getMockVideoComments(idOrSlug: string, params: {
  limit?: number
  sort?: VideoCommentSortMode
} = {}): VideoCommentPayload | null {
  const video = mockVideos.find((item) => item.id === idOrSlug || item.slug === idOrSlug)

  if (!video) {
    return null
  }

  const sort = params.sort === "oldest" ? "oldest" : "newest"
  const items = [...(mockVideoComments[video.id] || [])]
    .sort((a, b) => {
      const aTime = Date.parse(a.createdAt)
      const bTime = Date.parse(b.createdAt)

      return sort === "oldest" ? aTime - bTime : bTime - aTime
    })
  const limit = params.limit && params.limit > 0 ? Math.min(params.limit, 100) : items.length

  return {
    items: items.slice(0, limit),
    nextCursor: null,
    sort,
    totalCount: items.length,
    videoId: video.id
  }
}

export function createMockVideoComment(idOrSlug: string, payload: CreateVideoCommentRequest): VideoComment | null {
  const video = mockVideos.find((item) => item.id === idOrSlug || item.slug === idOrSlug)

  if (!video) {
    return null
  }

  const authorName = payload.authorName.trim().slice(0, 24)
  const body = payload.body.trim().slice(0, 500)

  if (!authorName || !body) {
    return null
  }

  const now = new Date().toISOString()
  const comment: VideoComment = {
    id: `comment-${video.id}-${Date.now().toString(36)}`,
    videoId: video.id,
    body,
    authorName,
    status: "visible",
    createdAt: now,
    updatedAt: now
  }

  mockVideoComments[video.id] = [comment, ...(mockVideoComments[video.id] || [])]
  video.commentCount = (video.commentCount || 0) + 1

  return comment
}

function matchesVideo(video: VideoSummary, normalizedQuery: string) {
  const haystack = [
    video.title,
    video.description,
    video.uploader.displayName,
    video.uploader.handle,
    ...video.categories.map((category) => category.name),
    ...video.categories.map((category) => category.slug)
  ].filter(Boolean).join(" ")

  return normalize(haystack).includes(normalizedQuery)
}

function matchesCreator(creator: CreatorProfile, normalizedQuery: string) {
  const haystack = [
    creator.displayName,
    creator.handle,
    creator.bio,
    ...creator.categories.map((category) => category.name),
    ...creator.categories.map((category) => category.slug),
    ...creator.latest.items.map((video) => video.title)
  ].filter(Boolean).join(" ")

  return normalize(haystack).includes(normalizedQuery)
}

function matchesCategory(category: Category, normalizedQuery: string) {
  const haystack = [
    category.name,
    category.slug,
    category.description
  ].filter(Boolean).join(" ")

  return normalize(haystack).includes(normalizedQuery)
}

function uniqueCategories(categories: Category[]) {
  const seen = new Set<string>()

  return categories.filter((item) => {
    if (seen.has(item.slug)) {
      return false
    }

    seen.add(item.slug)
    return true
  })
}

function normalize(value: string | null | undefined) {
  return (value || "").trim().toLowerCase()
}
