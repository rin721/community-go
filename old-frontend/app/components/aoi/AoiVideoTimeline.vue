<script setup lang="ts">
const props = withDefaults(defineProps<{
  ariaLabel?: string
  currentTime?: number
  duration?: number
}>(), {
  ariaLabel: "Playback progress",
  currentTime: 0,
  duration: 0
})

const emit = defineEmits<{
  seek: [seconds: number]
}>()

function formatTime(seconds: number) {
  const safeSeconds = Math.max(0, Math.floor(seconds))
  const hours = Math.floor(safeSeconds / 3600)
  const minutes = Math.floor((safeSeconds % 3600) / 60)
  const rest = String(safeSeconds % 60).padStart(2, "0")

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${rest}`
  }

  return `${minutes}:${rest}`
}
</script>

<template>
  <div class="aoi-video-timeline">
    <span class="aoi-video-timeline__time">{{ formatTime(currentTime) }}</span>
    <AoiSlider
      class="aoi-video-timeline__slider"
      :model-value="currentTime"
      :aria-label="ariaLabel"
      contrast="inverse"
      compact
      :min="0"
      :max="Math.max(0, duration)"
      :step="0.1"
      @update:model-value="emit('seek', $event)"
    />
    <span class="aoi-video-timeline__time">{{ formatTime(duration) }}</span>
  </div>
</template>

<style scoped>
.aoi-video-timeline {
  display: grid;
  grid-template-columns: minmax(42px, auto) minmax(0, 1fr) minmax(42px, auto);
  align-items: center;
  gap: 7px;
  color: rgba(255, 255, 255, .88);
  font-size: 11px;
  font-variant-numeric: tabular-nums;
  font-weight: 700;
}

.aoi-video-timeline__time {
  white-space: nowrap;
  text-shadow: 0 1px 2px rgba(0, 0, 0, .72);
}

.aoi-video-timeline__slider {
  --md-slider-active-track-color: var(--aoi-player-accent);
  --md-slider-handle-color: #fff;
  --md-slider-hover-handle-color: #fff;
  --md-slider-inactive-track-color: rgba(255, 255, 255, .28);
  --md-slider-with-tick-marks-active-container-color: var(--aoi-player-accent);
  --md-slider-active-track-height: 3px;
  --md-slider-inactive-track-height: 3px;
  --md-slider-handle-height: 10px;
  --md-slider-handle-width: 10px;
}

@media (max-width: 639px) {
  .aoi-video-timeline {
    grid-template-columns: 38px minmax(0, 1fr) 38px;
    gap: 6px;
    font-size: 11px;
  }
}
</style>
