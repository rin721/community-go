<script setup lang="ts">
import type { AoiContentGridGap, AoiRevealProp } from "~/types/ui"

const props = withDefaults(defineProps<{
  as?: string
  gap?: AoiContentGridGap
  minWidth?: string
  mobileColumns?: 1 | 2
  reveal?: AoiRevealProp
}>(), {
  as: "div",
  gap: "normal",
  minWidth: "224px",
  mobileColumns: 1,
  reveal: false
})

const gridStyle = computed(() => ({
  "--aoi-content-grid-min-width": props.minWidth
}))
</script>

<template>
  <component
    :is="props.as"
    v-aoi-reveal="props.reveal"
    class="aoi-content-grid"
    :class="[
      `aoi-content-grid--gap-${props.gap}`,
      `aoi-content-grid--mobile-${props.mobileColumns}`
    ]"
    :style="gridStyle"
  >
    <slot />
  </component>
</template>

<style scoped>
.aoi-content-grid {
  display: grid;
  min-width: 0;
  grid-template-columns: repeat(auto-fill, minmax(var(--aoi-content-grid-min-width), 1fr));
}

.aoi-content-grid--gap-normal {
  gap: var(--aoi-grid-gap);
}

.aoi-content-grid--gap-compact {
  gap: var(--aoi-grid-gap-compact);
}

.aoi-content-grid--gap-video {
  gap: var(--aoi-video-grid-row-gap) var(--aoi-video-grid-column-gap);
}

@media (max-width: 639px) {
  .aoi-content-grid--mobile-1 {
    grid-template-columns: minmax(0, 1fr);
  }

  .aoi-content-grid--mobile-2 {
    width: 100%;
    max-width: 100%;
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .aoi-content-grid--gap-video {
    gap: var(--aoi-video-grid-mobile-row-gap) var(--aoi-video-grid-mobile-column-gap);
  }
}
</style>
