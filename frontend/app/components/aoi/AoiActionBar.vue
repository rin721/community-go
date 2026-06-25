<script setup lang="ts">
import type { AoiRevealProp } from "~/types/ui"

const props = withDefaults(defineProps<{
  align?: "start" | "center" | "end" | "between"
  as?: string
  label?: string
  reveal?: AoiRevealProp
  size?: "sm" | "md"
  surface?: boolean
  wrap?: boolean
}>(), {
  align: "start",
  as: "div",
  label: undefined,
  reveal: false,
  size: "md",
  surface: false,
  wrap: true
})
</script>

<template>
  <component
    :is="props.as"
    v-aoi-reveal="props.reveal"
    class="aoi-action-bar"
    :class="[
      `aoi-action-bar--${props.align}`,
      `aoi-action-bar--${props.size}`,
      {
        'aoi-action-bar--surface': props.surface,
        'aoi-action-bar--nowrap': !props.wrap
      }
    ]"
    :role="props.label ? 'toolbar' : undefined"
    :aria-label="props.label"
  >
    <slot />
  </component>
</template>

<style scoped>
.aoi-action-bar {
  display: flex;
  min-width: 0;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
}

.aoi-action-bar--sm {
  gap: 6px;
}

.aoi-action-bar--center {
  justify-content: center;
}

.aoi-action-bar--end {
  justify-content: flex-end;
}

.aoi-action-bar--between {
  justify-content: space-between;
}

.aoi-action-bar--nowrap {
  flex-wrap: nowrap;
}

.aoi-action-bar--surface {
  border: 1px solid var(--aoi-border);
  border-radius: var(--aoi-radius-card);
  background: var(--aoi-surface);
  padding: 4px;
}
</style>
