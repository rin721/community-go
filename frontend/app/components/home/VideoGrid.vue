<script setup lang="ts">
import type { VideoSummary } from "~/types/api"

defineProps<{
  videos: VideoSummary[]
}>()
</script>

<template>
  <AoiContentGrid
    class="video-grid"
    min-width="var(--aoi-video-grid-min-card-width)"
    gap="video"
    :mobile-columns="2"
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
</style>
