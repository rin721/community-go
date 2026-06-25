<script setup lang="ts">
import type { AoiDanmakuItem } from "~/types/danmaku"
import type { AoiDanmakuRuntimeSettings } from "~/utils/aoiDanmaku"
import { createAoiDanmakuRenderItems, normalizeAoiDanmakuSettings } from "~/utils/aoiDanmaku"

const props = withDefaults(defineProps<{
  currentTime?: number
  durationSeconds?: number
  items?: AoiDanmakuItem[]
  playing?: boolean
  settings?: Partial<AoiDanmakuRuntimeSettings>
}>(), {
  currentTime: 0,
  durationSeconds: 0,
  items: () => [],
  playing: false,
  settings: () => ({})
})

const runtimeSettings = computed(() => normalizeAoiDanmakuSettings(props.settings))
const renderItems = computed(() => createAoiDanmakuRenderItems(
  props.items,
  props.currentTime,
  runtimeSettings.value
))
const layerStyle = computed(() => ({
  "--aoi-danmaku-font-scale": String(runtimeSettings.value.fontScale),
  "--aoi-danmaku-opacity": String(runtimeSettings.value.opacity),
  "--aoi-danmaku-visible-area": `${runtimeSettings.value.visibleArea}%`
}))
</script>

<template>
  <div
    class="aoi-danmaku-layer"
    :class="{ 'aoi-danmaku-layer--paused': !playing }"
    :style="layerStyle"
    aria-hidden="true"
  >
    <span
      v-for="renderItem in renderItems"
      :key="renderItem.key"
      class="aoi-danmaku-layer__item"
      :class="`aoi-danmaku-layer__item--${renderItem.mode}`"
      :style="renderItem.style"
    >
      {{ renderItem.item.body }}
    </span>
  </div>
</template>

<style scoped>
.aoi-danmaku-layer {
  position: absolute;
  inset: 0;
  overflow: hidden;
  pointer-events: none;
  z-index: 2;
  contain: layout paint;
}

.aoi-danmaku-layer__item {
  position: absolute;
  top: var(--aoi-danmaku-item-top);
  bottom: var(--aoi-danmaku-item-bottom);
  left: 0;
  display: inline-flex;
  max-width: 80%;
  align-items: center;
  color: var(--aoi-danmaku-item-color);
  font-size: calc(16px * var(--aoi-danmaku-font-scale, 1));
  font-weight: 800;
  line-height: 1.2;
  opacity: var(--aoi-danmaku-opacity, .86);
  padding: 2px 8px;
  text-shadow:
    0 1px 2px rgba(0, 0, 0, .86),
    0 0 8px rgba(0, 0, 0, .62);
  transform: translate3d(100vw, 0, 0);
  white-space: nowrap;
  will-change: transform, opacity;
}

.aoi-danmaku-layer__item--scroll {
  animation: aoi-danmaku-scroll var(--aoi-danmaku-item-duration) linear var(--aoi-danmaku-item-delay) both;
}

.aoi-danmaku-layer__item--top,
.aoi-danmaku-layer__item--bottom {
  right: 0;
  left: 0;
  justify-content: center;
  margin: auto;
  text-align: center;
  transform: translate3d(0, 0, 0);
  animation: aoi-danmaku-fixed var(--aoi-danmaku-item-duration) linear var(--aoi-danmaku-item-delay) both;
}

.aoi-danmaku-layer--paused .aoi-danmaku-layer__item {
  animation-play-state: paused;
}

@keyframes aoi-danmaku-scroll {
  from {
    transform: translate3d(100vw, 0, 0);
  }

  to {
    transform: translate3d(-100%, 0, 0);
  }
}

@keyframes aoi-danmaku-fixed {
  0%,
  100% {
    opacity: 0;
  }

  12%,
  88% {
    opacity: var(--aoi-danmaku-opacity, .86);
  }
}

@media (max-width: 639px) {
  .aoi-danmaku-layer__item {
    font-size: calc(13px * var(--aoi-danmaku-font-scale, 1));
  }
}

@media (prefers-reduced-motion: reduce) {
  .aoi-danmaku-layer__item {
    animation: none !important;
    opacity: var(--aoi-danmaku-opacity, .86);
    transform: translate3d(0, 0, 0);
  }
}
</style>
