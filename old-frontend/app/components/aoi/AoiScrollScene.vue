<script setup lang="ts">
import type Lenis from "lenis"
import Snap from "lenis/snap"
import type { AoiScrollSnapAlign } from "~/utils/aoiScroll"
import {
  hasAoiScrollableAncestor,
  isAoiInteractiveScrollTarget,
  toAoiSnapDistanceThreshold
} from "~/utils/aoiScroll"

const props = withDefaults(defineProps<{
  align?: Exclude<AoiScrollSnapAlign, "none">
  ariaLabel?: string
  cooldownMs?: number
  fullHeight?: boolean
  hijack?: boolean
  offset?: number
  sectionSelector?: string
  snap?: boolean
  tag?: string
}>(), {
  align: "start",
  ariaLabel: undefined,
  cooldownMs: 620,
  fullHeight: true,
  hijack: true,
  offset: 0,
  sectionSelector: "[data-aoi-scroll-snap-item]",
  snap: true,
  tag: "section"
})

type AoiSnapInstance = InstanceType<typeof Snap>

const settings = useAppSettingsStore()
const aoiScroll = useAoiScroll()
const rootRef = ref<HTMLElement | null>(null)
const contentRef = ref<HTMLElement | null>(null)
const sections = ref<HTMLElement[]>([])
const activeIndex = ref(0)
let snap: AoiSnapInstance | null = null
let observer: IntersectionObserver | null = null
let lockUntil = 0

const canHijack = computed(() => (
  props.hijack
  && settings.scrollHijackEnabled
  && !aoiScroll.isReducedMotion.value
))
const canSnap = computed(() => (
  props.snap
  && settings.scrollSnapEnabled
  && aoiScroll.isSmoothEnabled.value
  && !aoiScroll.isReducedMotion.value
))

function destroyObserver() {
  observer?.disconnect()
  observer = null
}

function destroySnap() {
  snap?.destroy()
  snap = null
}

function collectSections() {
  const root = rootRef.value
  const content = contentRef.value

  if (!root || !content) {
    sections.value = []
    return
  }

  const matched = Array.from(root.querySelectorAll<HTMLElement>(props.sectionSelector))
  sections.value = matched.length
    ? matched
    : Array.from(content.children).filter((child): child is HTMLElement => child instanceof HTMLElement)
}

function createObserver() {
  destroyObserver()

  if (!("IntersectionObserver" in window) || sections.value.length === 0) {
    return
  }

  observer = new IntersectionObserver((entries) => {
    const visible = entries
      .filter((entry) => entry.isIntersecting)
      .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0]

    if (!visible || !(visible.target instanceof HTMLElement)) {
      return
    }

    const index = sections.value.indexOf(visible.target)

    if (index >= 0) {
      activeIndex.value = index
    }
  }, {
    root: null,
    rootMargin: "0px 0px -18% 0px",
    threshold: [0.35, 0.55, 0.72]
  })

  for (const section of sections.value) {
    observer.observe(section)
  }
}

function createSnap() {
  destroySnap()

  if (!canSnap.value || sections.value.length === 0) {
    return
  }

  const lenis = aoiScroll.getLenis() as Lenis | null

  if (!lenis) {
    return
  }

  snap = new Snap(lenis, {
    debounce: 320,
    distanceThreshold: toAoiSnapDistanceThreshold(settings.effectiveScrollSettings.snap.strength),
    duration: Math.max(0.24, settings.effectiveScrollSettings.smooth.durationMs / 1400),
    type: settings.scrollSnapMode
  })
  snap.addElements(sections.value, {
    align: props.align,
    ignoreSticky: true,
    ignoreTransform: true
  })
}

function refreshScene() {
  collectSections()
  createObserver()
  createSnap()
}

function clampIndex(index: number) {
  return Math.min(sections.value.length - 1, Math.max(0, index))
}

function scrollToIndex(index: number) {
  const section = sections.value[clampIndex(index)]

  if (!section) {
    return
  }

  lockUntil = Date.now() + props.cooldownMs
  aoiScroll.scrollTo(section, {
    duration: Math.max(0.2, settings.effectiveScrollSettings.smooth.durationMs / 1000),
    lock: Boolean(aoiScroll.getLenis()),
    offset: props.offset
  })
}

function normalizeWheelDelta(event: WheelEvent) {
  if (event.deltaMode === WheelEvent.DOM_DELTA_LINE) {
    return event.deltaY * 16
  }

  if (event.deltaMode === WheelEvent.DOM_DELTA_PAGE) {
    return event.deltaY * window.innerHeight
  }

  return event.deltaY
}

function shouldIgnoreEvent(event: Event) {
  const root = rootRef.value

  if (!root || isAoiInteractiveScrollTarget(event.target)) {
    return true
  }

  return hasAoiScrollableAncestor(event.target, root, "y")
}

function onWheel(event: WheelEvent) {
  if (!canHijack.value || shouldIgnoreEvent(event)) {
    return
  }

  const delta = normalizeWheelDelta(event)

  if (
    Math.abs(delta) < settings.effectiveScrollSettings.hijack.thresholdPx
    || Math.abs(delta) <= Math.abs(event.deltaX)
    || Date.now() < lockUntil
  ) {
    return
  }

  event.preventDefault()
  const direction = delta > 0 ? 1 : -1
  const baseIndex = settings.scrollHijackMode === "nearest"
    ? nearestSectionIndex()
    : activeIndex.value

  scrollToIndex(baseIndex + direction)
}

function onKeydown(event: KeyboardEvent) {
  if (!canHijack.value || shouldIgnoreEvent(event)) {
    return
  }

  if (event.key === "ArrowDown" || event.key === "PageDown" || event.key === " ") {
    event.preventDefault()
    scrollToIndex(activeIndex.value + 1)
  } else if (event.key === "ArrowUp" || event.key === "PageUp") {
    event.preventDefault()
    scrollToIndex(activeIndex.value - 1)
  } else if (event.key === "Home") {
    event.preventDefault()
    scrollToIndex(0)
  } else if (event.key === "End") {
    event.preventDefault()
    scrollToIndex(sections.value.length - 1)
  }
}

function nearestSectionIndex() {
  if (sections.value.length === 0) {
    return 0
  }

  const viewportAnchor = window.scrollY + window.innerHeight * 0.35
  let nearestIndex = 0
  let nearestDistance = Number.POSITIVE_INFINITY

  sections.value.forEach((section, index) => {
    const top = section.getBoundingClientRect().top + window.scrollY
    const distance = Math.abs(top - viewportAnchor)

    if (distance < nearestDistance) {
      nearestIndex = index
      nearestDistance = distance
    }
  })

  return nearestIndex
}

onMounted(() => {
  void nextTick(refreshScene)
})

onBeforeUnmount(() => {
  destroyObserver()
  destroySnap()
})

watch(() => [
  props.align,
  props.sectionSelector,
  props.snap,
  settings.scrollSnapEnabled,
  settings.scrollSnapMode,
  settings.scrollSnapStrength,
  settings.scrollHijackEnabled,
  settings.scrollHijackMode,
  settings.scrollHijackThresholdPx,
  settings.smoothScrollDurationMs,
  settings.settingDerivationStrengths.scrollSnap,
  settings.settingDerivationStrengths.scrollHijack,
  settings.settingDerivationStrengths.smoothScroll,
  aoiScroll.isSmoothEnabled.value,
  aoiScroll.isReducedMotion.value
], () => {
  void nextTick(refreshScene)
}, {
  flush: "post"
})

defineExpose({
  activeIndex,
  refresh: refreshScene,
  scrollToIndex
})
</script>

<template>
  <component
    :is="tag"
    ref="rootRef"
    class="aoi-scroll-scene"
    :class="{
      'aoi-scroll-scene--full': fullHeight,
      'aoi-scroll-scene--hijack': canHijack,
      'aoi-scroll-scene--snap': canSnap
    }"
    data-aoi-scroll-scene
    :aria-label="ariaLabel"
    :role="ariaLabel ? 'region' : undefined"
    :tabindex="canHijack ? 0 : undefined"
    @keydown="onKeydown"
    @wheel="onWheel"
  >
    <div ref="contentRef" class="aoi-scroll-scene__content">
      <slot :active-index="activeIndex" :go-to="scrollToIndex" />
    </div>
  </component>
</template>

<style scoped>
.aoi-scroll-scene {
  position: relative;
  min-width: 0;
  outline: none;
}

.aoi-scroll-scene:focus-visible {
  outline: 3px solid var(--aoi-focus);
  outline-offset: 4px;
}

.aoi-scroll-scene__content {
  display: grid;
  min-width: 0;
  gap: var(--aoi-grid-gap);
}

.aoi-scroll-scene--full :deep([data-aoi-scroll-snap-item]) {
  min-height: min(680px, calc(100svh - 140px));
  scroll-margin-block-start: calc(var(--aoi-page-padding-block-start) + var(--aoi-scroll-hijack-threshold, 64px));
}

@media (max-width: 639px) {
  .aoi-scroll-scene--full :deep([data-aoi-scroll-snap-item]) {
    min-height: calc(100svh - var(--aoi-mobile-nav-height) * 2 - 32px);
  }
}
</style>
