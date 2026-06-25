<script setup lang="ts">
import type { AoiFeedbackIntent } from "~/types/ui"

const props = withDefaults(defineProps<{
  icon?: string
  intent?: AoiFeedbackIntent
  title?: string
}>(), {
  icon: undefined,
  intent: "info",
  title: undefined
})

const resolvedIcon = computed(() => props.icon || {
  danger: "circle-alert",
  info: "info",
  success: "circle-check",
  warning: "triangle-alert"
}[props.intent])
</script>

<template>
  <AoiSurface
    class="docs-callout"
    surface="state"
    padding="md"
    :tone="props.intent"
  >
    <AoiIcon :name="resolvedIcon" :size="18" decorative />
    <div class="docs-callout__copy">
      <strong v-if="props.title">{{ props.title }}</strong>
      <div class="docs-callout__body">
        <slot />
      </div>
    </div>
  </AoiSurface>
</template>

<style scoped>
.docs-callout {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: 10px;
  margin: 18px 0;
}

.docs-callout__copy {
  display: grid;
  min-width: 0;
  gap: 5px;
}

.docs-callout__copy strong {
  color: var(--aoi-text);
}

.docs-callout__body {
  color: var(--aoi-text-muted);
  line-height: 1.75;
}

.docs-callout__body :deep(p) {
  margin: 0;
}
</style>
