<script setup lang="ts">
import type { VideoSummary } from "~/types/api"

const props = defineProps<{
  videos: VideoSummary[]
}>()

const isSparse = computed(() => props.videos.length > 0 && props.videos.length <= 2)
const gridMode = computed(() => isSparse.value ? "fit" : "fill")
const gridMaxWidth = computed(() => isSparse.value ? "min(100%, var(--aoi-video-grid-sparse-card-width))" : "1fr")
const mobileColumns = computed(() => props.videos.length === 1 ? 1 : 2)
</script>

<template>
  <AoiContentGrid
    class="video-grid"
    :class="{ 'video-grid--sparse': isSparse }"
    min-width="var(--aoi-video-grid-min-card-width)"
    :max-width="gridMaxWidth"
    gap="video"
    :mode="gridMode"
    :mobile-columns="mobileColumns"
  >
    <AoiReveal
      v-for="(video, index) in videos"
      :key="video.id"
      class="video-grid__item"
      :index="index"
    >
      <VideoCard
        :video="video"
        :index="index"
      />
    </AoiReveal>
  </AoiContentGrid>
</template>

<style scoped>
.video-grid__item {
  min-width: 0;
}

.video-grid--sparse {
  align-items: start;
}
</style>
