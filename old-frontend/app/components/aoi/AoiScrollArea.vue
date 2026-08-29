<script setup lang="ts">
import type {
  AoiScrollAxis,
  AoiScrollOverscroll,
  AoiScrollSnapMode
} from "~/utils/aoiScroll"
import {
  isAoiInteractiveScrollTarget,
  toAoiRubberBandRatio,
  toAoiScrollSnapType
} from "~/utils/aoiScroll"

const props = withDefaults(defineProps<{
  ariaLabel?: string
  axis?: AoiScrollAxis
  overscroll?: AoiScrollOverscroll
  rubberBand?: boolean
  snap?: boolean
  snapMode?: AoiScrollSnapMode
  tabindex?: number
}>(), {
  ariaLabel: undefined,
  axis: "x",
  overscroll: "contain",
  rubberBand: true,
  snap: false,
  snapMode: undefined,
  tabindex: undefined
})

const settings = useAppSettingsStore()
const aoiScroll = useAoiScroll()
const rootRef = ref<HTMLElement | null>(null)
const offset = ref(0)
const edge = ref<"start" | "end" | "none">("none")
let releaseFrame = 0

const snapType = computed(() => toAoiScrollSnapType(
  props.axis,
  props.snap && settings.scrollSnapEnabled,
  props.snapMode || settings.scrollSnapMode
))
const rootStyle = computed(() => ({
  "--aoi-scroll-area-overscroll": props.overscroll,
  "--aoi-scroll-area-snap-type": snapType.value
}))
const contentStyle = computed(() => ({
  "--aoi-scroll-area-rubber-band-x": props.axis === "x" ? `${offset.value.toFixed(2)}px` : "0px",
  "--aoi-scroll-area-rubber-band-y": props.axis === "y" ? `${offset.value.toFixed(2)}px` : "0px"
}))

function stopRelease() {
  if (releaseFrame) {
    window.cancelAnimationFrame(releaseFrame)
    releaseFrame = 0
  }
}

function release() {
  stopRelease()

  const tick = () => {
    offset.value *= 0.78

    if (Math.abs(offset.value) < 0.24) {
      offset.value = 0
      edge.value = "none"
      releaseFrame = 0
      return
    }

    releaseFrame = window.requestAnimationFrame(tick)
  }

  releaseFrame = window.requestAnimationFrame(tick)
}

function onWheel(event: WheelEvent) {
  const root = rootRef.value

  if (
    !root
    || !props.rubberBand
    || !settings.rubberBandEnabled
    || aoiScroll.isReducedMotion.value
    || isAoiInteractiveScrollTarget(event.target)
  ) {
    return
  }

  const delta = props.axis === "x"
    ? event.deltaX || (event.shiftKey ? event.deltaY : 0)
    : event.deltaY

  if (!delta) {
    return
  }

  const atStart = props.axis === "x"
    ? root.scrollLeft <= 0 && delta < 0
    : root.scrollTop <= 0 && delta < 0
  const atEnd = props.axis === "x"
    ? root.scrollLeft + root.clientWidth >= root.scrollWidth - 1 && delta > 0
    : root.scrollTop + root.clientHeight >= root.scrollHeight - 1 && delta > 0

  if (!atStart && !atEnd) {
    return
  }

  const ratio = toAoiRubberBandRatio(settings.effectiveScrollSettings.rubberBand.strength)
  const maxOffset = settings.effectiveScrollSettings.rubberBand.maxOffsetPx

  stopRelease()
  offset.value = Math.min(maxOffset, Math.max(-maxOffset, offset.value - (delta * ratio * 0.12)))
  edge.value = atStart ? "start" : "end"
  release()
}

onBeforeUnmount(stopRelease)
</script>

<template>
  <div
    ref="rootRef"
    class="aoi-scroll-area"
    :class="`aoi-scroll-area--${axis}`"
    :style="rootStyle"
    data-aoi-scroll-area
    data-lenis-prevent
    :data-aoi-scroll-edge="edge"
    :role="ariaLabel ? 'region' : undefined"
    :aria-label="ariaLabel"
    :tabindex="tabindex"
    @wheel="onWheel"
  >
    <div class="aoi-scroll-area__content" :style="contentStyle">
      <slot />
    </div>
  </div>
</template>

<style scoped>
.aoi-scroll-area {
  position: relative;
  max-width: 100%;
  overflow: auto;
  overscroll-behavior: var(--aoi-scroll-area-overscroll, contain);
  scroll-behavior: smooth;
  scroll-padding: var(--aoi-row-padding);
  scroll-snap-type: var(--aoi-scroll-area-snap-type, none);
  scrollbar-width: thin;
}

.aoi-scroll-area--x {
  overflow-y: hidden;
}

.aoi-scroll-area--y {
  overflow-x: hidden;
}

.aoi-scroll-area__content {
  min-width: 0;
  min-height: 0;
  transform: translate3d(
    var(--aoi-scroll-area-rubber-band-x, 0px),
    var(--aoi-scroll-area-rubber-band-y, 0px),
    0
  );
  will-change: transform;
}

.aoi-scroll-area--x .aoi-scroll-area__content {
  width: max-content;
  min-width: 100%;
}

.aoi-scroll-area[data-aoi-scroll-edge="none"] .aoi-scroll-area__content {
  will-change: auto;
}

@media (prefers-reduced-motion: reduce) {
  .aoi-scroll-area {
    scroll-behavior: auto;
    scroll-snap-type: none;
  }

  .aoi-scroll-area__content {
    transform: none !important;
    will-change: auto !important;
  }
}
</style>
