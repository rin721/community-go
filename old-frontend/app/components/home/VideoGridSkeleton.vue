<script setup lang="ts">
const props = withDefaults(defineProps<{
  count?: number
  label?: string
}>(), {
  count: 8,
  label: undefined
})

const items = computed(() => Array.from({
  length: Math.max(1, Math.floor(props.count))
}, (_, index) => index))
</script>

<template>
  <AoiContentGrid
    class="video-grid-skeleton"
    min-width="var(--aoi-video-grid-min-card-width)"
    gap="video"
    :mobile-columns="2"
    :aria-busy="'true'"
    :aria-live="label ? 'polite' : undefined"
    :role="label ? 'status' : undefined"
  >
    <span v-if="label" class="video-grid-skeleton__label">{{ label }}</span>
    <VideoCardSkeleton
      v-for="item in items"
      :key="item"
      class="video-grid-skeleton__item"
    />
  </AoiContentGrid>
</template>

<style scoped>
.video-grid-skeleton {
  position: relative;
}

.video-grid-skeleton__item {
  min-width: 0;
}

.video-grid-skeleton__label {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  clip-path: inset(50%);
  white-space: nowrap;
}
</style>
