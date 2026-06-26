<script setup lang="ts">
import {
  getMockVideoDanmaku,
  getMockVideoDetail,
  listMockCreators,
  mockAnnouncement,
  mockCategories,
  mockCategoryTree,
  mockVideos
} from "~~/shared/mocks/home"
import { flattenCategoryTree } from "~~/shared/utils/categories"
import type {
  Announcement,
  Category,
  CategoryTreeNode,
  CreatorProfile,
  HomePayload,
  VideoCommentPayload,
  VideoDanmakuItem,
  VideoDanmakuPayload,
  VideoDetail,
  VideoSummary
} from "~/types/api"
import type { CommentView } from "~/types/comments"
import type { AoiDanmakuItem, AoiDanmakuMapper, AoiDanmakuMode } from "~/types/danmaku"
import type { AoiLightboxItem } from "~/types/lightbox"
import type { PlayerPlaybackRate } from "~/types/player"
import type { AoiRichTextChangePayload, AoiRichTextDocument } from "~/types/rich-text"
import type { UploadDraft, UploadDraftSource } from "~/types/upload"
import type { AoiRgbaColor } from "~/utils/aoiColor"
import { getAoiSettingsProfileField } from "~/lib/aoiSettingsProfiles"
import type { AoiSettingsProfileDiffItem } from "~/lib/aoiSettingsProfiles"

interface DemoStatus {
  message: string
  intent: "danger" | "info" | "success" | "warning"
}

interface DemoAccordionItem {
  body: string
  id: string
  title: string
}

const api = useAoiApi()
const { t } = useI18n()
const settings = useAppSettingsStore()

const fallbackVideoDetail = getMockVideoDetail(mockVideos[0]?.slug || "aoi-alpha")
const fallbackVideoDanmakuPayload = getMockVideoDanmaku(mockVideos[0]?.slug || "aoi-alpha")
const fallbackCreators = listMockCreators(3)
const fallbackComments: CommentView[] = [
  {
    authorName: "Aoi Viewer",
    body: "按钮、菜单、弹窗和输入状态都在同一页看到，回归时很顺手。",
    createdAt: "2026-06-09T03:00:00.000Z",
    id: "comment-demo-1",
    status: "visible",
    updatedAt: "2026-06-09T03:00:00.000Z",
    videoId: "video-aoi-alpha"
  },
  {
    authorName: "Color Note",
    body: "长滚动实验台保留了目标页的密度，但颜色仍然来自 Aoi。",
    createdAt: "2026-06-09T03:08:00.000Z",
    id: "comment-demo-2",
    status: "visible",
    updatedAt: "2026-06-09T03:08:00.000Z",
    videoId: "video-aoi-alpha"
  }
]
const emptyHomePayload: HomePayload = {
  announcement: null,
  categories: [],
  dynamics: {
    items: [],
    nextCursor: null
  },
  latest: {
    items: [],
    nextCursor: null
  }
}
const emptyCommentPayload: VideoCommentPayload = {
  items: [],
  nextCursor: null,
  sort: "newest",
  totalCount: 0,
  videoId: ""
}

const {
  data: homePreview,
  error: homePreviewError,
  pending: homePreviewPending
} = useAsyncData("settings-components-community-home", () => api.getHomePayload(), {
  default: () => emptyHomePayload
})

const demoPage = ref(1)
const viewMode = ref("list")
const densityMode = ref("balanced")
const selectedChoice = ref("a")
const selectedTheme = ref("system")
const selectedPalette = ref("sunflower")
const selectedTab = ref("all")
const secondaryTab = ref("video")
const selectedCategory = ref("home")
const selectValue = ref("obtuse")
const outlinedSelectValue = ref("straight")
const basicText = ref("小小的、软软的、香香的")
const normalText = ref("Aoi components")
const searchText = ref("组件、播放器、上传")
const messageText = ref("发送消息到消息框")
const commentAuthorName = ref("Demo User")
const commentSubmitRevision = ref(0)
const switchOn = ref(false)
const disabledSwitch = ref(false)
const checkedSwitch = ref(true)
const checkAll = ref(false)
const checkedCute = ref(true)
const checkedUseful = ref(true)
const checkedAnime = ref(false)
const checkedOpen = ref(true)
const progressEnabled = ref(true)
const progressIndeterminate = ref(true)
const sliderSize = ref(38)
const sliderWeight = ref(10)
const sliderHeight = ref(18)
const sliderProgress = ref(42)
const volumeValue = ref(100)
const pitchValue = ref(55)
const capsuleValue = ref(100)
const compactValue = ref(72)
const colorValue = ref<AoiRgbaColor>({ r: 255, g: 125, b: 82, a: 1 })
const colorInputValue = ref("#ff7d52")
const menuOpen = ref(false)
const dialogOpen = ref(false)
const diffDialogOpen = ref(false)
const lightboxOpen = ref(false)
const lightboxIndex = ref(0)
const routeProgressPreview = ref(false)
const status = ref<DemoStatus>({
  message: "组件实验台已就绪。",
  intent: "success"
})
const commentSortMode = ref<"newest" | "oldest">("newest")
const richTextMarkdown = ref([
  "# Aoi 组件实验台",
  "",
  "这里集中展示按钮、表单、弹层、播放器、弹幕和业务组件。",
  "",
  "- 保持 Aoi token",
  "- 业务样本优先读取社区数据",
  "- 复杂组件延迟渲染"
].join("\n"))
const richTextDocument = ref<AoiRichTextDocument | null>(null)
const richTextPayload = ref<AoiRichTextChangePayload | null>(null)
const richTextPreviewTab = ref("markdown")
const accordionOpen = ref<Record<string, boolean>>({
  first: true,
  popover: false,
  player: false
})
const danmakuEnabled = ref(true)
const danmakuPanelOpen = ref(true)
const playerMuted = ref(true)
const playerVolume = ref(0.35)
const playerRate = ref<PlayerPlaybackRate>(1)
const playerTheater = ref(false)
const toolbarPlaying = ref(false)
const toolbarMuted = ref(false)
const toolbarVolume = ref(68)
const toolbarRate = ref<PlayerPlaybackRate>(1)
const toolbarTheater = ref(false)
const toolbarFullscreen = ref(false)
const demoCurrentTime = ref(36)

const menuAnchorId = "aoi-components-menu-anchor"
const localPreviewComments = ref<CommentView[]>([])
const uploadDrafts = ref<UploadDraft[]>([
  {
    allowComments: true,
    categorySlug: "design",
    createdAt: "2026-06-09T02:00:00.000Z",
    description: "用于验证上传草稿列表、投递区域和预览卡片。",
    id: "draft-components",
    sensitive: false,
    source: {
      name: "component-demo.mp4",
      selectedAt: "2026-06-09T02:02:00.000Z",
      size: 24_600_000,
      type: "video/mp4"
    },
    status: "draft",
    tags: ["components", "aoi", "demo"],
    title: "组件实验台录屏",
    updatedAt: "2026-06-09T02:12:00.000Z",
    visibility: "public"
  },
  {
    allowComments: false,
    categorySlug: "tech",
    createdAt: "2026-06-08T02:00:00.000Z",
    description: "",
    id: "draft-empty",
    sensitive: false,
    source: null,
    status: "draft",
    tags: ["review"],
    title: "",
    updatedAt: "2026-06-08T02:12:00.000Z",
    visibility: "unlisted"
  }
])
const activeDraftId = ref(uploadDrafts.value[0]?.id || "")

const pagerItems = [1, 2, 3, 4, 5, 6, 99]
const viewItems = [
  { value: "list", label: "列表", icon: "list" },
  { value: "grid", label: "网格", icon: "grid-3x3" },
  { value: "tile", label: "磁贴", icon: "layout-grid" }
]
const densityItems = [
  { value: "soft", label: "Soft", description: "更轻的状态层", icon: "feather" },
  { value: "balanced", label: "Balanced", description: "当前 Aoi 节奏", icon: "blocks" },
  { value: "vivid", label: "Vivid", description: "更强的反馈", icon: "sparkles" }
]
const tabItems = [
  { value: "all", label: "全部", icon: "sparkles" },
  { value: "video", label: "视频", icon: "play" },
  { value: "image", label: "图片", icon: "image" },
  { value: "badge", label: "长标签角标", icon: "badge" },
  { value: "short", label: "短", icon: "dot" }
]
const selectOptions = [
  { value: "obtuse", label: "钝角" },
  { value: "straight", label: "直角" },
  { value: "sharp", label: "锐角" },
  { value: "disabled", label: "禁用选项", disabled: true }
]
const menuItems = [
  { value: "copy", label: "复制组件名", icon: "copy" },
  { value: "inspect", label: "标记为已检查", icon: "badge-check" },
  { value: "disabled", label: "禁用项", icon: "ban", disabled: true }
]
const statusIntentOptions = [
  { value: "info", label: "信息" },
  { value: "success", label: "成功" },
  { value: "warning", label: "警告" },
  { value: "danger", label: "危险" }
] as const
const actionVariants = [
  { value: "filled", label: "Filled" },
  { value: "tonal", label: "Tonal" },
  { value: "outlined", label: "Outlined" },
  { value: "plain", label: "Plain" },
  { value: "elevated", label: "Elevated" }
] as const
const actionTones = [
  { value: "accent", label: "主" },
  { value: "muted", label: "弱" },
  { value: "neutral", label: "中" },
  { value: "success", label: "成" },
  { value: "warning", label: "警" },
  { value: "danger", label: "险" },
  { value: "info", label: "信" }
] as const
const lightboxItems = computed<AoiLightboxItem[]>(() => [
  {
    alt: "Aoi sunflower gradient",
    description: "使用渐变图像验证 inline gallery、弹层和缩略图。",
    id: "sunflower",
    src: "gradient:aoi-components-sunflower",
    thumbnailSrc: "gradient:aoi-components-sunflower-thumb",
    title: "Sunflower frame",
    type: "image"
  },
  {
    alt: "Aoi sakura gradient",
    description: "轻粉色辅助调用于强调，不替换 Aoi 主色。",
    id: "sakura",
    src: "gradient:aoi-components-sakura",
    thumbnailSrc: "gradient:aoi-components-sakura-thumb",
    title: "Sakura accent",
    type: "image"
  },
  {
    alt: "Aoi sample video",
    description: "示例视频用于验证 lightbox 视频 controls。",
    id: "video",
    posterSrc: videoDetail.value?.thumbnailUrl || "gradient:aoi-components-video",
    src: videoDetail.value?.sourceUrl || "",
    thumbnailSrc: "gradient:aoi-components-video-thumb",
    title: "Video lightbox",
    type: "video"
  }
])
const accordionItems: DemoAccordionItem[] = [
  { body: "紧凑标题、细分割线和轻阴影来自目标组件页的实验感。", id: "first", title: "第 1 个" },
  { body: "菜单、浮窗、对话框统一走 Aoi layer，避免 z-index 互相竞争。", id: "popover", title: "浮窗测试" },
  { body: "播放器和富文本只在客户端/lazy 环境里加载，减少 SSR 压力。", id: "player", title: "播放器测试" }
]
const richTextPreviewTabs = [
  { value: "markdown", label: "Markdown", icon: "file-text" },
  { value: "text", label: "纯文本", icon: "pilcrow" },
  { value: "json", label: "JSON", icon: "braces" }
]
const profileDiffs: AoiSettingsProfileDiffItem[] = [
  {
    before: "kirakira pink",
    changed: true,
    after: "var(--aoi-accent-60)",
    field: getAoiSettingsProfileField("accentPreset")!
  },
  {
    before: "standard settings",
    changed: true,
    after: "compact lab",
    field: getAoiSettingsProfileField("appearanceDensity")!
  }
]
const derivationControls = [
  {
    description: "控制 demo 中状态层和选中态的强度。",
    key: "state",
    label: "状态层",
    title: "状态反馈",
    value: 62
  },
  {
    description: "控制组件行距、分区间距和移动端压缩程度。",
    key: "spacing",
    label: "间距",
    title: "紧凑节奏",
    value: 44
  }
]
const sampleCategoryTree = computed<CategoryTreeNode[]>(() => (
  homePreview.value.categories.length ? homePreview.value.categories : mockCategoryTree
))
const sampleCategories = computed<Category[]>(() => flattenCategoryTree(sampleCategoryTree.value).map(({ children: _children, depth: _depth, path: _path, ...category }) => category))
const sampleAnnouncement = computed<Announcement | null>(() => homePreview.value.announcement || mockAnnouncement)
const sampleVideos = computed<VideoSummary[]>(() => (
  homePreview.value.latest.items.length ? homePreview.value.latest.items : mockVideos
).slice(0, 6))
const selectedVideo = computed<VideoSummary | undefined>(() => sampleVideos.value[0])
const selectedVideoSlug = computed(() => selectedVideo.value?.slug || selectedVideo.value?.id || mockVideos[0]?.slug || "aoi-alpha")
const {
  data: videoDetailPreview,
  error: videoDetailPreviewError
} = useAsyncData("settings-components-community-video-detail", () => api.getVideoDetail(selectedVideoSlug.value), {
  default: () => fallbackVideoDetail,
  watch: [selectedVideoSlug]
})
const {
  data: videoDanmakuPreview,
  error: videoDanmakuPreviewError
} = useAsyncData("settings-components-community-video-danmaku", () => api.getVideoDanmaku(selectedVideoSlug.value), {
  default: () => fallbackVideoDanmakuPayload,
  watch: [selectedVideoSlug]
})
const {
  data: videoCommentPreview,
  error: videoCommentPreviewError
} = useAsyncData("settings-components-community-video-comments", () => api.getVideoComments(selectedVideoSlug.value, { limit: 8, sort: "newest" }), {
  default: () => emptyCommentPayload,
  watch: [selectedVideoSlug]
})
const selectedCreatorHandle = computed(() => selectedVideo.value?.uploader.handle || fallbackCreators[0]?.handle || "")
const {
  data: creatorPreview,
  error: creatorPreviewError
} = useAsyncData("settings-components-community-creator", async () => {
  if (!selectedCreatorHandle.value) {
    return null
  }

  return await api.getCreatorProfile(selectedCreatorHandle.value)
}, {
  default: () => null,
  watch: [selectedCreatorHandle]
})
const videoDetail = computed<VideoDetail | null>(() => videoDetailPreview.value || fallbackVideoDetail)
const videoDanmakuPayload = computed<VideoDanmakuPayload | null>(() => videoDanmakuPreview.value || fallbackVideoDanmakuPayload)
const creators = computed<CreatorProfile[]>(() => creatorPreview.value ? [creatorPreview.value] : fallbackCreators)
const comments = computed<CommentView[]>(() => {
  const remoteComments = videoCommentPreview.value.items.length ? videoCommentPreview.value.items : fallbackComments

  return [
    ...localPreviewComments.value,
    ...remoteComments
  ]
})
const businessPreviewError = computed(() => homePreviewError.value || videoDetailPreviewError.value || videoDanmakuPreviewError.value || videoCommentPreviewError.value || creatorPreviewError.value)
const businessPreviewSource = computed(() => {
  if (homePreviewPending.value) {
    return "同步中"
  }

  return businessPreviewError.value ? "本地预览样本" : "社区数据"
})
const statItems = computed(() => [
  { icon: "blocks", label: "组件", value: "70+" },
  { icon: "panel-left", label: "分区", value: 8 },
  { icon: "mouse-pointer-click", label: "交互", value: 24 },
  { icon: "sparkles", label: "业务样本", value: businessPreviewSource.value }
])
const tagItems = [
  { icon: "hash", label: "components", to: "/search?q=components" },
  { icon: "sun", label: "aoi-token", value: "token" },
  { icon: "blocks", label: "developer", value: "developer" }
]
const danmakuItems = computed<AoiDanmakuItem[]>(() => {
  const items = videoDanmakuPayload.value?.items || []

  return items.map((item) => ({
    authorName: item.authorName,
    body: item.body,
    color: item.color,
    createdAt: item.createdAt,
    id: item.id,
    mode: item.mode,
    timeSeconds: item.timeSeconds
  }))
})
const danmakuMapper: AoiDanmakuMapper<VideoDanmakuItem> = (item) => ({
  authorName: item.authorName,
  body: item.body,
  color: item.color,
  createdAt: item.createdAt,
  id: item.id,
  mode: item.mode,
  timeSeconds: item.timeSeconds
})
const richTextPlainText = computed(() => richTextPayload.value?.text || "")
const richTextDocumentPreview = computed(() => JSON.stringify(richTextDocument.value || {}, null, 2))
const activeDraft = computed(() => uploadDrafts.value.find((draft) => draft.id === activeDraftId.value) || uploadDrafts.value[0])
const activeDraftSource = computed<UploadDraftSource | null>(() => activeDraft.value?.source || null)
const videoSources = computed(() => videoDetail.value?.sources || [])
const componentChecklist = [
  "AoiActionBar",
  "AoiButton",
  "AoiCheckbox",
  "AoiChip",
  "AoiChoiceCard",
  "AoiCodeBlock",
  "AoiColorInput",
  "AoiColorPalette",
  "AoiContentGrid",
  "AoiDanmakuComposer",
  "AoiDanmakuLayer",
  "AoiDanmakuPanel",
  "AoiDanmakuVideoPlayer",
  "AoiDialog",
  "AoiFileInput",
  "AoiIcon",
  "AoiIconButton",
  "AoiInfoCard",
  "AoiLazyImage",
  "AoiLazyMount",
  "AoiLightboxGallery",
  "AoiLink",
  "AoiMediaOverlayButton",
  "AoiMenu",
  "AoiMetaPill",
  "AoiPlayerContextMenu",
  "AoiProgress",
  "AoiProgressBar",
  "AoiReveal",
  "AoiRichTextEditor",
  "AoiScrollArea",
  "AoiScrollScene",
  "AoiScrollSnapItem",
  "AoiSection",
  "AoiSegmentedControl",
  "AoiSelect",
  "AoiSkeleton",
  "AoiSkeletonGroup",
  "AoiSkeletonText",
  "AoiSlider",
  "AoiStatGrid",
  "AoiStatusMessage",
  "AoiSurface",
  "AoiSwitch",
  "AoiTabs",
  "AoiTagList",
  "AoiTextField",
  "AoiVideoControls",
  "AoiVideoPlayer",
  "AoiVideoQueueList",
  "AoiVideoTimeline",
  "AoiVideoToolbar",
  "AoiWatchLayout",
  "AoiRouteProgress",
  "AppRail",
  "MobileHeader",
  "BottomNav",
  "PageHeader",
  "PageState",
  "AuthShell",
  "AuthPanel",
  "AuthMotionVisual",
  "AnnouncementStrip",
  "BrandBand",
  "CategoryTabs",
  "CategoryCard",
  "CreatorCard",
  "VideoCard",
  "VideoGrid",
  "VideoGridSkeleton",
  "VideoCardSkeleton",
  "VideoMeta",
  "VideoWatchDetails",
  "HistoryEntryCard",
  "CommentComposer",
  "CommentItem",
  "CommentThread",
  "UploadDropZone",
  "UploadDraftList",
  "UploadReviewCard",
  "SettingsShellNav",
  "SettingsPageHeader",
  "SettingsPanel",
  "SettingsRow",
  "SettingsOptionGrid",
  "SettingsDataActionCard",
  "SettingsDerivationControlGrid",
  "SettingsFieldSelector",
  "SettingsJsonPreview",
  "SettingsProfileList",
  "SettingsProfileDiffDialog"
]

watch(() => [settings.hydrated, settings.developerModeEnabled] as const, ([hydrated, enabled]) => {
  if (hydrated && !enabled) {
    navigateTo("/settings/appearance", { replace: true })
  }
}, { immediate: true })

useHead(() => ({
  title: `${t("settings.components.title")} - Aoi`
}))

function showStatus(message: string, intent: DemoStatus["intent"] = "success") {
  status.value = { message, intent }
}

function onMenuSelect(value: string) {
  showStatus(value === "inspect" ? "组件已标记为已检查。" : "组件名已复制到实验状态栏。")
}

function updateRichTextPayload(payload: AoiRichTextChangePayload) {
  richTextPayload.value = payload
}

function addComment(body: string) {
  const trimmedBody = body.trim()

  if (!trimmedBody) {
    showStatus("请输入评论内容。", "warning")
    return
  }

  const now = new Date().toISOString()

  localPreviewComments.value = [
    {
      authorName: commentAuthorName.value.trim() || "Demo User",
      body: trimmedBody,
      createdAt: now,
      id: `comment-${Date.now().toString(36)}`,
      status: "visible",
      updatedAt: now,
      videoId: videoDetail.value?.id || selectedVideo.value?.id || "video-aoi-alpha"
    },
    ...localPreviewComments.value
  ]
  commentSubmitRevision.value += 1
  showStatus("评论组件已收到一条本地示例。")
}

function handleUploadMetadata(files: File[]) {
  if (!files.length) {
    return
  }

  const file = files[0]!
  const now = new Date().toISOString()
  const draft: UploadDraft = {
    allowComments: true,
    categorySlug: "design",
    createdAt: now,
    description: "UploadDropZone 只记录文件元数据，不持久化文件字节。",
    id: `draft-${Date.now().toString(36)}`,
    sensitive: false,
    source: {
      name: file.name,
      selectedAt: now,
      size: file.size,
      type: file.type || "application/octet-stream"
    },
    status: "draft",
    tags: ["local", "metadata"],
    title: file.name.replace(/\.[^.]+$/, "") || "本地文件",
    updatedAt: now,
    visibility: "private"
  }

  uploadDrafts.value = [draft, ...uploadDrafts.value]
  activeDraftId.value = draft.id
  showStatus("已记录文件元数据，未保存文件字节。")
}

function formatBytes(size: number) {
  if (!Number.isFinite(size) || size <= 0) {
    return "0 B"
  }

  const units = ["B", "KB", "MB", "GB"]
  let value = size
  let unitIndex = 0

  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024
    unitIndex += 1
  }

  return `${value >= 10 || unitIndex === 0 ? value.toFixed(0) : value.toFixed(1)} ${units[unitIndex]}`
}

function toggleAccordion(id: string) {
  accordionOpen.value = {
    ...accordionOpen.value,
    [id]: !accordionOpen.value[id]
  }
}

function sendDanmaku(payload: { body: string, color: string, mode: AoiDanmakuMode }) {
  showStatus(`弹幕已发送：${payload.body} (${payload.mode}, ${payload.color})`)
}
</script>

<template>
  <PageState
    v-if="!settings.hydrated"
    icon="loader-circle"
    :title="t('settings.components.loadingTitle')"
    :description="t('settings.components.loadingDescription')"
  />

  <PageState
    v-else-if="!settings.developerModeEnabled"
    icon="lock-keyhole"
    :title="t('settings.developer.locked.title')"
    :description="t('settings.developer.locked.description')"
    action-icon="palette"
    :action-label="t('settings.developer.locked.action')"
    @action="navigateTo('/settings/appearance')"
  />

  <div v-else class="components-lab">
    <header class="components-lab__hero">
      <div>
        <p class="components-lab__eyebrow">{{ t("settings.components.eyebrow") }}</p>
        <h1>{{ t("settings.components.title") }}</h1>
        <p>{{ t("settings.components.description") }}</p>
      </div>
      <AoiStatGrid :items="statItems" :columns="4" />
    </header>

    <section class="components-lab__strip" aria-label="组件实验台入口">
      <div class="components-lab__pager" role="group" aria-label="Demo pager">
        <button
          v-for="page in pagerItems"
          :key="page"
          class="components-lab__page-button"
          :class="{ 'components-lab__page-button--active': page === demoPage }"
          type="button"
          @click="demoPage = page"
        >
          {{ page }}
        </button>
      </div>

      <AoiSegmentedControl
        v-model="viewMode"
        class="components-lab__segmented"
        :items="viewItems"
        aria-label="视图模式"
        :columns="3"
      />

      <AoiActionBar class="components-lab__actions" label="主要组件动作" size="sm" surface>
        <AoiButton tone="accent" variant="filled" icon="sparkles" @click="showStatus('主要按钮已触发。')">主要按钮</AoiButton>
        <AoiButton variant="filled" icon="triangle-alert" tone="warning" @click="showStatus('警告按钮已触发。', 'warning')">警告按钮</AoiButton>
        <AoiButton variant="filled" icon="circle-alert" tone="danger" @click="showStatus('危险按钮已触发。', 'danger')">危险按钮</AoiButton>
        <AoiButton tone="accent" variant="filled" disabled>主要按钮被禁用</AoiButton>
        <AoiButton tone="accent" variant="filled" icon="party-popper" @click="showStatus('五彩纸屑已替换为 Aoi 状态反馈。')">五彩纸屑</AoiButton>
        <AoiButton tone="accent" variant="filled" icon="send" @click="showStatus('发送按钮已触发。')">发送</AoiButton>
        <AoiButton tone="accent" variant="outlined" @click="dialogOpen = true">显示模态框</AoiButton>
        <AoiButton tone="accent" id="aoi-components-menu-anchor" variant="outlined" @click="menuOpen = !menuOpen">显示菜单</AoiButton>
        <AoiButton tone="accent" variant="outlined" @click="routeProgressPreview = !routeProgressPreview">显示进度条</AoiButton>
      </AoiActionBar>

      <div class="components-lab__action-matrix" aria-label="按钮变体与色调矩阵">
        <div
          v-for="variant in actionVariants"
          :key="variant.value"
          class="components-lab__action-row"
        >
          <span class="components-lab__matrix-label">{{ variant.label }}</span>
          <AoiButton
            v-for="tone in actionTones"
            :key="`${variant.value}-${tone.value}`"
            :variant="variant.value"
            :tone="tone.value"
            size="sm"
            @click="showStatus(`${variant.label} / ${tone.label}`)"
          >
            {{ tone.label }}
          </AoiButton>
        </div>
        <div class="components-lab__icon-row" aria-label="图标按钮变体与色调矩阵">
          <AoiIconButton
            v-for="tone in actionTones"
            :key="`icon-${tone.value}`"
            icon="sparkle"
            :label="`图标按钮 ${tone.label}`"
            variant="plain"
            :tone="tone.value"
            size="sm"
          />
          <AoiIconButton
            v-for="tone in actionTones"
            :key="`icon-tonal-${tone.value}`"
            icon="sparkles"
            :label="`填充图标按钮 ${tone.label}`"
            variant="tonal"
            :tone="tone.value"
            size="sm"
          />
        </div>
      </div>

      <AoiStatusMessage :intent="status.intent" :message="status.message" />
      <span v-if="routeProgressPreview" class="components-lab__route-progress-preview" aria-hidden="true" />
      <AoiMenu v-model:open="menuOpen" :anchor="menuAnchorId" :items="menuItems" @select="onMenuSelect" />
    </section>

    <div class="components-lab__divider">
      <AoiIcon name="sliders-horizontal" :size="18" decorative />
      <h2>Controls</h2>
    </div>
    <section class="components-lab__section">
      <div class="components-lab__control-grid">
        <div class="components-lab__stack">
          <AoiSwitch v-model="switchOn" label="切换开关" />
          <AoiSwitch v-model="disabledSwitch" label="禁用 关" disabled />
          <AoiSwitch v-model="checkedSwitch" label="禁用 开" disabled />
          <div class="components-lab__radio-list" role="radiogroup" aria-label="主题选择">
            <label><input v-model="selectedTheme" type="radio" value="light"> 浅色主题</label>
            <label><input v-model="selectedTheme" type="radio" value="dark"> 深色主题</label>
            <label><input v-model="selectedTheme" type="radio" value="system"> 跟随系统</label>
          </div>
        </div>

        <div class="components-lab__stack">
          <AoiCheckbox v-model="checkAll" label="全选" />
          <AoiCheckbox v-model="checkedCute" label="可爱" />
          <AoiCheckbox v-model="checkedUseful" label="好用" />
          <AoiCheckbox v-model="checkedAnime" label="二次元" />
          <AoiCheckbox v-model="checkedOpen" label="欢迎白嫖" disabled />
        </div>

        <AoiSegmentedControl
          v-model="densityMode"
          :items="densityItems"
          aria-label="密度模式"
          :columns="3"
        />

        <SettingsOptionGrid>
          <AoiChoiceCard
            value="a"
            title="a"
            description="带预览的选项"
            :selected="selectedChoice === 'a'"
            @select="selectedChoice = $event"
          >
            <template #preview>
              <span class="components-lab__choice-preview components-lab__choice-preview--a" />
            </template>
          </AoiChoiceCard>
          <AoiChoiceCard
            value="b"
            title="b"
            description="紧凑卡片状态"
            variant="compact"
            :selected="selectedChoice === 'b'"
            @select="selectedChoice = $event"
          />
        </SettingsOptionGrid>
      </div>
    </section>

    <div class="components-lab__divider">
      <AoiIcon name="text-cursor-input" :size="18" decorative />
      <h2>Forms</h2>
    </div>
    <section class="components-lab__section">
      <div class="components-lab__form-grid">
        <AoiTextField v-model="basicText" label="Filled text" />
        <AoiTextField v-model="normalText" label="Outlined with icon" icon="smile" appearance="outlined" />
        <AoiTextField v-model="searchText" label="Error field" icon="badge-check" error-text="示例错误提示" appearance="outlined" />
        <AoiTextField v-model="messageText" label="Message" icon="message-square-text" multiline :rows="3" />
        <AoiSelect v-model="selectValue" label="Filled select" :options="selectOptions" />
        <AoiSelect v-model="outlinedSelectValue" label="Outlined select" appearance="outlined" :options="selectOptions" />
      </div>
      <p class="components-lab__note">所有输入框使用独立状态；选择器菜单通过 Aoi layer 管理。</p>
    </section>

    <div class="components-lab__divider">
      <AoiIcon name="activity" :size="18" decorative />
      <h2>State, Loading And Tags</h2>
    </div>
    <section class="components-lab__section">
      <div class="components-lab__progress-panel">
        <AoiSwitch v-model="progressEnabled" label="开启加载" />
        <AoiSlider v-model="sliderSize" label="大小" :min="0" :max="100" />
        <AoiSlider v-model="sliderWeight" label="粗细" :min="0" :max="40" />
        <AoiSlider v-model="sliderHeight" label="高度" :min="0" :max="40" />
        <AoiSwitch v-model="progressIndeterminate" label="不定状态" />
        <AoiSlider v-model="sliderProgress" label="进度" :min="0" :max="100" />
        <div class="components-lab__inline">
          <AoiButton tone="accent" variant="filled" loading>加载中的按钮</AoiButton>
          <AoiButton tone="accent" variant="filled" loading disabled>加载中的禁用按钮</AoiButton>
          <AoiProgress type="circular" indeterminate />
        </div>
        <AoiProgress :indeterminate="progressIndeterminate" :value="sliderProgress / 100" />
        <AoiProgressBar :value="sliderProgress" label="页面内进度条" size="md" />
      </div>

      <div class="components-lab__inline">
        <AoiChip label="标签" selected />
        <AoiChip label="输入标签名称" removable remove-label="移除输入标签" @remove="showStatus('标签移除事件已触发。')" />
        <AoiMetaPill icon="clock-3">你知道的</AoiMetaPill>
        <AoiMetaPill tone="accent">太多了</AoiMetaPill>
        <AoiMetaPill tone="danger">错误</AoiMetaPill>
      </div>

      <div class="components-lab__slider-stack">
        <AoiSlider v-model="volumeValue" label="音量" />
        <AoiSlider v-model="pitchValue" label="音调" />
        <div class="components-lab__capsule-slider">
          <span>{{ capsuleValue }}</span>
          <AoiSlider v-model="capsuleValue" aria-label="Capsule slider" />
        </div>
        <AoiSlider v-model="compactValue" label="紧凑 slider" compact />
      </div>

      <AoiTabs v-model="selectedTab" :items="tabItems" aria-label="组件 tab bar" />
      <AoiTabs v-model="secondaryTab" :items="tabItems" aria-label="第二个组件 tab bar" />
    </section>

    <div class="components-lab__divider">
      <AoiIcon name="palette" :size="18" decorative />
      <h2>Color, Popup And Page Only Pieces</h2>
    </div>
    <section class="components-lab__section components-lab__section--split">
      <AoiColorPalette
        v-model="colorValue"
        label="调色板"
        :reset-value="{ r: 255, g: 125, b: 82, a: 1 }"
      />
      <div class="components-lab__stack">
        <AoiColorInput v-model="colorInputValue" label="主题色输入" />
        <div class="components-lab__radio-list" role="radiogroup" aria-label="调色板选择">
          <label><input v-model="selectedPalette" type="radio" value="sunflower"> 向日葵</label>
          <label><input v-model="selectedPalette" type="radio" value="sky"> palette.sky</label>
          <label><input v-model="selectedPalette" type="radio" value="orange"> palette.orange</label>
          <label><input v-model="selectedPalette" type="radio" value="custom"> 自定义</label>
        </div>
        <div class="components-lab__datetime">
          <span>00</span><span>:</span><span>00</span><span>:</span><span>00</span>
        </div>
        <div class="components-lab__datetime">
          <span>公历</span><span>·</span><span>2026</span><span>/</span><span>06</span><span>/</span><span>09</span><span>·</span><span>周二</span>
        </div>
      </div>
    </section>

    <section class="components-lab__cropper" aria-label="裁剪器视觉复刻">
      <div class="components-lab__cropper-image">
        <span class="components-lab__cropper-grid" />
        <span class="components-lab__cropper-handle components-lab__cropper-handle--tl" />
        <span class="components-lab__cropper-handle components-lab__cropper-handle--tr" />
        <span class="components-lab__cropper-handle components-lab__cropper-handle--br" />
        <span class="components-lab__cropper-handle components-lab__cropper-handle--bl" />
      </div>
    </section>

    <div class="components-lab__divider">
      <AoiIcon name="layout-template" :size="18" decorative />
      <h2>Surfaces And Layout</h2>
    </div>
    <section class="components-lab__section">
      <PageHeader title="组件页面标题" description="PageHeader、AoiSurface、AoiSection、AoiContentGrid 和状态组件的组合。" icon="blocks">
        <template #actions>
          <AoiButton tone="accent" variant="outlined" size="sm" icon="external-link" to="/settings">设置入口</AoiButton>
        </template>
      </PageHeader>

      <AoiSection title="内容网格" description="AoiContentGrid + AoiReveal + AoiInfoCard" icon="grid-3x3" :count="4">
        <AoiContentGrid min-width="220px" gap="compact" :mobile-columns="1">
          <AoiReveal v-for="(video, index) in sampleVideos.slice(0, 4)" :key="video.id" :index="index" variant="rise">
            <AoiInfoCard :to="`/video/${video.slug}`" :title="video.title" :subtitle="video.uploader.displayName" layout="stack">
              <template #media>
                <AoiLazyImage class="components-lab__info-media" :src="video.thumbnailUrl" alt="" />
              </template>
              <template #meta>
                <AoiMetaPill icon="play">{{ video.viewCount }}</AoiMetaPill>
                <AoiMetaPill icon="message-square-text">{{ video.commentCount }}</AoiMetaPill>
              </template>
            </AoiInfoCard>
          </AoiReveal>
        </AoiContentGrid>
      </AoiSection>

      <div class="components-lab__surface-grid">
        <AoiSurface surface="panel" padding="lg">Panel surface</AoiSurface>
        <AoiSurface surface="card" tone="accent">Accent card</AoiSurface>
        <AoiSurface surface="state" tone="danger">Danger state</AoiSurface>
        <AoiSurface surface="code" padding="sm"><AoiCodeBlock code="const aoi = 'components'" /></AoiSurface>
      </div>

      <PageState icon="message-circle" title="暂无评论" description="PageState 复刻目标页空状态的居中感。" />
      <AoiSkeletonGroup>
        <AoiSkeleton shape="block" height="84px" />
        <AoiSkeletonText :lines="3" />
      </AoiSkeletonGroup>
    </section>

    <div class="components-lab__divider">
      <AoiIcon name="panel-left" :size="18" decorative />
      <h2>Navigation Frames</h2>
    </div>
    <section class="components-lab__section">
      <div class="components-lab__nav-frame">
        <AppRail />
        <MobileHeader />
        <div class="components-lab__nav-canvas">
          <BrandBand />
          <AnnouncementStrip :announcement="sampleAnnouncement" />
          <CategoryTabs v-model="selectedCategory" :categories="sampleCategoryTree" />
        </div>
        <BottomNav />
      </div>
      <p class="components-lab__note">固定导航在 demo frame 内被覆盖成 absolute，不会遮挡真实页面。</p>
    </section>

    <div class="components-lab__divider">
      <AoiIcon name="clapperboard" :size="18" decorative />
      <h2>Content Components</h2>
    </div>
    <section class="components-lab__section">
      <VideoGrid :videos="sampleVideos" />
      <VideoGridSkeleton :count="4" />
      <div class="components-lab__content-grid">
        <VideoCard v-if="selectedVideo" :video="selectedVideo" :index="0" />
        <VideoCardSkeleton />
        <CategoryCard v-if="sampleCategories[1]" :category="sampleCategories[1]" />
        <CreatorCard v-if="creators[0]" :creator="creators[0]" />
        <HistoryEntryCard
          v-if="selectedVideo"
          :entry="{ video: selectedVideo, lastViewedAt: '2026-06-09T02:00:00.000Z', progressSeconds: 72 }"
          viewed-label="今天"
          progress-label="72%"
          progress-aria-label="观看进度"
          :progress-percent="72"
          :index="0"
        />
      </div>

      <VideoWatchDetails title="视频详情容器" description="VideoWatchDetails + VideoMeta + AoiTagList">
        <template #meta>
          <VideoMeta v-if="selectedVideo" :video="selectedVideo" link-uploader />
        </template>
        <AoiTagList :items="tagItems" />
      </VideoWatchDetails>
    </section>

    <div class="components-lab__divider">
      <AoiIcon name="play-square" :size="18" decorative />
      <h2>Media And Editing</h2>
    </div>
    <section class="components-lab__section">
      <ClientOnly>
        <AoiLazyMount root-margin="200px 0px">
          <AoiWatchLayout>
            <template #primary>
              <AoiVideoPlayer
                v-if="videoDetail"
                :src="videoDetail.sourceUrl"
                :sources="videoSources"
                :title="videoDetail.title"
                :poster="videoDetail.thumbnailUrl"
                :duration-seconds="videoDetail.durationSeconds"
                :danmaku-items="videoDanmakuPayload?.items || []"
                :danmaku-mapper="danmakuMapper"
                v-model:danmaku-enabled="danmakuEnabled"
                v-model:danmaku-panel-open="danmakuPanelOpen"
                v-model:muted="playerMuted"
                v-model:volume="playerVolume"
                v-model:playback-rate="playerRate"
                v-model:theater-mode="playerTheater"
              />
            </template>
            <template #side>
              <AoiVideoQueueList :videos="sampleVideos" :current-video-id="videoDetail?.id" />
            </template>
            <template #below>
              <AoiDanmakuComposer
                :count="danmakuItems.length"
                :enabled="danmakuEnabled"
                @submit="sendDanmaku"
                @toggle-enabled="danmakuEnabled = !danmakuEnabled"
              />
            </template>
          </AoiWatchLayout>
        </AoiLazyMount>
      </ClientOnly>

      <div class="components-lab__media-demo">
        <div class="components-lab__danmaku-stage">
          <AoiDanmakuLayer :items="danmakuItems" :current-time="20" :duration-seconds="120" playing />
          <AoiMediaOverlayButton icon="play" label="播放覆盖按钮" @click="showStatus('媒体覆盖按钮已触发。')" />
        </div>
        <AoiDanmakuPanel :items="danmakuItems" :current-time="20" @seek="demoCurrentTime = $event" />
        <AoiVideoControls
          :current-time="demoCurrentTime"
          :duration="videoDetail?.durationSeconds || 300"
          :is-playing="toolbarPlaying"
          :muted="toolbarMuted"
          :volume-percent="toolbarVolume"
          :playback-rate="toolbarRate"
          :theater-mode="toolbarTheater"
          :fullscreen="toolbarFullscreen"
          @seek="demoCurrentTime = $event"
          @toggle-play="toolbarPlaying = !toolbarPlaying"
          @toggle-muted="toolbarMuted = !toolbarMuted"
          @toggle-theater="toolbarTheater = !toolbarTheater"
          @toggle-fullscreen="toolbarFullscreen = !toolbarFullscreen"
          @update:volume-percent="toolbarVolume = $event"
          @update:playback-rate="toolbarRate = $event"
        />
      </div>

      <ClientOnly>
        <AoiLightboxGallery
          v-model:open="lightboxOpen"
          v-model:active-index="lightboxIndex"
          :items="lightboxItems"
          loop
        />
      </ClientOnly>
      <AoiButton tone="accent" variant="outlined" icon="images" @click="lightboxOpen = true">打开灯箱</AoiButton>

      <ClientOnly>
        <div class="components-lab__rich-text">
          <AoiRichTextEditor
            v-model="richTextMarkdown"
            v-model:document="richTextDocument"
            label="富文本编辑器"
            placeholder="写一段组件说明..."
            supporting-text="Markdown 与 Tiptap JSON 同步预览。"
            :max-length="1800"
            @change="updateRichTextPayload"
          />
          <div class="components-lab__rich-preview">
            <AoiTabs v-model="richTextPreviewTab" :items="richTextPreviewTabs" aria-label="富文本输出格式" />
            <AoiCodeBlock v-if="richTextPreviewTab === 'markdown'" :code="richTextMarkdown" />
            <AoiCodeBlock v-else-if="richTextPreviewTab === 'text'" :code="richTextPlainText" />
            <AoiCodeBlock v-else :code="richTextDocumentPreview" />
          </div>
        </div>
      </ClientOnly>
    </section>

    <div class="components-lab__divider">
      <AoiIcon name="file-video" :size="18" decorative />
      <h2>Business Forms</h2>
    </div>
    <section class="components-lab__section">
      <div class="components-lab__business-grid">
        <UploadDropZone
          :source="activeDraftSource"
          choose-label="选择视频"
          empty-title="拖放或选择视频"
          empty-description="演示只记录文件名、大小和类型。"
          replace-label="替换文件"
          :format-bytes="formatBytes"
          @change="handleUploadMetadata"
        />
        <UploadDraftList :drafts="uploadDrafts" :active-id="activeDraftId" @select="activeDraftId = $event" />
        <UploadReviewCard
          category-name="设计"
          :title="activeDraft?.title"
          :description="activeDraft?.description"
          status-label="草稿"
          :visibility="activeDraft?.visibility || 'public'"
          :validation="{ ready: true, missing: [], warnings: ['本 demo 只记录文件元数据。'] }"
        />
      </div>

      <CommentComposer
        v-model:author-name="commentAuthorName"
        :disabled="false"
        :submit-revision="commentSubmitRevision"
        @submit="addComment"
      />
      <CommentThread
        :comments="comments"
        hydrated
        v-model:sort-mode="commentSortMode"
      />
    </section>

    <div class="components-lab__divider">
      <AoiIcon name="settings-2" :size="18" decorative />
      <h2>Auth And Settings Components</h2>
    </div>
    <section class="components-lab__section">
      <AuthShell labelledby="components-auth-title" visual-position="end">
        <template #visual>
          <AuthMotionVisual title="Demo" metric="70+ components" />
        </template>
        <AuthPanel
          title-id="components-auth-title"
          title="开发者登录面板"
          description="AuthPanel、AuthShell 和 AuthMotionVisual 的组合。"
          submit-label="提交演示"
          submit-icon="log-in"
          success-message="这是本地演示状态。"
          @submit="showStatus('AuthPanel submit 已触发。')"
        >
          <template #fields>
            <AoiTextField label="用户名" icon="user" appearance="outlined" />
            <AoiTextField label="密码" icon="lock" type="password" appearance="outlined" />
          </template>
          <template #switch>
            <span>还没有账号？</span>
            <AoiLink to="/register">去注册</AoiLink>
          </template>
        </AuthPanel>
      </AuthShell>

      <SettingsPageHeader title="设置组件标题" description="SettingsPageHeader、SettingsPanel、SettingsRow 与配置型组件示例。" />
      <SettingsPanel icon="sliders-horizontal" title="设置面板" description="设置页组件也在此集中回归。">
        <SettingsRow title="设置行" description="SettingsRow + AoiSwitch">
          <AoiSwitch v-model="switchOn" />
        </SettingsRow>
        <SettingsOptionGrid>
          <AoiChoiceCard value="setting-a" title="设置 A" description="选项网格" selected />
          <AoiChoiceCard value="setting-b" title="设置 B" description="未选中" />
        </SettingsOptionGrid>
        <SettingsDataActionCard title="数据动作卡片" description="用于高级设置中的操作行。">
          <template #actions>
            <AoiButton tone="accent" variant="outlined" size="sm" icon="download">导出</AoiButton>
          </template>
        </SettingsDataActionCard>
        <SettingsDerivationControlGrid :controls="derivationControls" @update="(key, value) => showStatus(`${key} 已更新为 ${value}。`)" />
        <SettingsJsonPreview :code="JSON.stringify({ page: 'components', checked: true }, null, 2)" fallback="无 JSON" note="SettingsJsonPreview 示例。" />
        <SettingsProfileList
          :profiles="[{ id: 'demo', name: 'Demo profile', description: '组件页演示 profile', fields: [], settings: {}, scope: 'runtime', createdAt: '2026-06-09T00:00:00.000Z', updatedAt: '2026-06-09T00:00:00.000Z' }]"
          active-id="demo"
          label="Profile list"
        />
        <AoiButton tone="accent" variant="outlined" icon="git-compare-arrows" @click="diffDialogOpen = true">显示差异弹窗</AoiButton>
      </SettingsPanel>
    </section>

    <div class="components-lab__divider">
      <AoiIcon name="list-checks" :size="18" decorative />
      <h2>Accordion And Coverage</h2>
    </div>
    <section class="components-lab__section">
      <ul class="components-lab__accordion" aria-label="Accordion demo">
        <li v-for="item in accordionItems" :key="item.id">
          <button type="button" @click="toggleAccordion(item.id)">
            <AoiIcon :name="accordionOpen[item.id] ? 'chevron-down' : 'chevron-right'" :size="16" decorative />
            {{ item.title }}
          </button>
          <p v-if="accordionOpen[item.id]">{{ item.body }}</p>
        </li>
      </ul>

      <AoiContentGrid min-width="150px" gap="compact" :mobile-columns="2">
        <AoiChip
          v-for="name in componentChecklist"
          :key="name"
          :label="name"
          icon="check"
          selected
        />
      </AoiContentGrid>
    </section>

    <AoiDialog v-model:open="dialogOpen">
      <template #headline>
        组件模态框
      </template>
      <p>这个弹窗使用 AoiDialog，并通过 Material Web wrapper 管理。</p>
      <template #actions>
        <AoiButton @click="dialogOpen = false">取消</AoiButton>
        <AoiButton tone="accent" variant="filled" icon="check" @click="dialogOpen = false">确认</AoiButton>
      </template>
    </AoiDialog>

    <SettingsProfileDiffDialog
      v-model:open="diffDialogOpen"
      title="差异弹窗"
      description="SettingsProfileDiffDialog 示例。"
      :diffs="profileDiffs"
      confirm-label="确认"
      @confirm="diffDialogOpen = false"
    />
  </div>
</template>

<style scoped>
.components-lab {
  display: grid;
  gap: 18px;
  color: var(--aoi-text);
}

.components-lab__hero {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(280px, .72fr);
  gap: 16px;
  align-items: end;
  border-bottom: 1px solid var(--aoi-border);
  padding-bottom: 18px;
}

.components-lab__hero h1,
.components-lab__hero p,
.components-lab__eyebrow,
.components-lab__note {
  margin: 0;
}

.components-lab__hero h1 {
  color: var(--aoi-active-color);
  font-size: clamp(28px, 5vw, 54px);
  line-height: 1;
}

.components-lab__hero p {
  max-width: 720px;
  color: var(--aoi-text-muted);
  line-height: 1.75;
}

.components-lab__eyebrow {
  color: var(--aoi-active-color) !important;
  font-size: 12px;
  font-weight: 860;
  text-transform: uppercase;
}

.components-lab__strip,
.components-lab__section {
  display: grid;
  gap: 14px;
}

.components-lab__divider {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 8px;
  border-bottom: 1px solid var(--aoi-border);
  color: var(--aoi-active-color);
  padding: 7px 0 8px;
}

.components-lab__divider h2 {
  overflow: hidden;
  margin: 0;
  color: var(--aoi-text);
  font-size: 14px;
  font-weight: 860;
  letter-spacing: 0;
  line-height: 1.25;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.components-lab__strip {
  overflow: clip;
  border: 1px solid var(--aoi-border);
  border-radius: var(--aoi-radius-container);
  background:
    linear-gradient(90deg, color-mix(in srgb, var(--aoi-accent-10) 64%, transparent), transparent 42%),
    var(--aoi-surface-solid);
  box-shadow: var(--aoi-shadow-sm);
  padding: 18px;
}

.components-lab__pager,
.components-lab__actions,
.components-lab__inline {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
}

.components-lab__page-button {
  display: inline-grid;
  min-width: 36px;
  height: 36px;
  place-items: center;
  border: 0;
  border-radius: var(--aoi-radius-control);
  background: var(--aoi-surface-solid);
  box-shadow: var(--aoi-shadow-sm);
  color: var(--aoi-text-muted);
  cursor: pointer;
  font: inherit;
  font-weight: 820;
}

.components-lab__page-button--active {
  background: var(--aoi-accent-60);
  color: #fff;
}

.components-lab__segmented {
  width: min(360px, 100%);
}

.components-lab__segmented :deep(.aoi-segmented__item) {
  min-height: 36px;
  grid-auto-flow: column;
  justify-content: center;
  justify-items: center;
  padding: 7px 10px;
}

.components-lab__action-matrix {
  display: grid;
  gap: 9px;
  overflow-x: auto;
  border: 1px solid var(--aoi-border);
  border-radius: var(--aoi-radius-card);
  background: var(--aoi-surface);
  padding: 10px;
}

.components-lab__action-row,
.components-lab__icon-row {
  display: flex;
  min-width: max-content;
  align-items: center;
  gap: 8px;
}

.components-lab__matrix-label {
  width: 70px;
  flex: 0 0 auto;
  color: var(--aoi-text-muted);
  font-size: 12px;
  font-weight: 820;
}

.components-lab__icon-row {
  border-top: 1px solid var(--aoi-border);
  padding-top: 9px;
}

.components-lab__route-progress-preview {
  display: block;
  width: 100%;
  height: 4px;
  overflow: hidden;
  border-radius: var(--aoi-radius-round);
  background: var(--aoi-accent-10);
}

.components-lab__route-progress-preview::before {
  display: block;
  width: 58%;
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, var(--aoi-accent-60), var(--aoi-sakura-50), var(--aoi-sun-50));
  content: "";
  animation: components-lab-route-preview 1.2s var(--aoi-ease-out) infinite alternate;
}

.components-lab__control-grid,
.components-lab__form-grid,
.components-lab__business-grid,
.components-lab__content-grid,
.components-lab__surface-grid,
.components-lab__media-demo {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 12px;
  align-items: start;
}

.components-lab__form-grid {
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
}

.components-lab__stack,
.components-lab__progress-panel,
.components-lab__slider-stack,
.components-lab__rich-preview {
  display: grid;
  gap: 10px;
}

.components-lab__radio-list {
  display: grid;
  gap: 8px;
  border-top: 1px solid var(--aoi-border);
  padding-top: 10px;
}

.components-lab__radio-list label {
  display: inline-flex;
  min-height: 30px;
  align-items: center;
  gap: 8px;
  color: var(--aoi-text);
}

.components-lab__radio-list input {
  width: 20px;
  height: 20px;
  accent-color: var(--aoi-accent-60);
}

.components-lab__choice-preview {
  display: block;
  height: 82px;
  border-radius: var(--aoi-radius-card);
  background:
    linear-gradient(135deg, rgba(255, 255, 255, .32), transparent),
    linear-gradient(135deg, var(--aoi-accent-40), var(--aoi-secondary-50));
}

.components-lab__choice-preview--a {
  background:
    radial-gradient(circle at 30% 30%, rgba(255, 255, 255, .72), transparent 30%),
    linear-gradient(135deg, var(--aoi-accent-40), var(--aoi-sakura-50));
}

.components-lab__note {
  color: var(--aoi-text-muted);
  font-size: 12px;
  line-height: 1.65;
}

.components-lab__capsule-slider {
  display: grid;
  width: min(420px, 100%);
  grid-template-columns: 88px minmax(0, 1fr);
  gap: 10px;
  align-items: center;
  border-radius: var(--aoi-radius-card);
  background: #101719;
  box-shadow: var(--aoi-shadow-sm);
  color: #fff;
  padding: 12px;
}

.components-lab__section {
  border-bottom: 1px solid var(--aoi-border);
  padding-bottom: 20px;
}

.components-lab__section--split {
  grid-template-columns: minmax(280px, 376px) minmax(0, 1fr);
  align-items: start;
}

.components-lab__datetime {
  display: inline-flex;
  width: fit-content;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
  border: 1px solid var(--aoi-border);
  border-radius: var(--aoi-radius-field);
  background: var(--aoi-surface-solid);
  box-shadow: var(--aoi-shadow-sm);
  color: var(--aoi-text-muted);
  font-weight: 760;
  padding: 10px 14px;
}

.components-lab__cropper {
  overflow: hidden;
  border: 1px solid var(--aoi-border);
  border-radius: var(--aoi-radius-card);
  background:
    linear-gradient(45deg, rgba(0, 0, 0, .06) 25%, transparent 25%),
    linear-gradient(-45deg, rgba(0, 0, 0, .06) 25%, transparent 25%),
    linear-gradient(45deg, transparent 75%, rgba(0, 0, 0, .06) 75%),
    linear-gradient(-45deg, transparent 75%, rgba(0, 0, 0, .06) 75%);
  background-position: 0 0, 0 8px, 8px -8px, -8px 0;
  background-size: 16px 16px;
  padding: 10px;
}

.components-lab__cropper-image {
  position: relative;
  min-height: 280px;
  overflow: hidden;
  border: 1px solid color-mix(in srgb, var(--aoi-accent-60) 42%, var(--aoi-border));
  background:
    linear-gradient(90deg, color-mix(in srgb, var(--aoi-accent-20) 82%, white), transparent 36%),
    linear-gradient(135deg, #ffe6bd, #fff6f1 45%, #c7eaff);
}

.components-lab__cropper-grid {
  position: absolute;
  inset: 0;
  background:
    linear-gradient(90deg, transparent calc(33.333% - 1px), color-mix(in srgb, var(--aoi-accent-60) 32%, transparent) 33.333%, transparent calc(33.333% + 1px)),
    linear-gradient(180deg, transparent calc(33.333% - 1px), color-mix(in srgb, var(--aoi-accent-60) 32%, transparent) 33.333%, transparent calc(33.333% + 1px));
}

.components-lab__cropper-handle {
  position: absolute;
  width: 14px;
  height: 14px;
  border: 3px solid #fff;
  border-radius: var(--aoi-radius-round);
  background: var(--aoi-accent-60);
  box-shadow: var(--aoi-shadow-sm);
}

.components-lab__cropper-handle--tl {
  top: -7px;
  left: -7px;
}

.components-lab__cropper-handle--tr {
  top: -7px;
  right: -7px;
}

.components-lab__cropper-handle--br {
  right: -7px;
  bottom: -7px;
}

.components-lab__cropper-handle--bl {
  bottom: -7px;
  left: -7px;
}

.components-lab__info-media {
  width: 100%;
  aspect-ratio: 16 / 9;
  overflow: hidden;
  border-radius: var(--aoi-radius-card);
}

.components-lab__nav-frame {
  position: relative;
  min-height: 420px;
  overflow: hidden;
  border: 1px solid var(--aoi-border);
  border-radius: var(--aoi-radius-container);
  background: var(--aoi-bg);
  box-shadow: var(--aoi-shadow-sm);
}

.components-lab__nav-frame :deep(.app-rail),
.components-lab__nav-frame :deep(.mobile-header),
.components-lab__nav-frame :deep(.bottom-nav) {
  position: absolute;
}

.components-lab__nav-frame :deep(.app-rail) {
  display: flex;
}

.components-lab__nav-frame :deep(.mobile-header),
.components-lab__nav-frame :deep(.bottom-nav) {
  display: flex;
}

.components-lab__nav-frame :deep(.bottom-nav) {
  display: grid;
}

.components-lab__nav-canvas {
  display: grid;
  gap: 12px;
  margin-left: var(--aoi-rail-width);
  padding: 64px 18px 72px;
}

.components-lab__nav-canvas :deep(.brand-band) {
  display: block;
  min-height: 120px;
  border-radius: var(--aoi-radius-card);
}

.components-lab__nav-canvas :deep(.brand-band__inner) {
  min-height: 120px;
  padding: 18px;
}

.components-lab__nav-canvas :deep(.brand-band__title) {
  font-size: 34px;
}

.components-lab__content-grid {
  grid-template-columns: repeat(auto-fit, minmax(210px, 1fr));
}

.components-lab__media-demo {
  grid-template-columns: minmax(280px, 1fr) minmax(280px, 420px);
}

.components-lab__media-demo > .aoi-video-controls {
  grid-column: 1 / -1;
}

.components-lab__danmaku-stage {
  position: relative;
  display: grid;
  min-height: 220px;
  overflow: hidden;
  border-radius: var(--aoi-radius-card);
  background:
    linear-gradient(180deg, rgba(0, 0, 0, .08), rgba(0, 0, 0, .68)),
    linear-gradient(135deg, var(--aoi-accent-20), var(--aoi-secondary-50));
  place-items: center;
}

.components-lab__rich-text {
  display: grid;
  gap: 12px;
}

.components-lab__business-grid {
  grid-template-columns: minmax(260px, 1fr) minmax(220px, .72fr) minmax(260px, .86fr);
}

.components-lab__accordion {
  display: grid;
  gap: 0;
  border: 1px solid var(--aoi-border);
  border-radius: var(--aoi-radius-card);
  background: var(--aoi-surface-solid);
  box-shadow: var(--aoi-shadow-sm);
  list-style: none;
  margin: 0;
  padding: 0;
}

.components-lab__accordion li + li {
  border-top: 1px solid var(--aoi-border);
}

.components-lab__accordion button {
  display: flex;
  width: 100%;
  min-height: 48px;
  align-items: center;
  gap: 8px;
  border: 0;
  background: transparent;
  color: var(--aoi-text);
  cursor: pointer;
  font: inherit;
  font-weight: 760;
  padding: 0 14px;
  text-align: left;
}

.components-lab__accordion p {
  margin: 0;
  color: var(--aoi-text-muted);
  line-height: 1.7;
  padding: 0 14px 14px 38px;
}

@keyframes components-lab-route-preview {
  from {
    transform: translate3d(-18%, 0, 0);
  }

  to {
    transform: translate3d(68%, 0, 0);
  }
}

@media (max-width: 900px) {
  .components-lab__hero,
  .components-lab__section--split,
  .components-lab__business-grid,
  .components-lab__media-demo {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 639px) {
  .components-lab {
    gap: 14px;
  }

  .components-lab__strip {
    padding: 12px;
  }

  .components-lab__page-button {
    min-width: 34px;
    height: 34px;
  }

  .components-lab__nav-canvas {
    margin-left: 0;
    padding: 66px 12px 74px;
  }

  .components-lab__nav-frame :deep(.app-rail) {
    display: none;
  }

  .components-lab__capsule-slider {
    grid-template-columns: 1fr;
  }
}

@media (prefers-reduced-motion: reduce) {
  .components-lab__route-progress-preview::before {
    animation: none;
  }
}
</style>
