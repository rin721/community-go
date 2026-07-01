<script setup lang="ts">
type MdRippleElement = HTMLElement & {
  attach?: (control: HTMLElement) => void
  detach?: () => void
}

const ripple = ref<MdRippleElement | null>(null)

onMounted(async () => {
  if (!import.meta.client) {
    return
  }

  await customElements.whenDefined("md-ripple")
  await nextTick()

  const control = ripple.value?.parentElement

  if (control) {
    ripple.value?.attach?.(control)
  }
})

onBeforeUnmount(() => {
  ripple.value?.detach?.()
})
</script>

<template>
  <md-ripple ref="ripple" class="aoi-ripple" />
</template>

<style scoped>
.aoi-ripple {
  position: absolute;
  inset: 0;
  z-index: var(--aoi-ripple-z-index, 0);
  border-radius: inherit;
  pointer-events: none;
  --md-ripple-hover-color: currentColor;
  --md-ripple-hover-opacity: 0.08;
  --md-ripple-pressed-color: currentColor;
  --md-ripple-pressed-opacity: 0.12;
}
</style>
