<script setup lang="ts">
import type { AoiRevealProp, AoiSurfaceKind, AoiSurfacePadding, AoiTone } from "~/types/ui"

const props = withDefaults(defineProps<{
  as?: string
  interactive?: boolean
  padding?: AoiSurfacePadding
  reveal?: AoiRevealProp
  selected?: boolean
  surface?: AoiSurfaceKind
  tone?: AoiTone
}>(), {
  as: "div",
  interactive: false,
  padding: "md",
  reveal: false,
  selected: false,
  surface: "card",
  tone: "neutral"
})
</script>

<template>
  <component
    :is="props.as"
    v-aoi-reveal="props.reveal"
    class="aoi-surface"
    :class="[
      `aoi-surface--${props.surface}`,
      `aoi-surface--tone-${props.tone}`,
      `aoi-surface--padding-${props.padding}`,
      {
        'aoi-surface--interactive': props.interactive,
        'aoi-surface--selected': props.selected
      }
    ]"
  >
    <slot />
  </component>
</template>

<style scoped>
.aoi-surface {
  min-width: 0;
  --aoi-surface-intent-bg: var(--aoi-intent-neutral-soft-bg);
  --aoi-surface-intent-bg-hover: var(--aoi-intent-neutral-soft-bg-hover);
  --aoi-surface-intent-border: var(--aoi-intent-neutral-border);
  color: var(--aoi-text);
}

.aoi-surface--plain {
  background: transparent;
}

.aoi-surface--panel,
.aoi-surface--card,
.aoi-surface--state,
.aoi-surface--code,
.aoi-surface--toolbar {
  border: 1px solid color-mix(in srgb, var(--aoi-surface-border) 16%, transparent);
  box-shadow: 0 8px 24px rgba(33, 33, 33, 0.018);
}

.aoi-surface--panel {
  border-radius: var(--aoi-radius-container);
  background: color-mix(in srgb, var(--aoi-panel-bg) 68%, transparent);
}

.aoi-surface--card,
.aoi-surface--state,
.aoi-surface--toolbar {
  border-radius: var(--aoi-radius-card);
  background: color-mix(in srgb, var(--aoi-card-bg) 74%, transparent);
}

.aoi-surface--state {
  background: var(--aoi-surface);
}

.aoi-surface--code {
  overflow: hidden;
  border-radius: var(--aoi-radius-card);
  background: var(--aoi-bg);
}

.aoi-surface--toolbar {
  background: var(--aoi-surface);
}

.aoi-surface--padding-none {
  padding: 0;
}

.aoi-surface--padding-sm {
  padding: 10px;
}

.aoi-surface--padding-md {
  padding: var(--aoi-card-padding);
}

.aoi-surface--padding-lg {
  padding: var(--aoi-panel-padding);
}

.aoi-surface--tone-accent {
  --aoi-surface-intent-bg: color-mix(in srgb, var(--aoi-intent-primary-soft-bg) 70%, var(--aoi-card-bg));
  --aoi-surface-intent-bg-hover: var(--aoi-intent-primary-soft-bg-hover);
  --aoi-surface-intent-border: var(--aoi-intent-primary-border);
  border-color: var(--aoi-surface-intent-border);
  background: var(--aoi-surface-intent-bg);
}

.aoi-surface--tone-danger {
  --aoi-surface-intent-bg: color-mix(in srgb, var(--aoi-intent-danger-soft-bg) 70%, var(--aoi-card-bg));
  --aoi-surface-intent-bg-hover: var(--aoi-intent-danger-soft-bg-hover);
  --aoi-surface-intent-border: var(--aoi-intent-danger-border);
  border-color: var(--aoi-surface-intent-border);
}

.aoi-surface--tone-muted {
  background: var(--aoi-surface-muted);
}

.aoi-surface--tone-success,
.aoi-surface--tone-warning,
.aoi-surface--tone-info {
  border-color: var(--aoi-surface-intent-border);
  background: var(--aoi-surface-intent-bg);
}

.aoi-surface--tone-success {
  --aoi-surface-intent-bg: color-mix(in srgb, var(--aoi-intent-success-soft-bg) 70%, var(--aoi-card-bg));
  --aoi-surface-intent-bg-hover: var(--aoi-intent-success-soft-bg-hover);
  --aoi-surface-intent-border: var(--aoi-intent-success-border);
}

.aoi-surface--tone-warning {
  --aoi-surface-intent-bg: color-mix(in srgb, var(--aoi-intent-warning-soft-bg) 70%, var(--aoi-card-bg));
  --aoi-surface-intent-bg-hover: var(--aoi-intent-warning-soft-bg-hover);
  --aoi-surface-intent-border: var(--aoi-intent-warning-border);
}

.aoi-surface--tone-info {
  --aoi-surface-intent-bg: color-mix(in srgb, var(--aoi-intent-info-soft-bg) 70%, var(--aoi-card-bg));
  --aoi-surface-intent-bg-hover: var(--aoi-intent-info-soft-bg-hover);
  --aoi-surface-intent-border: var(--aoi-intent-info-border);
}

.aoi-surface--interactive {
  transition:
    border-color var(--aoi-motion-fast) var(--aoi-ease-out),
    background-color var(--aoi-motion-fast) var(--aoi-ease-out),
    box-shadow var(--aoi-motion-fast) var(--aoi-ease-out),
    transform var(--aoi-motion-fast) var(--aoi-ease-out);
}

.aoi-surface--interactive:hover,
.aoi-surface--selected {
  border-color: color-mix(in srgb, var(--aoi-surface-border-hover) 24%, transparent);
  background: color-mix(in srgb, var(--aoi-surface-intent-bg-hover) 64%, transparent);
}

.aoi-surface--interactive:hover {
  transform: translate3d(0, -1px, 0);
}

@media (prefers-reduced-motion: reduce) {
  .aoi-surface--interactive {
    transition: none;
  }

  .aoi-surface--interactive:hover {
    transform: none;
  }
}
</style>
