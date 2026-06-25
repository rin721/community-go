<script setup lang="ts">
import type { RouteLocationRaw } from "vue-router"
import type { AoiInfoCardDensity, AoiInfoCardLayout, AoiRevealProp } from "~/types/ui"

type LinkTarget = "_blank" | "_parent" | "_self" | "_top" | (string & {})

const props = withDefaults(defineProps<{
  ariaLabel?: string
  as?: string
  density?: AoiInfoCardDensity
  href?: RouteLocationRaw
  interactive?: boolean
  layout?: AoiInfoCardLayout
  reveal?: AoiRevealProp
  selected?: boolean
  target?: LinkTarget | null
  to?: RouteLocationRaw
}>(), {
  ariaLabel: undefined,
  as: "article",
  density: "default",
  href: undefined,
  interactive: false,
  layout: "stack",
  reveal: false,
  selected: false,
  target: undefined,
  to: undefined
})

const slots = useSlots()
const hasLink = computed(() => Boolean(props.to || props.href))
const hasMedia = computed(() => Boolean(slots.media))
const hasMeta = computed(() => Boolean(slots.meta))
</script>

<template>
  <AoiSurface
    :as="props.as"
    class="aoi-info-card"
    :class="[
      `aoi-info-card--${props.layout}`,
      `aoi-info-card--density-${props.density}`,
      {
        'aoi-info-card--has-media': hasMedia,
        'aoi-info-card--has-meta': hasMeta
      }
    ]"
    surface="card"
    padding="none"
    :interactive="props.interactive || hasLink"
    :selected="props.selected"
    :reveal="props.reveal"
  >
    <AoiLink
      v-if="hasLink"
      class="aoi-info-card__main"
      :to="props.to"
      :href="props.href"
      :target="props.target"
      :aria-label="props.ariaLabel"
    >
      <span v-if="$slots.media" class="aoi-info-card__media">
        <slot name="media" />
      </span>
      <span class="aoi-info-card__copy">
        <span v-if="$slots.title" class="aoi-info-card__title">
          <slot name="title" />
        </span>
        <span v-if="$slots.subtitle" class="aoi-info-card__subtitle">
          <slot name="subtitle" />
        </span>
        <span v-if="$slots.description" class="aoi-info-card__description">
          <slot name="description" />
        </span>
        <span v-if="$slots.meta" class="aoi-info-card__meta">
          <slot name="meta" />
        </span>
      </span>
    </AoiLink>

    <span v-else class="aoi-info-card__main">
      <span v-if="$slots.media" class="aoi-info-card__media">
        <slot name="media" />
      </span>
      <span class="aoi-info-card__copy">
        <span v-if="$slots.title" class="aoi-info-card__title">
          <slot name="title" />
        </span>
        <span v-if="$slots.subtitle" class="aoi-info-card__subtitle">
          <slot name="subtitle" />
        </span>
        <span v-if="$slots.description" class="aoi-info-card__description">
          <slot name="description" />
        </span>
        <span v-if="$slots.meta" class="aoi-info-card__meta">
          <slot name="meta" />
        </span>
      </span>
    </span>

    <div v-if="$slots.actions" class="aoi-info-card__actions">
      <slot name="actions" />
    </div>
  </AoiSurface>
</template>

<style scoped>
.aoi-info-card {
  --aoi-info-card-media-size: 48px;
  --aoi-info-card-padding: 14px;
  --aoi-info-card-gap: 12px;

  display: flex;
  min-width: 0;
  align-items: stretch;
  justify-content: space-between;
  gap: var(--aoi-info-card-gap);
  overflow: hidden;
}

.aoi-info-card--density-compact {
  --aoi-info-card-media-size: 42px;
  --aoi-info-card-padding: 9px;
  --aoi-info-card-gap: 9px;
}

.aoi-info-card__main {
  display: grid;
  min-width: 0;
  align-items: start;
  flex: 1;
  gap: var(--aoi-info-card-gap);
  color: inherit;
  padding: var(--aoi-info-card-padding);
}

.aoi-info-card--inline.aoi-info-card--has-media .aoi-info-card__main {
  grid-template-columns: var(--aoi-info-card-media-size) minmax(0, 1fr);
}

.aoi-info-card__media {
  display: grid;
  min-width: 0;
  place-items: center;
}

.aoi-info-card__copy {
  display: grid;
  min-width: 0;
  gap: 5px;
}

.aoi-info-card__title {
  overflow: hidden;
  color: var(--aoi-text);
  font-weight: 800;
  text-overflow: ellipsis;
}

.aoi-info-card__subtitle,
.aoi-info-card__description,
.aoi-info-card__meta {
  color: var(--aoi-text-muted);
  font-size: 12px;
}

.aoi-info-card__description {
  display: -webkit-box;
  overflow: hidden;
  line-height: 1.6;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.aoi-info-card__meta {
  display: flex;
  min-width: 0;
  flex-wrap: wrap;
  gap: 8px 12px;
}

.aoi-info-card__actions {
  display: flex;
  align-items: center;
  flex: 0 0 auto;
  gap: 8px;
  padding: var(--aoi-info-card-padding);
  padding-left: 0;
}

.aoi-info-card.aoi-surface--interactive:hover {
  box-shadow: var(--aoi-shadow-md);
  transform: translate3d(0, -4px, 0);
}

.aoi-info-card--density-compact.aoi-surface--interactive:hover {
  box-shadow: var(--aoi-shadow-sm);
  transform: translate3d(0, -1px, 0);
}

@media (max-width: 639px) {
  .aoi-info-card {
    flex-direction: column;
  }

  .aoi-info-card__actions {
    justify-content: flex-end;
    padding-top: 0;
    padding-left: var(--aoi-info-card-padding);
  }
}

@media (prefers-reduced-motion: reduce) {
  .aoi-info-card.aoi-surface--interactive:hover {
    transform: none;
  }
}
</style>
