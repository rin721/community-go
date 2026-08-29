<script setup lang="ts">
import type { VideoSummary } from "~/types/api"

const props = withDefaults(defineProps<{
  compact?: boolean
  currentVideoId?: string
  title?: string
  videos?: VideoSummary[]
}>(), {
  compact: false,
  currentVideoId: undefined,
  title: undefined,
  videos: () => []
})

const { t } = useI18n()
const resolvedTitle = computed(() => props.title || t("player.upNext"))

function formatDuration(seconds: number) {
  const safeSeconds = Math.max(0, Math.floor(seconds))
  const minutes = Math.floor(safeSeconds / 60)
  const rest = String(safeSeconds % 60).padStart(2, "0")

  return `${minutes}:${rest}`
}

function formatCount(value: number) {
  if (value >= 10000) {
    return `${(value / 10000).toFixed(1)}万`
  }

  if (value >= 1000) {
    return `${(value / 1000).toFixed(1)}k`
  }

  return String(value)
}
</script>

<template>
  <section class="aoi-video-queue" :class="{ 'aoi-video-queue--compact': props.compact }">
    <header class="aoi-video-queue__header">
      <h2>{{ resolvedTitle }}</h2>
      <AoiIcon name="list-video" :size="18" decorative />
    </header>

    <div class="aoi-video-queue__list">
      <AoiLink
        v-for="video in props.videos"
        :key="video.id"
        class="aoi-video-queue__item"
        :class="{ 'aoi-video-queue__item--active': video.id === props.currentVideoId }"
        :to="`/video/${video.slug}`"
      >
        <span class="aoi-video-queue__media">
          <AoiLazyImage
            class="aoi-video-queue__thumb"
            :src="video.thumbnailUrl"
            alt=""
          />
          <span class="aoi-video-queue__duration">{{ formatDuration(video.durationSeconds) }}</span>
        </span>
        <span class="aoi-video-queue__copy">
          <strong>{{ video.title }}</strong>
          <span>{{ video.uploader.displayName }}</span>
          <span class="aoi-video-queue__stats">
            <AoiIcon name="play" :size="12" decorative />
            {{ formatCount(video.viewCount) }}
            <AoiIcon name="message-square-text" :size="12" decorative />
            {{ formatCount(video.commentCount) }}
          </span>
        </span>
      </AoiLink>
    </div>
  </section>
</template>

<style scoped>
.aoi-video-queue {
  display: grid;
  gap: 7px;
  border: 1px solid var(--aoi-player-border);
  border-radius: var(--aoi-radius-card);
  background: var(--aoi-player-surface);
  box-shadow: none;
  padding: 9px;
}

.aoi-video-queue__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.aoi-video-queue__header h2 {
  margin: 0;
  color: var(--aoi-player-text);
  font-size: 13px;
  font-weight: 760;
}

.aoi-video-queue__list {
  display: grid;
  gap: 4px;
}

.aoi-video-queue__item {
  position: relative;
  display: grid;
  min-width: 0;
  grid-template-columns: 112px minmax(0, 1fr);
  gap: 8px;
  align-items: start;
  border-radius: var(--aoi-radius-field);
  color: var(--aoi-player-text);
  padding: 5px;
  transition:
    background var(--aoi-motion-fast) var(--aoi-ease-out),
    color var(--aoi-motion-fast) var(--aoi-ease-out);
}

.aoi-video-queue__item:hover,
.aoi-video-queue__item--active {
  background: var(--aoi-player-surface-muted);
}

.aoi-video-queue__item--active strong {
  color: var(--aoi-player-accent);
}

.aoi-video-queue__media {
  position: relative;
  display: block;
  min-width: 0;
}

.aoi-video-queue__thumb {
  aspect-ratio: 16 / 9;
  overflow: hidden;
  border-radius: var(--aoi-radius-field);
  background: var(--aoi-player-surface-muted);
}

.aoi-video-queue__duration {
  position: absolute;
  right: 4px;
  bottom: 4px;
  border-radius: 2px;
  background: rgba(0, 0, 0, .62);
  color: #fff;
  font-size: 10px;
  font-weight: 760;
  line-height: 1;
  padding: 3px 4px;
}

.aoi-video-queue__copy {
  display: grid;
  min-width: 0;
  gap: 3px;
}

.aoi-video-queue__copy strong {
  display: -webkit-box;
  overflow: hidden;
  font-size: 12px;
  font-weight: 700;
  line-height: 1.45;
  text-overflow: ellipsis;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.aoi-video-queue__copy span {
  overflow: hidden;
  color: var(--aoi-player-text-muted);
  font-size: 11px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.aoi-video-queue__stats {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.aoi-video-queue--compact .aoi-video-queue__item {
  grid-template-columns: 104px minmax(0, 1fr);
}

@media (max-width: 639px) {
  .aoi-video-queue__item {
    grid-template-columns: 96px minmax(0, 1fr);
  }
}
</style>
