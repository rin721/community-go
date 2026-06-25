<script setup lang="ts">
import type { AoiLayoutMode, AoiRevealProp } from "~/types/ui"

const props = withDefaults(defineProps<{
  as?: string
  count?: number | string
  description?: string
  eyebrow?: string
  icon?: string
  layout?: AoiLayoutMode
  level?: 2 | 3 | 4
  reveal?: AoiRevealProp
  title?: string
  titleId?: string
}>(), {
  as: "section",
  count: undefined,
  description: undefined,
  eyebrow: undefined,
  icon: undefined,
  layout: "stack",
  level: 2,
  reveal: "rise",
  title: undefined,
  titleId: undefined
})

const headingTag = computed(() => `h${props.level}`)
const resolvedTitleId = computed(() => props.titleId || undefined)
</script>

<template>
  <component
    :is="props.as"
    v-aoi-reveal="props.reveal"
    class="aoi-section"
    :class="`aoi-section--${props.layout}`"
    :aria-labelledby="resolvedTitleId"
  >
    <header v-if="props.title || props.description || $slots.title || $slots.actions" class="aoi-section__header">
      <span v-if="props.icon" class="aoi-section__icon" aria-hidden="true">
        <AoiIcon :name="props.icon" :size="18" decorative />
      </span>
      <div class="aoi-section__copy">
        <p v-if="props.eyebrow" class="aoi-section__eyebrow">{{ props.eyebrow }}</p>
        <component :is="headingTag" v-if="props.title || $slots.title" :id="resolvedTitleId" class="aoi-section__title">
          <slot name="title">{{ props.title }}</slot>
          <span v-if="props.count !== undefined" class="aoi-section__count">{{ props.count }}</span>
        </component>
        <p v-if="props.description" class="aoi-section__description">{{ props.description }}</p>
      </div>
      <div v-if="$slots.actions" class="aoi-section__actions">
        <slot name="actions" />
      </div>
    </header>

    <slot />
  </component>
</template>

<style scoped>
.aoi-section {
  display: grid;
  min-width: 0;
  gap: var(--aoi-grid-gap);
}

.aoi-section--inline {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
}

.aoi-section--grid {
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
}

.aoi-section--split {
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: start;
}

.aoi-section__header {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  gap: var(--aoi-grid-gap-compact);
  align-items: start;
}

.aoi-section__icon {
  display: inline-grid;
  width: 34px;
  height: 34px;
  place-items: center;
  border-radius: var(--aoi-radius-round);
  background: var(--aoi-accent-10);
  color: var(--aoi-accent-60);
}

.aoi-section__copy {
  display: grid;
  min-width: 0;
  gap: max(4px, calc(var(--aoi-grid-gap-compact) - 8px));
}

.aoi-section__eyebrow,
.aoi-section__title,
.aoi-section__description {
  margin: 0;
}

.aoi-section__eyebrow {
  color: var(--aoi-active-color);
  font-size: 12px;
  font-weight: 800;
}

.aoi-section__title {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 8px;
  color: var(--aoi-text);
  font-size: 18px;
  line-height: 1.25;
}

.aoi-section__description {
  color: var(--aoi-text-muted);
  line-height: 1.7;
}

.aoi-section__count {
  display: inline-flex;
  min-width: 28px;
  min-height: 22px;
  align-items: center;
  justify-content: center;
  border-radius: var(--aoi-radius-control);
  background: var(--aoi-accent-60);
  color: #fff;
  font-size: 12px;
  font-variant-numeric: tabular-nums;
  padding: 0 7px;
}

.aoi-section__actions {
  display: inline-flex;
  flex-wrap: wrap;
  gap: var(--aoi-grid-gap-compact);
  justify-content: flex-end;
}

@media (max-width: 639px) {
  .aoi-section--split,
  .aoi-section__header {
    grid-template-columns: 1fr;
  }

  .aoi-section__actions {
    justify-content: flex-start;
  }
}
</style>
