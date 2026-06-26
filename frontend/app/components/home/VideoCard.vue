<script setup lang="ts">
import type { VideoSummary } from "~/types/api"

const props = defineProps<{
  video: VideoSummary
  index: number
}>()

const settings = useAppSettingsStore()
const detailPath = computed(() => `/video/${props.video.slug}`)
const linkTarget = computed(() => settings.openVideosInNewTab ? "_blank" : undefined)
const durationLabel = computed(() => formatDuration(props.video.durationSeconds))

function formatDuration(totalSeconds: number) {
  const safeSeconds = Number.isFinite(totalSeconds) && totalSeconds > 0 ? totalSeconds : 0
  const minutes = Math.floor(safeSeconds / 60).toString().padStart(2, "0")
  const seconds = (safeSeconds % 60).toString().padStart(2, "0")

  return `${minutes}:${seconds}`
}
</script>

<template>
  <article class="video-card">
    <div class="video-card__media">
      <AoiLink
        class="video-card__cover-link"
        :to="detailPath"
        :aria-label="video.title"
        :target="linkTarget"
      >
        <AoiLazyImage
          class="video-card__cover"
          :src="video.thumbnailUrl"
          alt=""
        />
        <span class="video-card__duration">{{ durationLabel }}</span>
      </AoiLink>
    </div>

    <AoiLink class="video-card__title" :to="detailPath" :target="linkTarget">{{ video.title }}</AoiLink>
    <VideoMeta :video="video" compact />
  </article>
</template>

<style scoped>
.video-card {
  display: grid;
  min-width: 0;
  border: 1px solid transparent;
  border-radius: var(--aoi-radius-card);
  color: var(--aoi-text);
  gap: 8px;
  padding: 8px;
  transform: translate3d(0, 0, 0);
  transition:
    transform var(--aoi-motion-base) var(--aoi-ease-out),
    box-shadow var(--aoi-motion-base) var(--aoi-ease-out),
    background var(--aoi-motion-base) var(--aoi-ease-out);
  will-change: transform;
}

.video-card:hover {
  border-color: transparent;
  background: color-mix(in srgb, var(--aoi-surface-solid) 32%, transparent);
  box-shadow: 0 10px 24px rgba(33, 33, 33, 0.035);
  transform: translate3d(0, -3px, 0);
}

.video-card:active {
  transform: translate3d(0, 0, 0) scale(.972);
}

.video-card__media {
  position: relative;
  min-width: 0;
}

.video-card__cover-link {
  display: block;
  position: relative;
  border-radius: var(--aoi-radius-card);
}

.video-card__cover {
  display: block;
  position: relative;
  aspect-ratio: 16 / 9;
  overflow: hidden;
  border-radius: var(--aoi-radius-card);
  box-shadow: 0 10px 28px rgba(33, 33, 33, 0.035);
}

.video-card__duration {
  position: absolute;
  right: 8px;
  bottom: 8px;
  z-index: 1;
  display: inline-flex;
  min-width: 48px;
  height: 22px;
  align-items: center;
  justify-content: center;
  border: 1px solid rgba(255, 255, 255, 0.42);
  border-radius: var(--aoi-radius-xs);
  background: rgba(33, 33, 33, 0.74);
  color: #ffffff;
  font-family: Inter, "Noto Sans SC", system-ui, sans-serif;
  font-size: 11px;
  font-weight: 800;
  font-variant-numeric: tabular-nums;
  line-height: 1;
}

.video-card__title {
  display: -webkit-box;
  min-height: 42px;
  overflow: hidden;
  font-weight: 700;
  line-height: 1.5;
  text-overflow: ellipsis;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

@media (max-width: 639px) {
  .video-card {
    width: 100%;
    max-width: 100%;
    min-width: 0;
    overflow: hidden;
    gap: 7px;
    padding: 5px;
  }

  .video-card:hover {
    box-shadow: none;
    transform: none;
  }

  .video-card__cover {
    width: 100%;
    max-width: 100%;
  }

  .video-card__title {
    min-height: 40px;
    font-size: 13px;
    line-height: 1.55;
    overflow-wrap: anywhere;
  }

}

@media (prefers-reduced-motion: reduce) {
  .video-card {
    will-change: auto;
  }
}
</style>
