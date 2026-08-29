<script setup lang="ts">
import type { AoiRevealProp } from "~/types/ui"

const props = withDefaults(defineProps<{
  code?: string
  fallback?: string
  label?: string
  reveal?: AoiRevealProp
  scrollNative?: boolean
}>(), {
  code: "",
  fallback: "",
  label: undefined,
  reveal: false,
  scrollNative: true
})
</script>

<template>
  <pre
    v-aoi-reveal="props.reveal"
    v-aoi-scroll-native="props.scrollNative"
    class="aoi-code-block"
    tabindex="0"
    :aria-label="props.label"
  ><code>{{ props.code || props.fallback }}</code></pre>
</template>

<style scoped>
.aoi-code-block {
  overflow: auto;
  max-height: min(52vh, 520px);
  margin: 0;
  border: 1px solid var(--aoi-border);
  border-radius: var(--aoi-radius-card);
  background: var(--aoi-bg);
  color: var(--aoi-text);
  font-size: 12px;
  line-height: 1.55;
  padding: 12px;
}

.aoi-code-block:focus-visible {
  outline: var(--aoi-focus-ring-width) solid var(--aoi-focus);
  outline-offset: var(--aoi-focus-ring-offset);
}
</style>
