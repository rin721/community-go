<script setup lang="ts">
import type { AoiActionVariant, AoiTone } from "~/types/ui"

const props = withDefaults(defineProps<{
  variant?: Extract<AoiActionVariant, "outlined" | "plain" | "tonal">
  icon?: string
  tone?: AoiTone
  size?: "sm" | "md"
}>(), {
  variant: "outlined",
  icon: undefined,
  tone: "muted",
  size: "sm",
})
</script>

<template>
  <span
    class="aoi-meta-pill"
    :class="[
      `aoi-meta-pill--${props.size}`,
      `aoi-meta-pill--${props.variant}`,
      `aoi-meta-pill--tone-${props.tone}`
    ]"
  >
    <AoiIcon v-if="props.icon" :name="props.icon" :size="props.size === 'sm' ? 14 : 16" decorative />
    <slot />
  </span>
</template>

<style scoped>
.aoi-meta-pill {
  display: inline-flex;
  width: fit-content;
  max-width: 100%;
  align-items: center;
  gap: 5px;
  border: 1px solid var(--aoi-border);
  border-radius: var(--aoi-radius-control);
  background: var(--aoi-surface);
  color: var(--aoi-pill-color, var(--aoi-intent-secondary-color));
  font-weight: 760;
  line-height: 1.25;
}

.aoi-meta-pill--sm {
  min-height: 26px;
  font-size: 12px;
  padding: 4px 8px;
}

.aoi-meta-pill--md {
  min-height: 32px;
  font-size: 13px;
  padding: 5px 10px;
}

.aoi-meta-pill--tone-accent {
  --aoi-pill-color: var(--aoi-intent-primary-color);
  --aoi-pill-bg: var(--aoi-intent-primary-soft-bg);
  --aoi-pill-border: var(--aoi-intent-primary-border);
}

.aoi-meta-pill--tone-muted {
  --aoi-pill-color: var(--aoi-intent-secondary-color);
  --aoi-pill-bg: var(--aoi-intent-secondary-soft-bg);
  --aoi-pill-border: var(--aoi-intent-secondary-border);
}

.aoi-meta-pill--tone-neutral {
  --aoi-pill-color: var(--aoi-intent-neutral-color);
  --aoi-pill-bg: var(--aoi-intent-neutral-soft-bg);
  --aoi-pill-border: var(--aoi-intent-neutral-border);
}

.aoi-meta-pill--tone-success {
  --aoi-pill-color: var(--aoi-intent-success-color);
  --aoi-pill-bg: var(--aoi-intent-success-soft-bg);
  --aoi-pill-border: var(--aoi-intent-success-border);
}

.aoi-meta-pill--tone-warning {
  --aoi-pill-color: var(--aoi-intent-warning-color);
  --aoi-pill-bg: var(--aoi-intent-warning-soft-bg);
  --aoi-pill-border: var(--aoi-intent-warning-border);
}

.aoi-meta-pill--tone-danger {
  --aoi-pill-color: var(--aoi-intent-danger-color);
  --aoi-pill-bg: var(--aoi-intent-danger-soft-bg);
  --aoi-pill-border: var(--aoi-intent-danger-border);
}

.aoi-meta-pill--tone-info {
  --aoi-pill-color: var(--aoi-intent-info-color);
  --aoi-pill-bg: var(--aoi-intent-info-soft-bg);
  --aoi-pill-border: var(--aoi-intent-info-border);
}

.aoi-meta-pill--tonal {
  border-color: transparent;
  background: var(--aoi-pill-bg);
}

.aoi-meta-pill--outlined {
  border-color: var(--aoi-pill-border);
}

.aoi-meta-pill--plain {
  border-color: transparent;
  background: transparent;
}
</style>
