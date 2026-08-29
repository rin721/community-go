<script setup lang="ts">
import type { AoiSkeletonAnimation, AoiSkeletonEmphasis, AoiSkeletonSize } from "~/utils/aoiSkeleton"
import { toAoiSkeletonCssValue } from "~/utils/aoiSkeleton"

const props = withDefaults(defineProps<{
  animation?: AoiSkeletonAnimation
  gap?: AoiSkeletonSize
  lastWidth?: AoiSkeletonSize
  lineHeight?: AoiSkeletonSize
  lines?: number
  radius?: AoiSkeletonSize
  emphasis?: AoiSkeletonEmphasis
  widths?: AoiSkeletonSize[]
}>(), {
  animation: undefined,
  gap: 8,
  lastWidth: "72%",
  lineHeight: 12,
  lines: 3,
  radius: undefined,
  emphasis: undefined,
  widths: undefined
})

const normalizedLines = computed(() => Math.max(1, Math.floor(props.lines)))
const textStyle = computed(() => ({
  "--aoi-skeleton-text-gap": toAoiSkeletonCssValue(props.gap)
}))

function widthForLine(index: number) {
  const customWidth = props.widths?.[index]

  if (typeof customWidth !== "undefined") {
    return customWidth
  }

  if (normalizedLines.value > 1 && index === normalizedLines.value - 1) {
    return props.lastWidth
  }

  return "100%"
}
</script>

<template>
  <span
    class="aoi-skeleton-text"
    :style="textStyle"
    aria-hidden="true"
  >
    <AoiSkeleton
      v-for="index in normalizedLines"
      :key="index"
      :animation="animation"
      :height="lineHeight"
      :radius="radius"
      shape="text"
      :emphasis="emphasis"
      :width="widthForLine(index - 1)"
    />
  </span>
</template>

<style scoped>
.aoi-skeleton-text {
  display: grid;
  min-width: 0;
  gap: var(--aoi-skeleton-text-gap, 8px);
}
</style>
