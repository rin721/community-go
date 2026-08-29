<script setup lang="ts">
import type { PlayerPlaybackRate } from "~/types/player"

withDefaults(defineProps<{
  currentTime?: number
  danmakuEnabled?: boolean
  duration?: number
  fullscreen?: boolean
  isPlaying?: boolean
  muted?: boolean
  playbackRate?: PlayerPlaybackRate
  playbackRates?: PlayerPlaybackRate[]
  theaterMode?: boolean
  volumePercent?: number
}>(), {
  currentTime: 0,
  danmakuEnabled: true,
  duration: 0,
  fullscreen: false,
  isPlaying: false,
  muted: false,
  playbackRate: 1,
  playbackRates: () => [0.75, 1, 1.25, 1.5, 2],
  theaterMode: false,
  volumePercent: 80
})

const emit = defineEmits<{
  seek: [seconds: number]
  "toggle-danmaku": []
  "toggle-fullscreen": []
  "toggle-muted": []
  "toggle-play": []
  "toggle-theater": []
  "update:playbackRate": [value: PlayerPlaybackRate]
  "update:volumePercent": [value: number]
}>()
</script>

<template>
  <div class="aoi-video-controls">
    <AoiVideoTimeline
      :current-time="currentTime"
      :duration="duration"
      @seek="emit('seek', $event)"
    />
    <AoiVideoToolbar
      :danmaku-enabled="danmakuEnabled"
      :fullscreen="fullscreen"
      :is-playing="isPlaying"
      :muted="muted"
      :playback-rate="playbackRate"
      :playback-rates="playbackRates"
      :theater-mode="theaterMode"
      :volume-percent="volumePercent"
      @toggle-danmaku="emit('toggle-danmaku')"
      @toggle-fullscreen="emit('toggle-fullscreen')"
      @toggle-muted="emit('toggle-muted')"
      @toggle-play="emit('toggle-play')"
      @toggle-theater="emit('toggle-theater')"
      @update:playback-rate="emit('update:playbackRate', $event)"
      @update:volume-percent="emit('update:volumePercent', $event)"
    />
  </div>
</template>

<style scoped>
.aoi-video-controls {
  display: grid;
  gap: 4px;
  background: var(--aoi-player-control-overlay);
  padding: 42px 12px 9px;
  pointer-events: auto;
}

@media (max-width: 639px) {
  .aoi-video-controls {
    gap: 5px;
    padding: 24px 8px 8px;
  }
}
</style>
