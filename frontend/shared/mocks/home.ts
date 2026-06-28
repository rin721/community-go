import type {
  Announcement,
  Category,
  CategoryTreeNode,
  CommunityDynamicItem,
  CommunityDynamicPayload,
  CommunityNotificationItem,
  CommunityNotificationPayload,
  CommunityReportReceipt,
  CommunitySubmissionItem,
  CommunitySubmissionPayload,
  CreateCommunityDynamicRequest,
  CreateCommunitySubmissionRequest,
  CreatorFollowState,
  CreatorProfile,
  DeleteCommunityDynamicResult,
  FollowingFeedPayload,
  HomePayload,
  SearchPayload,
  ReviewCommunitySubmissionRequest,
  CreatorFollowRequest,
  CreateVideoCommentRequest,
  CreateVideoDanmakuRequest,
  CreateVideoReportRequest,
  DeleteVideoCommentResult,
  VideoHistoryClearRequest,
  VideoHistoryItem,
  VideoHistoryPayload,
  VideoHistoryRequest,
  VideoInteractionKind,
  VideoInteractionRequest,
  VideoInteractionState,
  VideoLibraryPayload,
  VideoReportReason,
  VideoDanmakuItem,
  VideoDanmakuMode,
  VideoDanmakuPayload,
  VideoComment,
  VideoCommentPayload,
  VideoCommentSortMode,
  UpdateCommunityDynamicRequest,
  UpdateVideoCommentRequest,
  UserSummary,
  VideoDetail,
  VideoSummary
} from "../types/api"
import {
  findCategoryInTree,
  flattenCategoryTree,
  getCategorySelfAndDescendants
} from "../utils/categories"

type StoredVideoComment = VideoComment & {
  clientId?: string
}

export const mockCategoryTree: CategoryTreeNode[] = [
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
  backend: { id: "user-curator", handle: "aoi-curator", displayName: "Aoi Curator", avatarUrl: null },
  design: { id: "user-design", handle: "color-note", displayName: "Color Note", avatarUrl: null },
  frontend: { id: "user-layout", handle: "layout-notes", displayName: "Layout Notes", avatarUrl: null },
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
  title: "今日更新",
  body: "首页阅读节奏变得更轻了，分类、动态和最新投稿会一起陪你发现新的创作者内容。",
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
    description: "一次首页试映，观察清透标题、分类入口和动态流如何自然连在一起。",
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
    title: "Colorful Array：青粉主题的几何折线实验",
    description: "用柔和色彩和几何折线做一组频道封面的延展实验。",
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
    title: "Community Notes：从投稿到互动的顺畅动线",
    description: "围绕评论、收藏和关注整理一条轻快的社区浏览路径。",
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

const mockVideoLikes: Record<string, number> = Object.fromEntries(mockVideos.map((video) => [
  video.id,
  Math.max(24, Math.round(video.viewCount / 12))
]))
const mockVideoSourceUrls: Record<string, string> = {}
const mockVideoInteractions: Record<string, Record<string, Record<string, string>>> = {}
const mockCommunityDynamics: CommunityDynamicItem[] = [
  {
    id: "dynamic-rin-alpha",
    kind: "video_update",
    authorName: mockUsers.rin!.displayName,
    author: mockUsers.rin!,
    body: "今天把首页动态整理成更轻的阅读节奏，短更新和关联视频会自然连在一起。",
    videoId: "video-aoi-alpha",
    video: mockVideos.find((video) => video.id === "video-aoi-alpha") || null,
    createdAt: "2026-06-03T10:16:00.000Z",
    updatedAt: "2026-06-03T10:16:00.000Z"
  },
  {
    id: "dynamic-design-sakura",
    kind: "video_update",
    authorName: mockUsers.design!.displayName,
    author: mockUsers.design!,
    body: "这轮视觉继续保留清透底色、细线边框和一点柔和粉色状态，让社区信息更像连续流而不是孤立卡片。",
    videoId: "video-sakura-accent",
    video: mockVideos.find((video) => video.id === "video-sakura-accent") || null,
    createdAt: "2026-06-03T09:42:00.000Z",
    updatedAt: "2026-06-03T09:42:00.000Z"
  },
  {
    id: "dynamic-frontend-mobile",
    kind: "video_update",
    authorName: mockUsers.frontend!.displayName,
    author: mockUsers.frontend!,
    body: "手机上也能轻松阅读动态卡片，长句会自然换行，视频入口保持稳定比例。",
    videoId: "video-mobile-grid",
    video: mockVideos.find((video) => video.id === "video-mobile-grid") || null,
    createdAt: "2026-06-03T08:50:00.000Z",
    updatedAt: "2026-06-03T08:50:00.000Z"
  },
  {
    id: "dynamic-aoi-lab-note",
    kind: "text",
    authorName: mockUsers.lab!.displayName,
    author: mockUsers.lab!,
    body: "关注页现在会优先显示已关注创作者的动态，没有关注时则展示推荐预览，方便继续打磨社区入口。",
    videoId: "",
    video: null,
    createdAt: "2026-06-03T08:18:00.000Z",
    updatedAt: "2026-06-03T08:18:00.000Z"
  }
]
const mockCommunityDynamicOwners: Record<string, string> = {}

export const mockHomePayload: HomePayload = {
  announcement: mockAnnouncement,
  categories: mockCategoryTree,
  dynamics: {
    items: mockCommunityDynamics.slice(0, 6),
    nextCursor: null
  },
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
  "aoi-curator": {
    bio: "整理 Aoi 的创作者投稿、频道主题和社区活动笔记。",
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
  "color-note": {
    bio: "把复杂的视觉系统拆成可复用、可维护的产品界面记录。",
    followerCount: 960,
    joinedAt: "2026-04-25T00:00:00.000Z"
  },
  "layout-notes": {
    bio: "记录社区页面的阅读节奏、响应式细节和互动体验。",
    followerCount: 1320,
    joinedAt: "2026-05-01T00:00:00.000Z"
  },
  rin721: {
    bio: "Aoi 发起者，关注清透、高信息可读性和可演进的社区产品体验。",
    followerCount: 3420,
    joinedAt: "2026-04-10T00:00:00.000Z"
  }
}

const mockCreatorFollows: Record<string, Record<string, string>> = {}

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

export function getMockCreatorFollowState(handle: string, clientId: string): CreatorFollowState | null {
  const creator = getMockCreatorProfile(handle)
  const normalizedClientId = normalizeMockClientId(clientId)

  if (!creator || !normalizedClientId) {
    return null
  }

  const followedAt = mockCreatorFollows[normalizedClientId]?.[creator.id] || null

  return {
    clientId: normalizedClientId,
    creatorId: creator.id,
    followedAt,
    followerCount: creator.followerCount + (followedAt ? 1 : 0),
    following: Boolean(followedAt),
    handle: creator.handle
  }
}

export function followMockCreator(handle: string, payload: CreatorFollowRequest): CreatorFollowState | null {
  const creator = getMockCreatorProfile(handle)
  const clientId = normalizeMockClientId(payload.clientId)

  if (!creator || !clientId) {
    return null
  }

  const wasFollowing = Boolean(mockCreatorFollows[clientId]?.[creator.id])
  const followedAt = mockCreatorFollows[clientId]?.[creator.id] || new Date().toISOString()
  mockCreatorFollows[clientId] = {
    ...(mockCreatorFollows[clientId] || {}),
    [creator.id]: followedAt
  }
  if (!wasFollowing) {
    pushMockCommunityNotification(clientId, {
      body: `你已关注 ${creator.displayName}，新的投稿会进入关注动态。`,
      creatorId: creator.id,
      kind: "follow",
      link: `/u/${creator.handle}`,
      targetId: creator.id,
      targetKind: "creator",
      title: "已关注创作者"
    })
  }

  return getMockCreatorFollowState(handle, clientId)
}

export function unfollowMockCreator(handle: string, clientId: string): CreatorFollowState | null {
  const creator = getMockCreatorProfile(handle)
  const normalizedClientId = normalizeMockClientId(clientId)

  if (!creator || !normalizedClientId) {
    return null
  }

  if (mockCreatorFollows[normalizedClientId]?.[creator.id]) {
    const next = { ...mockCreatorFollows[normalizedClientId] }
    delete next[creator.id]
    mockCreatorFollows[normalizedClientId] = next
  }

  return getMockCreatorFollowState(handle, normalizedClientId)
}

export function getMockFollowingFeed(clientId?: string): FollowingFeedPayload {
  const normalizedClientId = normalizeMockClientId(clientId || "")
  const followedCreatorIds = normalizedClientId ? mockCreatorFollows[normalizedClientId] || {} : {}
  const followedCreators: CreatorProfile[] = []
  for (const [creatorId, followedAt] of Object.entries(followedCreatorIds)) {
    const user = Object.values(mockUsers).find((item) => item.id === creatorId)
    const creator = user ? getMockCreatorProfile(user.handle) : null

    if (creator) {
      followedCreators.push({ ...creator, followedAt })
    }
  }
  followedCreators.sort((a, b) => Date.parse(b.followedAt || "") - Date.parse(a.followedAt || ""))
  const creators = followedCreators.length ? followedCreators : listMockCreators(4)
  const followedSet = new Set(Object.keys(followedCreatorIds))
  const dynamicItems = followedSet.size
    ? mockCommunityDynamics.filter((item) => item.author?.id && followedSet.has(item.author.id))
    : mockCommunityDynamics.slice(0, 6)

  return {
    authenticated: false,
    clientId: normalizedClientId || null,
    creators,
    dynamics: {
      items: dynamicItems.map((item) => withMockCommunityDynamicOwnership(item, normalizedClientId)),
      nextCursor: null
    },
    followingCount: followedCreators.length,
    latest: {
      items: creators.flatMap((creator) => creator.latest.items).slice(0, 6),
      nextCursor: null
    },
    message: followedCreators.length
      ? "关注关系来自本地演示数据；真实模式会同步你的社区关注。"
      : "还没有识别到你的关注列表，先展示社区推荐。"
  }
}

export function getMockCommunityDynamics(clientId?: string, limit?: number): CommunityDynamicPayload {
  const normalizedClientId = normalizeMockClientId(clientId || "")
  const visibleLimit = Math.min(Math.max(limit || 24, 1), 100)

  return {
    authenticated: false,
    clientId: normalizedClientId || null,
    items: {
      items: mockCommunityDynamics
        .slice(0, visibleLimit)
        .map((item) => withMockCommunityDynamicOwnership(item, normalizedClientId)),
      nextCursor: null
    },
    message: "社区动态来自本地演示数据；真实模式会展示社区时间线。"
  }
}

export function createMockCommunityDynamic(payload: CreateCommunityDynamicRequest): CommunityDynamicItem | null {
  const clientId = normalizeMockClientId(payload.clientId)
  const authorName = payload.authorName.trim().slice(0, 24)
  const body = payload.body.trim().slice(0, 280)
  const video = payload.videoId ? getMockVideo(payload.videoId) : null

  if (!clientId || !authorName || !body || (payload.videoId && !video)) {
    return null
  }

  const now = new Date().toISOString()
  const item: CommunityDynamicItem = {
    id: `dynamic-${clientId}-${Date.now().toString(36)}`,
    kind: video ? "video_update" : "text",
    authorName,
    author: video?.uploader || null,
    body,
    videoId: video?.id || "",
    video,
    createdAt: now,
    updatedAt: now,
    ownedByCurrentClient: true
  }
  mockCommunityDynamicOwners[item.id] = clientId
  mockCommunityDynamics.unshift(item)

  return item
}

export function updateMockCommunityDynamic(dynamicId: string, payload: UpdateCommunityDynamicRequest): CommunityDynamicItem | null {
  const clientId = normalizeMockClientId(payload.clientId || "")
  const body = payload.body.trim().slice(0, 280)
  const index = mockCommunityDynamics.findIndex((item) => item.id === dynamicId)

  if (index < 0 || !clientId || !body || mockCommunityDynamicOwners[dynamicId] !== clientId) {
    return null
  }

  const updated: CommunityDynamicItem = {
    ...mockCommunityDynamics[index]!,
    body,
    updatedAt: new Date().toISOString()
  }
  mockCommunityDynamics[index] = updated

  return withMockCommunityDynamicOwnership(updated, clientId)
}

export function deleteMockCommunityDynamic(dynamicId: string, clientIdInput: string): DeleteCommunityDynamicResult | null {
  const clientId = normalizeMockClientId(clientIdInput)
  const index = mockCommunityDynamics.findIndex((item) => item.id === dynamicId)

  if (index < 0 || !clientId || mockCommunityDynamicOwners[dynamicId] !== clientId) {
    return null
  }

  mockCommunityDynamics.splice(index, 1)
  delete mockCommunityDynamicOwners[dynamicId]

  return {
    clientId,
    deleted: true,
    dynamicId
  }
}

export function getMockVideoInteractionState(idOrSlug: string, clientId: string): VideoInteractionState | null {
  const video = getMockVideo(idOrSlug)
  const normalizedClientId = normalizeMockClientId(clientId)

  if (!video || !normalizedClientId) {
    return null
  }

  const interactions = mockVideoInteractions[normalizedClientId]?.[video.id] || {}

  return {
    clientId: normalizedClientId,
    favorited: Boolean(interactions.favorite),
    liked: Boolean(interactions.like),
    likeCount: getMockVideoLikeCount(video),
    videoId: video.id,
    watchLater: Boolean(interactions.watch_later)
  }
}

export function setMockVideoInteraction(idOrSlug: string, kind: VideoInteractionKind, payload: VideoInteractionRequest): VideoInteractionState | null {
  const video = getMockVideo(idOrSlug)
  const clientId = normalizeMockClientId(payload.clientId)

  if (!video || !clientId || !isMockVideoInteractionKind(kind)) {
    return null
  }

  const videoInteractions = {
    ...(mockVideoInteractions[clientId]?.[video.id] || {})
  }
  const wasActive = Boolean(videoInteractions[kind])
  videoInteractions[kind] = videoInteractions[kind] || new Date().toISOString()
  mockVideoInteractions[clientId] = {
    ...(mockVideoInteractions[clientId] || {}),
    [video.id]: videoInteractions
  }

  if (!wasActive && kind === "like") {
    mockVideoLikes[video.id] = getMockVideoLikeCount(video) + 1
  }
  if (!wasActive) {
    pushMockCommunityNotification(clientId, {
      body: mockInteractionNotificationBody(kind, video.title),
      creatorId: video.uploader.id,
      kind: "interaction",
      link: `/video/${video.slug}`,
      targetId: video.id,
      targetKind: "video",
      title: mockInteractionNotificationTitle(kind),
      videoId: video.id
    })
  }

  return getMockVideoInteractionState(video.id, clientId)
}

export function unsetMockVideoInteraction(idOrSlug: string, kind: VideoInteractionKind, clientId: string): VideoInteractionState | null {
  const video = getMockVideo(idOrSlug)
  const normalizedClientId = normalizeMockClientId(clientId)

  if (!video || !normalizedClientId || !isMockVideoInteractionKind(kind)) {
    return null
  }

  const videoInteractions = {
    ...(mockVideoInteractions[normalizedClientId]?.[video.id] || {})
  }
  const wasActive = Boolean(videoInteractions[kind])
  delete videoInteractions[kind]
  mockVideoInteractions[normalizedClientId] = {
    ...(mockVideoInteractions[normalizedClientId] || {}),
    [video.id]: videoInteractions
  }

  if (wasActive && kind === "like") {
    mockVideoLikes[video.id] = Math.max(0, getMockVideoLikeCount(video) - 1)
  }

  return getMockVideoInteractionState(video.id, normalizedClientId)
}

export function getMockVideoLibrary(clientId: string): VideoLibraryPayload | null {
  const normalizedClientId = normalizeMockClientId(clientId)

  if (!normalizedClientId) {
    return null
  }

  const favorites = mockVideosForInteractionKind(normalizedClientId, "favorite")
  const watchLater = mockVideosForInteractionKind(normalizedClientId, "watch_later")

  return {
    authenticated: false,
    clientId: normalizedClientId,
    favoriteCount: favorites.length,
    favorites: {
      items: favorites,
      nextCursor: null
    },
    message: "收藏和稍后看来自本地演示数据；真实模式会同步社区资料库。",
    watchLater: {
      items: watchLater,
      nextCursor: null
    },
    watchLaterCount: watchLater.length
  }
}

export function listMockVideos(params: {
  category?: string
  limit?: number
  q?: string
} = {}) {
  const normalizedQuery = normalize(params.q)
  const categorySlug = params.category || ""
  const categorySlugs = categorySlug
    ? getCategorySelfAndDescendants(mockCategoryTree, categorySlug).map((category) => category.slug)
    : []
  let items = !categorySlug
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
  const video = getMockVideo(idOrSlug)

  if (!video) {
    return null
  }
  const primaryUrl = mockVideoSourceUrls[video.id] || primaryMockVideoUrl

  const tags = [
    ...new Set([
      ...video.categories.map((item) => item.name),
      video.uploader.displayName,
      "Aoi"
    ])
  ]

  return {
    ...video,
    likeCount: getMockVideoLikeCount(video),
    related: mockVideos.filter((item) => item.id !== video.id).slice(0, 4),
    sourceUrl: primaryUrl,
    sources: [
      {
        id: `${video.id}-primary`,
        src: primaryUrl,
        kind: "native",
        label: mockVideoSourceUrls[video.id] ? "Mock 投稿源" : "R2 示例 1",
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
  { body: "弹幕刚好飘过", offset: 8, color: "#7ee7ff" },
  { body: "注意看右侧列表", offset: 11 },
  { body: "顶部固定弹幕", mode: "top", offset: 14, color: "#ffe58a" },
  { body: "节奏刚好", offset: 17 },
  { body: "底部固定弹幕", mode: "bottom", offset: 20, color: "#ffb4d8" },
  { body: "这个播放层很舒服", offset: 23 },
  { body: "互动反馈已经很顺", offset: 27 },
  { body: "移动端也要稳", offset: 31 }
]

const mockVideoComments: Record<string, StoredVideoComment[]> = {
  "video-aoi-alpha": [
    {
      id: "comment-aoi-alpha-1",
      videoId: "video-aoi-alpha",
      body: "首页信息密度轻了很多，动态、分类和最新投稿之间的节奏更顺了。",
      authorName: "Layout Notes",
      status: "visible",
      createdAt: "2026-06-03T10:05:00.000Z",
      updatedAt: "2026-06-03T10:05:00.000Z"
    },
    {
      id: "comment-aoi-alpha-2",
      videoId: "video-aoi-alpha",
      body: "黑白几何底色加一点青粉状态色，确实更接近 kirakira 那种清爽锋利感。",
      authorName: "Color Note",
      status: "visible",
      createdAt: "2026-06-03T10:07:00.000Z",
      updatedAt: "2026-06-03T10:07:00.000Z"
    }
  ],
  "video-go-api": [
    {
      id: "comment-go-api-1",
      videoId: "video-go-api",
      body: "从投稿到收藏这一段路径很顺，适合作为新用户的第一条浏览路线。",
      authorName: "Aoi Viewer",
      status: "visible",
      createdAt: "2026-05-28T10:05:00.000Z",
      updatedAt: "2026-05-28T10:05:00.000Z"
    }
  ]
}

const mockVideoDanmaku: Record<string, VideoDanmakuItem[]> = {}
const mockVideoHistory: Record<string, Record<string, VideoHistoryItem>> = {}
const mockVideoReports: CommunityReportReceipt[] = []
const mockCommunityNotifications: Record<string, CommunityNotificationItem[]> = {}
const mockCommunitySubmissions: Record<string, CommunitySubmissionItem[]> = {}

export function getMockVideoHistory(clientId: string, limit?: number): VideoHistoryPayload | null {
  const normalizedClientId = normalizeMockClientId(clientId)

  if (!normalizedClientId) {
    return null
  }

  const items = Object.values(mockVideoHistory[normalizedClientId] || {})
    .sort((left, right) => Date.parse(right.lastViewedAt) - Date.parse(left.lastViewedAt))
  const visibleItems = items.slice(0, Math.min(Math.max(limit || 48, 1), 100))

  return {
    authenticated: false,
    clientId: normalizedClientId,
    historyCount: items.length,
    items: {
      items: visibleItems,
      nextCursor: null
    },
    message: "观看历史来自本地演示数据；真实模式会同步社区观看记录。"
  }
}

export function recordMockVideoHistory(idOrSlug: string, payload: VideoHistoryRequest): VideoHistoryItem | null {
  const video = getMockVideo(idOrSlug)
  const clientId = normalizeMockClientId(payload.clientId)

  if (!video || !clientId) {
    return null
  }

  const item: VideoHistoryItem = {
    lastViewedAt: new Date().toISOString(),
    progressSeconds: normalizeMockHistoryProgress(payload.progressSeconds, video.durationSeconds),
    video
  }
  mockVideoHistory[clientId] = {
    ...(mockVideoHistory[clientId] || {}),
    [video.id]: item
  }

  return item
}

export function clearMockVideoHistory(payload: VideoHistoryClearRequest): VideoHistoryPayload | null {
  const clientId = normalizeMockClientId(payload.clientId)

  if (!clientId) {
    return null
  }

  delete mockVideoHistory[clientId]

  return getMockVideoHistory(clientId)
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
  const persistedItems = mockVideoDanmaku[video.id] || []
  const mergedItems = [...items, ...persistedItems].sort((a, b) => a.timeSeconds - b.timeSeconds)

  return {
    items: mergedItems,
    nextCursor: null,
    totalCount: mergedItems.length,
    videoId: video.id
  }
}

export function createMockVideoDanmaku(idOrSlug: string, payload: CreateVideoDanmakuRequest): VideoDanmakuItem | null {
  const video = mockVideos.find((item) => item.id === idOrSlug || item.slug === idOrSlug)

  if (!video) {
    return null
  }

  const authorName = payload.authorName.trim().slice(0, 24)
  const body = payload.body.trim().slice(0, 80)

  if (!authorName || !body) {
    return null
  }

  const item: VideoDanmakuItem = {
    id: `danmaku-${video.id}-${Date.now().toString(36)}`,
    videoId: video.id,
    body,
    timeSeconds: normalizeMockDanmakuTime(payload.timeSeconds, video.durationSeconds),
    mode: normalizeMockDanmakuMode(payload.mode),
    color: normalizeMockDanmakuColor(payload.color),
    authorName,
    createdAt: new Date().toISOString()
  }

  mockVideoDanmaku[video.id] = [...(mockVideoDanmaku[video.id] || []), item]
  const clientId = normalizeMockClientId(payload.clientId || "")
  if (clientId) {
    pushMockCommunityNotification(clientId, {
      body: `你的弹幕已经出现在《${video.title}》的播放时间轴上。`,
      creatorId: video.uploader.id,
      kind: "danmaku",
      link: `/video/${video.slug}`,
      targetId: video.id,
      targetKind: "video",
      title: "弹幕已发送",
      videoId: video.id
    })
  }

  return item
}

export function getMockVideoComments(idOrSlug: string, params: {
  clientId?: string
  limit?: number
  sort?: VideoCommentSortMode
} = {}): VideoCommentPayload | null {
  const video = mockVideos.find((item) => item.id === idOrSlug || item.slug === idOrSlug)

  if (!video) {
    return null
  }

  const sort = params.sort === "oldest" ? "oldest" : "newest"
  const clientId = normalizeMockClientId(params.clientId || "")
  const items = [...(mockVideoComments[video.id] || [])]
    .sort((a, b) => {
      const aTime = Date.parse(a.createdAt)
      const bTime = Date.parse(b.createdAt)

      return sort === "oldest" ? aTime - bTime : bTime - aTime
    })
  const limit = params.limit && params.limit > 0 ? Math.min(params.limit, 100) : items.length

  return {
    items: items.slice(0, limit).map((comment) => publicMockVideoComment(comment, clientId)),
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
  const clientId = normalizeMockClientId(payload.clientId || "")
  const comment: StoredVideoComment = {
    id: `comment-${video.id}-${Date.now().toString(36)}`,
    videoId: video.id,
    clientId,
    body,
    authorName,
    status: "visible",
    createdAt: now,
    updatedAt: now,
    ownedByCurrentClient: Boolean(clientId)
  }

  mockVideoComments[video.id] = [comment, ...(mockVideoComments[video.id] || [])]
  video.commentCount = (video.commentCount || 0) + 1
  if (clientId) {
    pushMockCommunityNotification(clientId, {
      body: `你在《${video.title}》下发布的评论已经进入公开讨论区。`,
      creatorId: video.uploader.id,
      kind: "comment",
      link: `/video/${video.slug}`,
      targetId: video.id,
      targetKind: "video",
      title: "评论已发布",
      videoId: video.id
    })
  }

  return publicMockVideoComment(comment, clientId)
}

export function updateMockVideoComment(idOrSlug: string, commentId: string, payload: UpdateVideoCommentRequest): VideoComment | null {
  const video = mockVideos.find((item) => item.id === idOrSlug || item.slug === idOrSlug)
  const clientId = normalizeMockClientId(payload.clientId || "")
  const body = payload.body.trim().slice(0, 500)

  if (!video || !clientId || !body) {
    return null
  }

  const comments = mockVideoComments[video.id] || []
  const index = comments.findIndex((comment) => comment.id === commentId && comment.clientId === clientId)
  if (index < 0) {
    return null
  }
  const current = comments[index]
  if (!current) {
    return null
  }

  const updated: StoredVideoComment = {
    ...current,
    body,
    updatedAt: new Date().toISOString(),
    ownedByCurrentClient: true
  }
  mockVideoComments[video.id] = [
    ...comments.slice(0, index),
    updated,
    ...comments.slice(index + 1)
  ]

  return publicMockVideoComment(updated, clientId)
}

export function deleteMockVideoComment(idOrSlug: string, commentId: string, clientIdInput: string): DeleteVideoCommentResult | null {
  const video = mockVideos.find((item) => item.id === idOrSlug || item.slug === idOrSlug)
  const clientId = normalizeMockClientId(clientIdInput)

  if (!video || !clientId) {
    return null
  }

  const comments = mockVideoComments[video.id] || []
  const index = comments.findIndex((comment) => comment.id === commentId && comment.clientId === clientId)
  if (index < 0) {
    return null
  }

  mockVideoComments[video.id] = comments.filter((comment) => comment.id !== commentId)
  video.commentCount = Math.max(0, (video.commentCount || 0) - 1)

  return {
    commentId,
    videoId: video.id,
    clientId,
    deleted: true
  }
}

function publicMockVideoComment(comment: StoredVideoComment, clientId: string): VideoComment {
  const { clientId: storedClientId, ...publicComment } = comment

  return {
    ...publicComment,
    ownedByCurrentClient: Boolean(clientId && storedClientId === clientId)
  }
}

export function createMockVideoReport(idOrSlug: string, payload: CreateVideoReportRequest): CommunityReportReceipt | null {
  const video = mockVideos.find((item) => item.id === idOrSlug || item.slug === idOrSlug)

  if (!video) {
    return null
  }

  const clientId = payload.clientId.trim().slice(0, 96)
  const reason = normalizeMockVideoReportReason(payload.reason)

  if (!clientId || !reason) {
    return null
  }

  const receipt: CommunityReportReceipt = {
    id: `report-${video.id}-${Date.now().toString(36)}`,
    targetKind: "video",
    targetId: video.id,
    videoId: video.id,
    clientId,
    reason,
    status: "pending",
    createdAt: new Date().toISOString()
  }

  mockVideoReports.push(receipt)
  pushMockCommunityNotification(clientId, {
    body: `你提交的《${video.title}》举报已进入待处理队列。`,
    creatorId: video.uploader.id,
    kind: "report",
    link: `/video/${video.slug}`,
    targetId: video.id,
    targetKind: "video",
    title: "举报已收到",
    videoId: video.id
  })

  return receipt
}

export function getMockCommunitySubmissions(clientId: string, limit?: number): CommunitySubmissionPayload | null {
  const normalizedClientId = normalizeMockClientId(clientId)

  if (!normalizedClientId) {
    return null
  }

  const items = [...(mockCommunitySubmissions[normalizedClientId] || [])]
    .sort((left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt))
  const visibleItems = items.slice(0, Math.min(Math.max(limit || 24, 1), 100))

  return {
    authenticated: false,
    clientId: normalizedClientId,
    items: {
      items: visibleItems,
      nextCursor: null
    },
    message: "投稿记录来自本地演示数据；真实模式会同步社区投稿回执。"
  }
}

export function createMockCommunitySubmission(payload: CreateCommunitySubmissionRequest): CommunitySubmissionItem | null {
	const clientId = normalizeMockClientId(payload.clientId)
	const authorName = payload.authorName.trim().slice(0, 24)
	const title = payload.title.trim().slice(0, 160)
	const category = getMockCategory(payload.categorySlug)
	const visibility = normalizeMockSubmissionVisibility(payload.visibility)
	const sourceName = payload.sourceName.trim().slice(0, 240)
	const now = new Date().toISOString()

	if (!clientId || !authorName || title.length < 4 || !category || !visibility || !sourceName || payload.sourceSize <= 0) {
		return null
	}

  const item: CommunitySubmissionItem = {
		allowComments: Boolean(payload.allowComments),
		authorName,
		category,
		categorySlug: category.slug,
		clientId,
		createdAt: now,
		description: payload.description.trim().slice(0, 720),
		id: `submission-${clientId}-${Date.now().toString(36)}`,
		sensitive: Boolean(payload.sensitive),
		sourceName,
		sourceSize: payload.sourceSize,
    sourceType: payload.sourceType.trim().slice(0, 120),
		status: "pending_review",
		tags: normalizeMockSubmissionTags(payload.tags),
		title,
		updatedAt: now,
		visibility
	}

  mockCommunitySubmissions[clientId] = [
    item,
    ...(mockCommunitySubmissions[clientId] || [])
  ]
  pushMockCommunityNotification(clientId, {
    body: `《${item.title}》已进入待审核池，当前只保存标题、分区、标签和文件元数据。`,
    kind: "submission",
    link: "/upload",
    targetId: item.id,
    targetKind: "submission",
    title: "投稿已进入待审核"
  })

	return item
}

export function reviewMockCommunitySubmission(params: ReviewCommunitySubmissionRequest & {
  submissionId: string
}): CommunitySubmissionItem | null {
  const nextStatus = params.status
  const reviewNote = (params.reviewNote || "").trim().slice(0, 720)
  let publishedVideoId = (params.publishedVideoId || "").trim().slice(0, 96)

  if (!["approved", "rejected", "published"].includes(nextStatus)) {
    return null
  }
  if (nextStatus === "rejected" && !reviewNote) {
    return null
  }

  for (const clientId of Object.keys(mockCommunitySubmissions)) {
    const submissions = mockCommunitySubmissions[clientId] || []
    const index = submissions.findIndex((item) => item.id === params.submissionId)

    if (index < 0) {
      continue
    }
    const current = submissions[index]
    if (!current) {
      continue
    }

    if (nextStatus === "published" && current.status !== "approved" && current.status !== "published") {
      return null
    }
    if (nextStatus === "published" && !publishedVideoId) {
      const generated = createMockVideoFromSubmission(current, params)

      if (!generated) {
        return null
      }
      publishedVideoId = generated.id
    }
    const now = new Date().toISOString()
    const reviewed: CommunitySubmissionItem = {
      ...current,
      publishedAt: nextStatus === "published" ? now : null,
      mediaAssetId: nextStatus === "published" ? normalizeMockMediaAssetId(params.mediaAssetId) || current.mediaAssetId : current.mediaAssetId,
      publishedVideoId: nextStatus === "published" ? publishedVideoId : "",
      reviewedAt: now,
      reviewerId: "mock-reviewer",
      reviewNote,
      status: nextStatus,
      updatedAt: now
    }

    submissions[index] = reviewed
    pushMockCommunityNotification(clientId, {
      body: mockSubmissionReviewNotificationBody(reviewed),
      kind: "submission",
      link: reviewed.publishedVideoId ? `/video/${reviewed.publishedVideoId}` : "/upload",
      targetId: reviewed.id,
      targetKind: "submission",
      title: mockSubmissionReviewNotificationTitle(reviewed)
    })

    return reviewed
  }

  return null
}

function createMockVideoFromSubmission(item: CommunitySubmissionItem, params: ReviewCommunitySubmissionRequest): VideoSummary | null {
  const mediaAssetId = normalizeMockMediaAssetId(params.mediaAssetId) || normalizeMockMediaAssetId(item.mediaAssetId)
  const sourceUrl = (params.sourceUrl || "").trim() || (mediaAssetId ? `/api/v1/system/media/assets/${encodeURIComponent(mediaAssetId)}/download` : "")
  const durationSeconds = Math.floor(params.durationSeconds || 0)

  if (!sourceUrl || durationSeconds <= 0) {
    return null
  }
  const id = mockSubmissionVideoId(item.id)
  const slug = mockSubmissionVideoSlug(item, params.slug)
  const user: UserSummary = {
    id: `creator-${mockShortHash(item.clientId || item.authorName)}`,
    handle: `u-${mockSafeSlug(item.clientId || item.authorName).slice(0, 42)}-${mockShortHash(item.clientId)}`,
    displayName: item.authorName,
    avatarUrl: null
  }
  const video: VideoSummary = {
    id,
    slug,
    title: item.title,
    description: item.description || null,
    thumbnailUrl: (params.thumbnailUrl || "").trim() || `gradient:${slug}`,
    durationSeconds,
    viewCount: 0,
    commentCount: 0,
    publishedAt: new Date().toISOString(),
    uploader: user,
    categories: [category(item.categorySlug)]
  }

  const existing = mockVideos.findIndex((current) => current.id === id)
  if (existing >= 0) {
    mockVideos[existing] = video
  } else {
    mockVideos.unshift(video)
  }
  mockVideoLikes[id] = 0
  mockVideoSourceUrls[id] = sourceUrl
  return video
}

function normalizeMockMediaAssetId(value?: string) {
  const normalized = (value || "").trim()
  return /^\d+$/.test(normalized) && normalized !== "0" ? normalized : ""
}

function mockSubmissionReviewNotificationTitle(item: CommunitySubmissionItem) {
  if (item.status === "approved") {
    return "投稿审核通过"
  }
  if (item.status === "rejected") {
    return "投稿审核未通过"
  }
  if (item.status === "published") {
    return "投稿已发布"
  }
  return "投稿审核状态已更新"
}

function mockSubmissionReviewNotificationBody(item: CommunitySubmissionItem) {
  if (item.status === "approved") {
    return `《${item.title}》已通过审核，等待后续媒体发布处理。`
  }
  if (item.status === "rejected") {
    return `《${item.title}》未通过审核。${item.reviewNote ? `原因：${item.reviewNote}` : ""}`
  }
  if (item.status === "published") {
    return `《${item.title}》已关联公开视频 ${item.publishedVideoId || ""}。`
  }
  return `《${item.title}》的审核状态已更新为 ${item.status}。`
}

export function getMockCommunityNotifications(clientId: string, limit?: number): CommunityNotificationPayload | null {
	const normalizedClientId = normalizeMockClientId(clientId)

  if (!normalizedClientId) {
    return null
  }

  const items = [...(mockCommunityNotifications[normalizedClientId] || [])]
    .sort((left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt))
  const visibleItems = items.slice(0, Math.min(Math.max(limit || 48, 1), 100))
  const unreadCount = items.filter((item) => !item.readAt).length

  return {
    authenticated: false,
    clientId: normalizedClientId,
    items: {
      items: visibleItems,
      nextCursor: null
    },
    message: "通知来自本地演示数据；真实模式会同步社区通知流。",
    unreadCount
  }
}

export function markMockCommunityNotificationsRead(clientId: string): CommunityNotificationPayload | null {
  const normalizedClientId = normalizeMockClientId(clientId)

  if (!normalizedClientId) {
    return null
  }

  const now = new Date().toISOString()
  mockCommunityNotifications[normalizedClientId] = (mockCommunityNotifications[normalizedClientId] || []).map((item) => ({
    ...item,
    readAt: item.readAt || now
  }))

  return getMockCommunityNotifications(normalizedClientId)
}

function pushMockCommunityNotification(clientId: string, input: {
  body: string
  creatorId?: string
  kind: CommunityNotificationItem["kind"]
  link: string
  targetId: string
  targetKind: CommunityNotificationItem["targetKind"]
  title: string
  videoId?: string
}) {
  const normalizedClientId = normalizeMockClientId(clientId)

  if (!normalizedClientId) {
    return
  }

  const now = new Date().toISOString()
  const item: CommunityNotificationItem = {
    body: input.body,
    createdAt: now,
    creatorId: input.creatorId || "",
    id: `notification-${normalizedClientId}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    kind: input.kind,
    link: input.link,
    readAt: null,
    targetId: input.targetId,
    targetKind: input.targetKind,
    title: input.title,
    videoId: input.videoId || ""
  }
  mockCommunityNotifications[normalizedClientId] = [
    item,
    ...(mockCommunityNotifications[normalizedClientId] || [])
  ]
}

function mockInteractionNotificationTitle(kind: VideoInteractionKind) {
  if (kind === "like") {
    return "已点赞视频"
  }
  if (kind === "favorite") {
    return "已加入收藏"
  }
  return "已加入稍后看"
}

function mockInteractionNotificationBody(kind: VideoInteractionKind, title: string) {
  if (kind === "like") {
    return `你点赞了《${title}》，创作者会在热度统计中看到这次互动。`
  }
  if (kind === "favorite") {
    return `《${title}》已经保存到收藏列表。`
  }
  return `《${title}》已经保存到稍后看列表。`
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

function getMockVideo(idOrSlug: string) {
  return mockVideos.find((item) => item.id === idOrSlug || item.slug === idOrSlug) || null
}

function getMockVideoLikeCount(video: VideoSummary) {
  return mockVideoLikes[video.id] ?? Math.max(24, Math.round(video.viewCount / 12))
}

function normalizeMockDanmakuMode(value: unknown): VideoDanmakuMode {
  return value === "top" || value === "bottom" || value === "scroll" ? value : "scroll"
}

function normalizeMockDanmakuColor(value: string | undefined) {
  return /^#[\da-f]{6}$/i.test(value || "") ? value! : "#ffffff"
}

function normalizeMockDanmakuTime(value: unknown, durationSeconds: number) {
  const next = Number(value)
  const maxSecond = Math.max(0, durationSeconds - 1)

  if (!Number.isFinite(next)) {
    return 0
  }

  return Math.min(maxSecond, Math.max(0, Math.round(next)))
}

function normalizeMockVideoReportReason(value: unknown): VideoReportReason | null {
  return value === "spam"
    || value === "abuse"
    || value === "copyright"
    || value === "misleading"
    || value === "other"
    ? value
    : null
}

function normalizeMockHistoryProgress(value: unknown, durationSeconds: number) {
  const next = Number(value)
  const maxSecond = Math.max(0, durationSeconds)

  if (!Number.isFinite(next)) {
    return 0
  }

  return Math.min(maxSecond, Math.max(0, Math.round(next)))
}

function normalizeMockSubmissionVisibility(value: unknown) {
  return value === "public" || value === "unlisted" || value === "private" ? value : null
}

function normalizeMockSubmissionTags(tags: string[]) {
  const seen = new Set<string>()

  return tags
    .map((tag) => tag.trim().replace(/^#/, "").slice(0, 40))
    .filter(Boolean)
    .filter((tag) => {
      const key = tag.toLowerCase()

      if (seen.has(key)) {
        return false
      }

      seen.add(key)
      return true
    })
    .slice(0, 8)
}

function mockSubmissionVideoId(submissionId: string) {
  const raw = mockSafeSlug(submissionId.replace(/^submission-/, ""))

  return `video-${raw || mockShortHash(submissionId)}`
}

function mockSubmissionVideoSlug(item: CommunitySubmissionItem, value?: string) {
  const base = mockSafeSlug(value || item.title) || "submission"

  return `${base.slice(0, 48)}-${mockShortHash(item.id)}`
}

function mockSafeSlug(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

function mockShortHash(value: string) {
  let hash = 2166136261

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }

  return (hash >>> 0).toString(36)
}

function isMockVideoInteractionKind(value: string): value is VideoInteractionKind {
  return value === "like" || value === "favorite" || value === "watch_later"
}

function mockVideosForInteractionKind(clientId: string, kind: VideoInteractionKind) {
  const interactions = mockVideoInteractions[clientId] || {}

  return Object.entries(interactions)
    .filter(([, kinds]) => Boolean(kinds[kind]))
    .sort((left, right) => Date.parse(right[1][kind] || "") - Date.parse(left[1][kind] || ""))
    .map(([videoId]) => mockVideos.find((video) => video.id === videoId))
    .filter((video): video is VideoSummary => Boolean(video))
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

function normalizeMockClientId(value: string) {
  const normalized = value.trim()

  return normalized && normalized.length <= 96 ? normalized : ""
}

function withMockCommunityDynamicOwnership(item: CommunityDynamicItem, clientId: string): CommunityDynamicItem {
  const ownerClientId = mockCommunityDynamicOwners[item.id] || ""

  return {
    ...item,
    ownedByCurrentClient: ownerClientId !== "" && ownerClientId === clientId
  }
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
