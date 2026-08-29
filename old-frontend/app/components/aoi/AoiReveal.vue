<script setup lang="ts">
import type { AoiRevealRuntimeOptions, AoiRevealVariant } from "~/utils/aoiReveal"
import { createAoiRevealStyle, normalizeAoiRevealOptions } from "~/utils/aoiReveal"

defineOptions({
  inheritAttrs: false
})

const props = withDefaults(defineProps<{
  delay?: number | string
  disabled?: boolean
  distance?: number | string
  duration?: number | string
  index?: number
  maxDelay?: number
  once?: boolean
  rootMargin?: string
  stagger?: number
  tag?: string
  threshold?: number
  variant?: AoiRevealVariant
}>(), {
  disabled: false,
  index: 0,
  once: false,
  rootMargin: "0px 0px -8% 0px",
  tag: "div",
  threshold: 0.08,
  variant: "pop"
})

const attrs = useAttrs()
const rootRef = ref<Element | null>(null)
const mounted = ref(false)
const settings = useAppSettingsStore()
const runtimeOptions = computed<AoiRevealRuntimeOptions>(() => ({
  durationMs: settings.effectiveRevealMotionSettings.durationMs,
  distancePx: settings.effectiveRevealMotionSettings.distancePx,
  effect: settings.revealMotionEffect,
  enabled: settings.revealMotionEnabled,
  maxDelayMs: settings.effectiveRevealMotionSettings.maxDelayMs,
  replay: settings.revealMotionReplay,
  staggerMs: settings.effectiveRevealMotionSettings.staggerMs
}))
const options = computed(() => normalizeAoiRevealOptions({
  delay: props.delay,
  disabled: props.disabled,
  distance: props.distance,
  duration: props.duration,
  index: props.index,
  maxDelay: props.maxDelay,
  once: props.once,
  rootMargin: props.rootMargin,
  stagger: props.stagger,
  threshold: props.threshold,
  variant: props.variant
}, runtimeOptions.value))
const viewport = useAoiInViewport(rootRef, {
  disabled: computed(() => options.value.disabled),
  once: computed(() => options.value.once),
  rootMargin: props.rootMargin,
  threshold: props.threshold
})
const passThroughAttrs = computed(() => {
  const { class: _class, style: _style, ...rest } = attrs

  return rest
})
const revealState = computed(() => {
  if (options.value.disabled || !mounted.value) {
    return "in"
  }

  if (viewport.isIntersecting.value || (options.value.once && viewport.hasIntersected.value)) {
    return "in"
  }

  return "out"
})
const revealStyle = computed(() => createAoiRevealStyle(options.value))

onMounted(() => {
  mounted.value = true
})
</script>

<template>
  <component
    :is="tag"
    ref="rootRef"
    v-bind="passThroughAttrs"
    :class="[attrs.class, { 'aoi-reveal': !options.disabled }]"
    :style="[revealStyle, attrs.style]"
    :data-aoi-reveal="options.disabled ? undefined : 'true'"
    :data-aoi-reveal-ready="!options.disabled && mounted ? 'true' : undefined"
    :data-aoi-reveal-state="!options.disabled && mounted ? revealState : undefined"
    :data-aoi-reveal-variant="!options.disabled ? options.variant : undefined"
  >
    <slot
      :has-intersected="viewport.hasIntersected.value"
      :is-intersecting="viewport.isIntersecting.value"
    />
  </component>
</template>
