<script setup lang="ts">
import type { CommentSortMode, CommentView } from "~/types/comments"
import type { AoiDanmakuMapper, AoiDanmakuMode } from "~/types/danmaku"
import type { PlayerPlaybackRate } from "~/types/player"
import type { CreateVideoDanmakuRequest, CreateVideoReportRequest, VideoComment, VideoDanmakuItem, VideoReportReason } from "~/types/api"

const route = useRoute()
const api = useAoiApi()
const settings = useAppSettingsStore()
const playerSettings = usePlayerSettingsStore()
const library = useLibraryStore()
const comments = useCommentsStore()
const danmaku = useDanmakuStore()
const { t } = useI18n()
const id = computed(() => String(route.params.id || ""))
const commentSortMode = ref<CommentSortMode>("newest")
const localDanmakuEnabled = ref(true)
const commentSubmitError = ref("")
const commentSubmitRevision = ref(0)
const commentSubmitting = ref(false)
const reportDetail = ref("")
const reportDialogOpen = ref(false)
const reportReceiptId = ref("")
const reportReason = ref<VideoReportReason>("spam")
const reportSubmitError = ref("")
const reportSubmitting = ref(false)
const selectedSourceId = ref("")

const { data: watchPayload, error, pending, refresh } = useAsyncData(() => `video-watch-${id.value}`, async () => {
  const video = await api.getVideoDetail(id.value)
  const [creator, danmakuPayload, commentPayload] = await Promise.all([
    api.getCreatorProfile(video.uploader.handle).catch(() => null),
    api.getVideoDanmaku(video.id).catch(() => ({
      items: [],
      nextCursor: null,
      totalCount: 0,
      videoId: video.id
    })),
    api.getVideoComments(video.id, { limit: 48, sort: commentSortMode.value }).catch(() => ({
      items: [],
      nextCursor: null,
      sort: commentSortMode.value,
      totalCount: video.commentCount,
      videoId: video.id
    }))
  ])

  return {
    commentPayload,
    creator,
    danmakuItems: danmakuPayload.items,
    video
  }
}, {
  watch: [id]
})

const video = computed(() => watchPayload.value?.video || null)
const creator = computed(() => watchPayload.value?.creator || null)
const serverCommentPayload = computed(() => watchPayload.value?.commentPayload || null)
const serverDanmakuItems = computed(() => watchPayload.value?.danmakuItems || [])
const mergedDanmakuItems = computed(() => {
  if (!video.value) {
    return serverDanmakuItems.value
  }

  return [
    ...serverDanmakuItems.value,
    ...danmaku.danmakuForVideo(video.value.id)
  ].sort((a, b) => a.timeSeconds - b.timeSeconds)
})
const isFavorite = computed(() => video.value ? library.isFavorite(video.value.id) : false)
const isLiked = computed(() => video.value ? library.isLiked(video.value.id) : false)
const isWatchLater = computed(() => video.value ? library.isWatchLater(video.value.id) : false)
const interactionPending = computed(() => video.value ? library.isPending(video.value.id) : false)
const displayLikeCount = computed(() => video.value ? library.likeCountFor(video.value) : 0)
const displayCommentCount = computed(() => serverCommentPayload.value?.totalCount || video.value?.commentCount || 0)
const displayDanmakuCount = computed(() => mergedDanmakuItems.value.length)
const serverCommentViews = computed<CommentView[]>(() => (serverCommentPayload.value?.items || []).map(toCommunityCommentView))
const visibleComments = computed(() => sortCommentViews(serverCommentViews.value, commentSortMode.value))
const commentThreadDescription = computed(() => t("player.communityCommentDescription", {
  count: visibleComments.value.length,
  total: displayCommentCount.value
}))
const reportReasonModel = computed({
  get: () => reportReason.value,
  set: (value: string) => {
    if (isVideoReportReason(value)) {
      reportReason.value = value
    }
  }
})
const reportReasonOptions = computed(() => [
  { label: t("player.reportReasonSpam"), value: "spam" },
  { label: t("player.reportReasonAbuse"), value: "abuse" },
  { label: t("player.reportReasonCopyright"), value: "copyright" },
  { label: t("player.reportReasonMisleading"), value: "misleading" },
  { label: t("player.reportReasonOther"), value: "other" }
])
const reportCanSubmit = computed(() => {
  return Boolean(video.value && library.hydrated && !reportSubmitting.value && !reportReceiptId.value)
})
const initialProgressSeconds = computed(() => {
  if (!video.value || settings.disableWatchHistory) {
    return 0
  }

  return library.historyProgressForVideo(video.value.id)
})
const commentAuthorName = computed({
  get: () => comments.authorName,
  set: (value: string) => comments.setAuthorName(value)
})
const primaryQueue = computed(() => video.value?.related.slice(0, 1) || [])
const relatedQueue = computed(() => video.value?.related.slice(1) || [])
const videoTags = computed(() => video.value?.tags.map((tag) => ({
  label: tag,
  to: `/search?q=${encodeURIComponent(tag)}`,
  value: tag
})) || [])
const danmakuMapper: AoiDanmakuMapper<VideoDanmakuItem> = (item) => ({
  id: item.id,
  body: item.body,
  timeSeconds: item.timeSeconds,
  mode: item.mode,
  color: item.color,
  authorName: item.authorName,
  createdAt: item.createdAt
})

watch([video, () => library.hydrated], ([current, hydrated]) => {
  if (import.meta.client && hydrated && current && !settings.disableWatchHistory) {
    library.recordView(current)
  }
  if (import.meta.client && hydrated && current) {
    library.syncVideoInteractions(current)
  }
}, { immediate: true })

watch(video, () => {
  selectedSourceId.value = ""
  localDanmakuEnabled.value = true
}, { immediate: true })

function setPlayerPlaybackRate(value: number) {
  playerSettings.setPlaybackRate(value as PlayerPlaybackRate)
}

function onPlayerProgress(seconds: number) {
  if (video.value && library.hydrated && !settings.disableWatchHistory) {
    library.updateHistoryProgress(video.value.id, seconds)
  }
}

function onPlayerEnded() {
  if (video.value && library.hydrated && !settings.disableWatchHistory) {
    library.updateHistoryProgress(video.value.id, video.value.durationSeconds)
  }
}

async function submitDanmaku(payload: {
  body: string
  color: string
  mode: AoiDanmakuMode
  timeSeconds: number
}) {
  if (!video.value) {
    return
  }

  const request: CreateVideoDanmakuRequest = {
    authorName: comments.authorName,
    body: payload.body,
    color: payload.color,
    mode: payload.mode,
    timeSeconds: payload.timeSeconds
  }

  try {
    const item = await api.createVideoDanmaku(video.value.id, request)
    appendServerDanmaku(item)
  } catch {
    danmaku.submitDanmaku(video.value.id, payload, comments.authorName)
  }
}

async function submitComment(body: string) {
  if (!video.value || commentSubmitting.value) {
    return
  }

  commentSubmitting.value = true
  commentSubmitError.value = ""
  try {
    const comment = await api.createVideoComment(video.value.id, {
      authorName: comments.authorName,
      body
    })
    appendServerComment(comment)
    commentSubmitRevision.value += 1
  } catch {
    commentSubmitError.value = t("player.communityCommentSubmitError")
  } finally {
    commentSubmitting.value = false
  }
}

function openReportDialog() {
  reportDialogOpen.value = true
  reportDetail.value = ""
  reportReceiptId.value = ""
  reportReason.value = "spam"
  reportSubmitError.value = ""
}

async function submitReport() {
  if (!video.value || !reportCanSubmit.value) {
    return
  }

  const request: CreateVideoReportRequest = {
    clientId: library.ensureClientId(),
    detail: reportDetail.value,
    reason: reportReason.value
  }

  reportSubmitting.value = true
  reportSubmitError.value = ""
  try {
    const receipt = await api.createVideoReport(video.value.id, request)
    reportReceiptId.value = receipt.id
    reportDetail.value = ""
  } catch {
    reportSubmitError.value = t("player.reportSubmitError")
  } finally {
    reportSubmitting.value = false
  }
}

function isVideoReportReason(value: string): value is VideoReportReason {
  return value === "spam"
    || value === "abuse"
    || value === "copyright"
    || value === "misleading"
    || value === "other"
}

function appendServerComment(comment: VideoComment) {
  if (!watchPayload.value) {
    return
  }

  const payload = watchPayload.value.commentPayload
  const items = [comment, ...payload.items.filter((item) => item.id !== comment.id)]

  watchPayload.value = {
    ...watchPayload.value,
    commentPayload: {
      ...payload,
      items,
      totalCount: Math.max(payload.totalCount + 1, items.length)
    }
  }
}

function appendServerDanmaku(item: VideoDanmakuItem) {
  if (!watchPayload.value) {
    return
  }

  const items = [
    ...watchPayload.value.danmakuItems.filter((entry) => entry.id !== item.id),
    item
  ].sort((a, b) => a.timeSeconds - b.timeSeconds)

  watchPayload.value = {
    ...watchPayload.value,
    danmakuItems: items
  }
}

function toCommunityCommentView(comment: VideoComment): CommentView {
  return comment
}

function sortCommentViews(items: CommentView[], sort: CommentSortMode) {
  return [...items].sort((a, b) => {
    const aTime = new Date(a.createdAt).getTime()
    const bTime = new Date(b.createdAt).getTime()

    return sort === "oldest" ? aTime - bTime : bTime - aTime
  })
}

useHead(() => ({
  title: video.value ? `${video.value.title} - Aoi` : "Video - Aoi"
}))
</script>

<template>
  <div class="aoi-page video-watch-page">
    <PageState
      v-if="!pending && error"
      icon="video-off"
      :title="t('player.notFoundTitle')"
      :description="t('player.notFoundDescription', { id: route.params.id })"
      action-icon="home"
      :action-label="t('player.backHome')"
      @action="navigateTo('/')"
    />

    <article v-else-if="!pending && video" class="video-watch">
      <PageHeader
        class="video-watch__header"
        eyebrow="Video"
        :title="video.title"
        :description="video.description"
      >
        <template #actions>
          <AoiButton tone="accent"
            :variant="isLiked ? 'tonal' : 'outlined'"
            icon="heart"
            :aria-label="isLiked ? t('player.unlike') : t('player.like')"
            :disabled="!library.hydrated || interactionPending"
            :loading="interactionPending"
            @click="library.toggleLiked(video)"
          >
            {{ displayLikeCount }}
          </AoiButton>
          <AoiButton tone="accent" variant="outlined" icon="message-square-text">
            {{ displayDanmakuCount }}
          </AoiButton>
          <AoiButton tone="accent" variant="outlined" icon="message-circle">
            {{ displayCommentCount }}
          </AoiButton>
        </template>
      </PageHeader>

      <AoiWatchLayout>
        <template #primary>
          <AoiVideoPlayer
            :src="video.sourceUrl"
            :sources="video.sources"
            :title="video.title"
            :duration-seconds="video.durationSeconds"
            :initial-time-seconds="initialProgressSeconds"
            :selected-source-id="selectedSourceId"
            :muted="playerSettings.muted"
            :volume="playerSettings.volume"
            :playback-rate="playerSettings.playbackRate"
            :theater-mode="playerSettings.theaterMode"
            :danmaku-items="mergedDanmakuItems"
            :danmaku-mapper="danmakuMapper"
            :danmaku-enabled="localDanmakuEnabled"
            surface-mode="translucent"
            @ended="onPlayerEnded"
            @progress="onPlayerProgress"
            @send-danmaku="submitDanmaku"
            @update:danmaku-enabled="localDanmakuEnabled = $event"
            @update:muted="playerSettings.setMuted"
            @update:playback-rate="setPlayerPlaybackRate"
            @update:selected-source-id="selectedSourceId = $event"
            @update:theater-mode="playerSettings.setTheaterMode"
            @update:volume="playerSettings.setVolume"
          />
        </template>

        <template #side>
          <CreatorCard
            v-if="creator"
            :creator="creator"
            density="compact"
          />
          <AoiVideoQueueList
            v-if="primaryQueue.length && !settings.noRelatedVideos"
            :title="t('player.upNext')"
            :current-video-id="video.id"
            :videos="primaryQueue"
            compact
          />
          <AoiVideoQueueList
            v-if="relatedQueue.length && !settings.noRelatedVideos"
            :title="t('player.relatedVideos')"
            :current-video-id="video.id"
            :videos="relatedQueue"
            compact
          />
        </template>

        <template #below>
          <VideoWatchDetails
            :description="video.description"
            :description-title="t('player.descriptionTitle')"
            :tags="videoTags"
            :tags-label="t('player.tags')"
            :actions-label="t('player.localActions')"
            :comments-label="t('player.communityComments')"
          >
            <template #meta>
              <VideoMeta :video="video" link-uploader />
            </template>

            <template #actions>
              <AoiButton tone="accent"
                :variant="isFavorite ? 'tonal' : 'outlined'"
                icon="star"
                :aria-label="isFavorite ? t('player.unfavorite') : t('player.favorite')"
                :disabled="!library.hydrated || interactionPending"
                :loading="interactionPending"
                @click="library.toggleFavorite(video)"
              >
                {{ isFavorite ? t("player.favorited") : t("player.favorite") }}
              </AoiButton>
              <AoiButton tone="accent"
                :variant="isWatchLater ? 'tonal' : 'outlined'"
                icon="clock-3"
                :aria-label="isWatchLater ? t('player.removeWatchLater') : t('player.watchLater')"
                :disabled="!library.hydrated || interactionPending"
                :loading="interactionPending"
                @click="library.toggleWatchLater(video)"
              >
                {{ isWatchLater ? t("player.watchLaterAdded") : t("player.watchLater") }}
              </AoiButton>
              <AoiButton
                tone="accent"
                variant="outlined"
                icon="flag"
                :aria-label="t('player.report')"
                :disabled="!library.hydrated || reportSubmitting"
                :loading="reportSubmitting"
                @click="openReportDialog"
              >
                {{ t("player.report") }}
              </AoiButton>
            </template>

            <template #comments>
              <CommentComposer
                v-model:author-name="commentAuthorName"
                :disabled="!comments.hydrated || commentSubmitting"
                :error-text="commentSubmitError"
                :hint="t('player.communityCommentComposerHint')"
                :submit-revision="commentSubmitRevision"
                :submit-label="t('player.communityCommentSubmit')"
                :submitting="commentSubmitting"
                @submit="submitComment"
              />
              <CommentThread
                v-model:sort-mode="commentSortMode"
                :comments="visibleComments"
                :description="commentThreadDescription"
                :empty-description="t('player.communityCommentEmptyDescription')"
                :empty-title="t('player.communityCommentEmptyTitle')"
                :hydrated="Boolean(video)"
                :sort-label="t('player.communityCommentSort')"
                :title="t('player.communityComments')"
              />
            </template>
          </VideoWatchDetails>
        </template>
      </AoiWatchLayout>

      <AoiDialog
        :open="reportDialogOpen"
        :dismissible="!reportSubmitting"
        @update:open="reportDialogOpen = $event"
      >
        <template #headline>
          {{ t("player.reportDialogTitle") }}
        </template>

        <form class="video-watch__report-dialog" @submit.prevent="submitReport">
          <p class="video-watch__report-description">
            {{ t("player.reportDialogDescription") }}
          </p>
          <AoiStatusMessage
            v-if="reportSubmitError"
            intent="danger"
            :message="reportSubmitError"
          />
          <AoiStatusMessage
            v-if="reportReceiptId"
            intent="success"
          >
            <span class="video-watch__report-receipt">
              <span>{{ t("player.reportSubmitSuccess") }}</span>
              <code>{{ reportReceiptId }}</code>
            </span>
          </AoiStatusMessage>
          <AoiSelect
            v-model="reportReasonModel"
            appearance="outlined"
            :disabled="reportSubmitting || Boolean(reportReceiptId)"
            :label="t('player.reportReasonLabel')"
            :options="reportReasonOptions"
          />
          <AoiTextField
            v-model="reportDetail"
            appearance="outlined"
            class="video-watch__report-detail"
            :disabled="reportSubmitting || Boolean(reportReceiptId)"
            :label="t('player.reportDetailLabel')"
            :placeholder="t('player.reportDetailPlaceholder')"
            :max-length="500"
            multiline
            :rows="5"
          />
        </form>

        <template #actions>
          <AoiButton
            tone="accent"
            variant="plain"
            :disabled="reportSubmitting"
            @click="reportDialogOpen = false"
          >
            {{ reportReceiptId ? t("player.reportClose") : t("player.reportCancel") }}
          </AoiButton>
          <AoiButton
            v-if="!reportReceiptId"
            tone="accent"
            variant="filled"
            icon="flag"
            :disabled="!reportCanSubmit"
            :loading="reportSubmitting"
            @click="submitReport"
          >
            {{ t("player.reportSubmit") }}
          </AoiButton>
        </template>
      </AoiDialog>
    </article>

    <PageState
      v-else-if="!pending"
      icon="video"
      :title="t('player.loadInterruptedTitle')"
      :description="t('player.loadInterruptedDescription')"
      action-icon="refresh-cw"
      :action-label="t('player.retry')"
      @action="refresh()"
    />
  </div>
</template>

<style scoped>
.video-watch-page {
  position: relative;
}

.video-watch {
  display: grid;
  gap: 12px;
}

.video-watch :deep(.video-watch__header) {
  align-items: center;
  margin-bottom: 2px;
}

.video-watch :deep(.page-header__eyebrow) {
  margin-bottom: 2px;
  color: var(--aoi-active-color);
  font-size: 11px;
  letter-spacing: 0;
  text-transform: uppercase;
}

.video-watch :deep(.page-header__title) {
  color: var(--aoi-text);
  font-size: clamp(20px, 1.7vw, 26px);
  line-height: 1.24;
}

.video-watch :deep(.page-header__description) {
  max-width: 860px;
  margin-top: 4px;
  color: var(--aoi-text-muted);
  font-size: 13px;
  line-height: 1.55;
}

.video-watch :deep(.page-header__actions) {
  gap: 6px;
}

.video-watch :deep(.page-header__actions .aoi-button) {
  --md-outlined-button-outline-color: var(--aoi-border);
  --md-outlined-button-label-text-color: var(--aoi-text-muted);
  --md-outlined-button-icon-color: var(--aoi-text-muted);
  --md-outlined-button-hover-label-text-color: var(--aoi-active-color);
  --md-outlined-button-hover-icon-color: var(--aoi-active-color);
  --md-filled-tonal-button-container-color: var(--aoi-state-hover);
  --md-filled-tonal-button-label-text-color: var(--aoi-active-color);
  --md-filled-tonal-button-icon-color: var(--aoi-active-color);
}

.video-watch :deep(.aoi-watch-layout__side) {
  --aoi-player-accent: var(--aoi-active-color);
  --aoi-player-accent-soft: var(--aoi-state-hover);
  --aoi-player-border: var(--aoi-border);
  --aoi-player-surface: var(--aoi-surface);
  --aoi-player-surface-muted: var(--aoi-state-hover);
  --aoi-player-text: var(--aoi-text);
  --aoi-player-text-muted: var(--aoi-text-muted);

  position: sticky;
  top: var(--aoi-settings-sticky-top);
  max-height: calc(100vh - 24px);
  overflow: auto;
  padding-right: 2px;
  scrollbar-width: thin;
}

.video-watch__report-dialog {
  display: grid;
  width: min(520px, calc(100vw - 48px));
  gap: 12px;
}

.video-watch__report-description {
  margin: 0;
  color: var(--aoi-text-muted);
  font-size: 13px;
  line-height: 1.6;
  text-wrap: pretty;
}

.video-watch__report-detail {
  width: 100%;
}

.video-watch__report-receipt {
  display: grid;
  gap: 2px;
  min-width: 0;
}

.video-watch__report-receipt code {
  color: inherit;
  font-family: ui-monospace, SFMono-Regular, Consolas, "Liberation Mono", monospace;
  font-size: 12px;
  overflow-wrap: anywhere;
  word-break: break-word;
}

@media (max-width: 1100px) {
  .video-watch :deep(.aoi-watch-layout__side) {
    position: static;
    max-height: none;
    overflow: visible;
    padding-right: 0;
  }
}

@media (max-width: 639px) {
  .video-watch {
    gap: 8px;
  }

  .video-watch :deep(.video-watch__header) {
    align-items: flex-start;
  }
}
</style>
