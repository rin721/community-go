<script setup lang="ts">
const props = withDefaults(defineProps<{
  disabled?: boolean
  rootMargin?: string
  tag?: string
  threshold?: number
}>(), {
  disabled: false,
  rootMargin: "200px 0px",
  tag: "div",
  threshold: 0
})

const rootRef = ref<Element | null>(null)
const viewport = useAoiInViewport(rootRef, {
  disabled: computed(() => props.disabled),
  once: true,
  rootMargin: props.rootMargin,
  threshold: props.threshold
})
const shouldRender = computed(() => props.disabled || (import.meta.client && viewport.hasIntersected.value))
</script>

<template>
  <component
    :is="tag"
    ref="rootRef"
    class="aoi-lazy-mount"
    :data-aoi-lazy-state="shouldRender ? 'loaded' : 'pending'"
  >
    <slot
      v-if="shouldRender"
      :has-intersected="viewport.hasIntersected.value"
      :is-intersecting="viewport.isIntersecting.value"
    />
    <slot
      v-else
      name="placeholder"
      :has-intersected="viewport.hasIntersected.value"
      :is-intersecting="viewport.isIntersecting.value"
    />
  </component>
</template>
