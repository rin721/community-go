<script setup lang="ts">
defineOptions({
  inheritAttrs: false
})

const props = withDefaults(defineProps<{
  alt?: string
  aspectRatio?: string
  eager?: boolean
  rootMargin?: string
  src?: string | null
  threshold?: number
}>(), {
  alt: "",
  aspectRatio: "16 / 9",
  eager: false,
  rootMargin: "200px 0px",
  src: null,
  threshold: 0
})

const attrs = useAttrs()
const rootRef = ref<Element | null>(null)
const loaded = ref(false)
const failed = ref(false)
const passthroughAttrs = computed(() => {
  const {
    class: _class,
    style: _style,
    ...rest
  } = attrs

  return rest
})
const viewport = useAoiInViewport(rootRef, {
  disabled: computed(() => props.eager),
  once: true,
  rootMargin: props.rootMargin,
  threshold: props.threshold
})

const isGradientSource = computed(() => Boolean(props.src?.startsWith("gradient:")))
const shouldLoad = computed(() => props.eager || (import.meta.client && viewport.hasIntersected.value))
const imageSrc = computed(() => {
  if (!shouldLoad.value || !props.src || isGradientSource.value || failed.value) {
    return undefined
  }

  return props.src
})
const gradient = computed(() => gradientForSource(props.src))
const rootStyle = computed(() => [
  attrs.style,
  {
    "--aoi-lazy-image-gradient": gradient.value,
    aspectRatio: props.aspectRatio
  }
])

watch(() => props.src, () => {
  loaded.value = false
  failed.value = false
})

function onLoad() {
  loaded.value = true
}

function onError() {
  failed.value = true
  loaded.value = false
}

function gradientForSource(source?: string | null) {
  const gradients = [
    "linear-gradient(135deg, #6de5e5, #5b8def 48%, #f2709c)",
    "linear-gradient(135deg, #f7b955, #d9f7cc 48%, #65d5e4)",
    "linear-gradient(135deg, #7a68f0, #22b8cf 48%, #151c33)",
    "linear-gradient(135deg, #c9f3f7, #8fc7ff 45%, #f7d3df)",
    "linear-gradient(135deg, #17262b, #216d7d 48%, #f2709c)",
    "linear-gradient(135deg, #fff6fb, #f2709c 45%, #22b8cf)"
  ]

  if (!source) {
    return gradients[0]
  }

  let hash = 0

  for (const char of source) {
    hash = (hash * 31 + char.charCodeAt(0)) >>> 0
  }

  return gradients[hash % gradients.length]
}
</script>

<template>
  <span
    v-bind="passthroughAttrs"
    ref="rootRef"
    class="aoi-lazy-image"
    :class="[
      attrs.class,
      {
        'aoi-lazy-image--loaded': loaded,
        'aoi-lazy-image--fallback': !imageSrc || failed || isGradientSource
      }
    ]"
    :style="rootStyle"
    :data-aoi-lazy-state="shouldLoad ? 'loaded' : 'pending'"
  >
    <span class="aoi-lazy-image__fallback" aria-hidden="true" />
    <img
      v-if="imageSrc"
      class="aoi-lazy-image__img"
      :src="imageSrc"
      :alt="alt"
      loading="lazy"
      decoding="async"
      fetchpriority="low"
      @load="onLoad"
      @error="onError"
    >
  </span>
</template>

<style scoped>
.aoi-lazy-image {
  position: relative;
  display: block;
  min-width: 0;
  overflow: hidden;
  background:
    linear-gradient(135deg, rgba(255, 255, 255, .2), transparent 45%),
    var(--aoi-lazy-image-gradient);
  contain: paint;
}

.aoi-lazy-image__fallback,
.aoi-lazy-image__img {
  position: absolute;
  inset: 0;
  display: block;
  width: 100%;
  height: 100%;
}

.aoi-lazy-image__fallback {
  background:
    linear-gradient(135deg, rgba(255, 255, 255, .2), transparent 45%),
    var(--aoi-lazy-image-gradient);
}

.aoi-lazy-image__img {
  object-fit: cover;
  opacity: 0;
  transition: opacity var(--aoi-motion-base) var(--aoi-ease-out);
}

.aoi-lazy-image--loaded .aoi-lazy-image__img {
  opacity: 1;
}

@media (prefers-reduced-motion: reduce) {
  .aoi-lazy-image__img {
    transition-duration: 1ms;
  }
}
</style>
