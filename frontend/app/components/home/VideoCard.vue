<script setup lang="ts">
import type { VideoSummary } from "~/types/api"

const props = defineProps<{
  video: VideoSummary
  index: number
}>()

const settings = useAppSettingsStore()
const detailPath = computed(() => `/video/${props.video.slug}`)
const linkTarget = computed(() => settings.openVideosInNewTab ? "_blank" : undefined)
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
  background: var(--aoi-surface);
  box-shadow: var(--aoi-shadow-md);
  transform: translate3d(0, -6px, 0);
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
  border-radius: var(--aoi-radius-card);
}

.video-card__cover {
  display: block;
  position: relative;
  aspect-ratio: 16 / 9;
  overflow: hidden;
  border-radius: var(--aoi-radius-card);
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.32);
}

.video-card__cover::before,
.video-card__cover::after {
  position: absolute;
  content: "";
  pointer-events: none;
}

.video-card__cover::before {
  inset: auto 12px 12px auto;
  width: 42px;
  height: 42px;
  border: 2px solid rgba(255, 255, 255, 0.72);
  border-radius: var(--aoi-radius-round);
}

.video-card__cover::after {
  top: 14px;
  left: 14px;
  width: 78px;
  height: 3px;
  border-radius: var(--aoi-radius-round);
  background: rgba(255, 255, 255, 0.72);
  box-shadow: 0 12px 0 rgba(255, 255, 255, 0.42);
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
