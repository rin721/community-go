<script setup lang="ts">
import type { AoiScrollSnapAlign, AoiScrollSnapStop } from "~/utils/aoiScroll"

defineOptions({
  inheritAttrs: false
})

const props = withDefaults(defineProps<{
  active?: boolean
  align?: AoiScrollSnapAlign
  stop?: AoiScrollSnapStop
  tag?: string
}>(), {
  active: false,
  align: "start",
  stop: "normal",
  tag: "div"
})

const attrs = useAttrs()
const passThroughAttrs = computed(() => {
  const { class: _class, style: _style, ...rest } = attrs

  return rest
})
const snapStyle = computed(() => ({
  "--aoi-scroll-snap-align": props.align,
  "--aoi-scroll-snap-stop": props.stop
}))
</script>

<template>
  <component
    :is="tag"
    v-bind="passThroughAttrs"
    class="aoi-scroll-snap-item"
    :class="[attrs.class, { 'aoi-scroll-snap-item--active': active }]"
    :style="[snapStyle, attrs.style]"
    data-aoi-scroll-snap-item
    :data-aoi-scroll-snap-active="active ? 'true' : 'false'"
  >
    <slot />
  </component>
</template>

<style scoped>
.aoi-scroll-snap-item {
  scroll-snap-align: var(--aoi-scroll-snap-align, start);
  scroll-snap-stop: var(--aoi-scroll-snap-stop, normal);
}
</style>
