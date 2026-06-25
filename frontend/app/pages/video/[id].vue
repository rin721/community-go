<script setup lang="ts">
import type { CommentSortMode } from "~/types/comments"
import type { AoiDanmakuMapper, AoiDanmakuMode } from "~/types/danmaku"
import type { PlayerPlaybackRate } from "~/types/player"
import type { VideoDanmakuItem } from "~/types/api"

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
const selectedSourceId = ref("")

const { data: watchPayload, error, pending, refresh } = useAsyncData(() => `video-watch-${id.value}`, async () => {
  const video = await api.getVideoDetail(id.value)
  const [creator, danmakuPayload] = await Promise.all([
    api.getCreatorProfile(video.uploader.handle).catch(() => null),
    api.getVideoDanmaku(video.id).catch(() => ({
      items: [],
      nextCursor: null,
      totalCount: 0,
      videoId: video.id
    }))
  ])

  return {
    creator,
    danmakuItems: danmakuPayload.items,
    video
  }
}, {
  watch: [id]
})

const video = computed(() => watchPayload.value?.video || null)
const creator = computed(() => watchPayload.value?.creator || null)
const mockDanmakuItems = computed(() => watchPayload.value?.danmakuItems || [])
const mergedDanmakuItems = computed(() => {
  if (!video.value) {
    return mockDanmakuItems.value
  }

  return [
    ...mockDanmakuItems.value,
    ...danmaku.danmakuForVideo(video.value.id)
  ].sort((a, b) => a.timeSeconds - b.timeSeconds)
})
const isFavorite = computed(() => video.value ? library.isFavorite(video.value.id) : false)
const isLiked = computed(() => video.value ? library.isLiked(video.value.id) : false)
const isWatchLater = computed(() => video.value ? library.isWatchLater(video.value.id) : false)
const localLikeCount = computed(() => video.value ? video.value.likeCount + (isLiked.value ? 1 : 0) : 0)
const localCommentCount = computed(() => video.value ? comments.commentCountForVideo(video.value.id) : 0)
const displayCommentCount = computed(() => video.value ? video.value.commentCount + localCommentCount.value : 0)
const displayDanmakuCount = computed(() => mergedDanmakuItems.value.length)
const visibleComments = computed(() => video.value ? comments.commentsForVideo(video.value.id, commentSortMode.value) : [])
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

function submitDanmaku(payload: {
  body: string
  color: string
  mode: AoiDanmakuMode
  timeSeconds: number
}) {
  if (video.value) {
    danmaku.submitDanmaku(video.value.id, payload, comments.authorName)
  }
}

function submitComment(body: string) {
  if (video.value) {
    comments.submitComment(video.value.id, body)
  }
}

function editComment(commentId: string, body: string) {
  if (video.value) {
    comments.editComment(video.value.id, commentId, body)
  }
}

function deleteComment(commentId: string) {
  if (video.value) {
    comments.deleteComment(video.value.id, commentId)
  }
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
            :disabled="!library.hydrated"
            @click="library.toggleLiked(video.id)"
          >
            {{ localLikeCount }}
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
            :comments-label="t('player.localComments')"
          >
            <template #meta>
              <VideoMeta :video="video" link-uploader />
            </template>

            <template #actions>
              <AoiButton tone="accent"
                :variant="isFavorite ? 'tonal' : 'outlined'"
                icon="star"
                :aria-label="isFavorite ? t('player.unfavorite') : t('player.favorite')"
                :disabled="!library.hydrated"
                @click="library.toggleFavorite(video)"
              >
                {{ isFavorite ? t("player.favorited") : t("player.favorite") }}
              </AoiButton>
              <AoiButton tone="accent"
                :variant="isWatchLater ? 'tonal' : 'outlined'"
                icon="clock-3"
                :aria-label="isWatchLater ? t('player.removeWatchLater') : t('player.watchLater')"
                :disabled="!library.hydrated"
                @click="library.toggleWatchLater(video)"
              >
                {{ isWatchLater ? t("player.watchLaterAdded") : t("player.watchLater") }}
              </AoiButton>
              <AoiButton tone="accent" variant="outlined" icon="flag">
                {{ t("player.report") }}
              </AoiButton>
            </template>

            <template #comments>
              <CommentComposer
                v-model:author-name="commentAuthorName"
                :disabled="!comments.hydrated"
                @submit="submitComment"
              />
              <CommentThread
                v-model:sort-mode="commentSortMode"
                :comments="visibleComments"
                :hydrated="comments.hydrated"
                @delete="deleteComment"
                @edit="editComment"
              />
            </template>
          </VideoWatchDetails>
        </template>
      </AoiWatchLayout>
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
