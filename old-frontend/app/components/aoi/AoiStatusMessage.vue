<script setup lang="ts">
import type { AoiFeedbackIntent } from "~/types/ui"

const props = withDefaults(defineProps<{
  as?: string
  icon?: string
  message?: string
  intent?: AoiFeedbackIntent
}>(), {
  as: "p",
  icon: undefined,
  message: undefined,
  intent: "info"
})
</script>

<template>
  <component
    :is="props.as"
    v-if="props.message || $slots.default"
    class="aoi-status-message"
    :class="`aoi-status-message--${props.intent}`"
  >
    <AoiIcon v-if="props.icon" :name="props.icon" :size="15" decorative />
    <slot>{{ props.message }}</slot>
  </component>
</template>

<style scoped>
.aoi-status-message {
  display: flex;
  align-items: flex-start;
  gap: 6px;
  margin: 0;
  border: 1px solid var(--aoi-border);
  border-radius: var(--aoi-radius-card);
  min-width: 0;
  overflow-wrap: anywhere;
  line-height: 1.7;
  padding: 10px 12px;
  word-break: break-word;
}

.aoi-status-message--success {
  border-color: var(--aoi-intent-success-border);
  background: var(--aoi-intent-success-soft-bg);
  color: var(--aoi-intent-success-color);
}

.aoi-status-message--danger {
  border-color: var(--aoi-intent-danger-border);
  background: var(--aoi-intent-danger-soft-bg);
  color: var(--aoi-intent-danger-color);
}

.aoi-status-message--warning {
  border-color: var(--aoi-intent-warning-border);
  background: var(--aoi-intent-warning-soft-bg);
  color: var(--aoi-intent-warning-color);
}

.aoi-status-message--info {
  border-color: var(--aoi-intent-info-border);
  background: var(--aoi-intent-info-soft-bg);
  color: var(--aoi-intent-info-color);
}
</style>
