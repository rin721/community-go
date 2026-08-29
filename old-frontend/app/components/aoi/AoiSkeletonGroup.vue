<script setup lang="ts">
import type { AoiSkeletonAnimation, AoiSkeletonEmphasis, AoiSkeletonSize } from "~/utils/aoiSkeleton"
import { aoiSkeletonDefaultsKey, toAoiSkeletonCssValue } from "~/utils/aoiSkeleton"

type AoiSkeletonGroupLayout = "stack" | "row" | "grid" | "inline" | "custom"
type AoiSkeletonGroupAlign = "start" | "center" | "end" | "stretch" | "baseline" | (string & {})
type AoiSkeletonGroupJustify = "start" | "center" | "end" | "space-between" | "space-around" | "space-evenly" | (string & {})
type AoiSkeletonGridColumns = number | string

defineOptions({
  inheritAttrs: false
})

const props = withDefaults(defineProps<{
  align?: AoiSkeletonGroupAlign
  animation?: AoiSkeletonAnimation
  busy?: boolean
  columns?: AoiSkeletonGridColumns
  gap?: AoiSkeletonSize
  justify?: AoiSkeletonGroupJustify
  label?: string
  layout?: AoiSkeletonGroupLayout
  minItemWidth?: AoiSkeletonSize
  tag?: string
  emphasis?: AoiSkeletonEmphasis
  wrap?: boolean
}>(), {
  align: undefined,
  animation: undefined,
  busy: true,
  columns: undefined,
  gap: undefined,
  justify: undefined,
  label: undefined,
  layout: "stack",
  minItemWidth: undefined,
  tag: "div",
  emphasis: undefined,
  wrap: false
})

const attrs = useAttrs()
const groupEmphasis = computed(() => props.emphasis)
const groupAnimation = computed(() => props.animation)
const passThroughAttrs = computed(() => {
  const {
    class: _class,
    style: _style,
    ...rest
  } = attrs

  return rest
})
const gridTemplateColumns = computed(() => {
  if (typeof props.columns === "number") {
    return `repeat(${Math.max(1, Math.floor(props.columns))}, minmax(0, 1fr))`
  }

  if (props.columns) {
    return props.columns
  }

  const minItemWidth = toAoiSkeletonCssValue(props.minItemWidth)

  if (minItemWidth) {
    return `repeat(auto-fill, minmax(${minItemWidth}, 1fr))`
  }

  return undefined
})
const groupStyle = computed(() => ({
  "--aoi-skeleton-group-align": props.align,
  "--aoi-skeleton-group-gap": toAoiSkeletonCssValue(props.gap),
  "--aoi-skeleton-group-grid-columns": gridTemplateColumns.value,
  "--aoi-skeleton-group-justify": props.justify
}))

provide(aoiSkeletonDefaultsKey, {
  animation: groupAnimation,
  emphasis: groupEmphasis
})
</script>

<template>
  <component
    :is="tag"
    v-bind="passThroughAttrs"
    class="aoi-skeleton-group"
    :class="attrs.class"
    :style="[groupStyle, attrs.style]"
    :aria-busy="busy ? 'true' : undefined"
    :aria-live="busy && label ? 'polite' : undefined"
    :data-aoi-skeleton-layout="layout"
    :data-aoi-skeleton-wrap="wrap ? 'true' : undefined"
    :role="busy && label ? 'status' : undefined"
  >
    <span v-if="label" class="aoi-skeleton-group__label">{{ label }}</span>
    <slot />
  </component>
</template>

<style scoped>
.aoi-skeleton-group {
  position: relative;
  min-width: 0;
}

.aoi-skeleton-group[data-aoi-skeleton-layout="stack"] {
  display: grid;
  gap: var(--aoi-skeleton-group-gap, 12px);
}

.aoi-skeleton-group[data-aoi-skeleton-layout="row"] {
  display: flex;
  align-items: var(--aoi-skeleton-group-align, center);
  justify-content: var(--aoi-skeleton-group-justify, flex-start);
  gap: var(--aoi-skeleton-group-gap, 12px);
}

.aoi-skeleton-group[data-aoi-skeleton-layout="row"][data-aoi-skeleton-wrap="true"] {
  flex-wrap: wrap;
}

.aoi-skeleton-group[data-aoi-skeleton-layout="grid"] {
  display: grid;
  grid-template-columns: var(--aoi-skeleton-group-grid-columns, repeat(auto-fill, minmax(160px, 1fr)));
  align-items: var(--aoi-skeleton-group-align, stretch);
  justify-content: var(--aoi-skeleton-group-justify, stretch);
  gap: var(--aoi-skeleton-group-gap, 12px);
}

.aoi-skeleton-group[data-aoi-skeleton-layout="inline"] {
  display: inline-flex;
  align-items: var(--aoi-skeleton-group-align, center);
  justify-content: var(--aoi-skeleton-group-justify, flex-start);
  gap: var(--aoi-skeleton-group-gap, 8px);
}

.aoi-skeleton-group[data-aoi-skeleton-layout="inline"][data-aoi-skeleton-wrap="true"] {
  flex-wrap: wrap;
}

.aoi-skeleton-group__label {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  clip-path: inset(50%);
  white-space: nowrap;
}
</style>
