<script setup lang="ts">
import type { AoiTagItem } from "~/types/ui"

const props = withDefaults(defineProps<{
  actionsLabel?: string
  commentsLabel?: string
  description?: string | null
  descriptionTitle?: string
  tags?: AoiTagItem[]
  tagsLabel?: string
}>(), {
  actionsLabel: undefined,
  commentsLabel: undefined,
  description: undefined,
  descriptionTitle: undefined,
  tags: () => [],
  tagsLabel: undefined
})
</script>

<template>
  <section v-aoi-reveal="'rise'" class="video-watch-details">
    <AoiSurface v-if="$slots.meta" class="video-watch-details__meta" surface="card" padding="sm">
      <slot name="meta" />
    </AoiSurface>

    <AoiActionBar
      v-if="$slots.actions"
      class="video-watch-details__actions"
      reveal="rise"
      :label="props.actionsLabel"
    >
      <slot name="actions" />
    </AoiActionBar>

    <AoiSurface
      v-if="props.description"
      as="section"
      class="video-watch-details__description"
      surface="card"
      padding="md"
      reveal="fade"
    >
      <h2 v-if="props.descriptionTitle">{{ props.descriptionTitle }}</h2>
      <p>{{ props.description }}</p>
    </AoiSurface>

    <AoiTagList
      v-if="props.tags.length > 0"
      class="video-watch-details__tags"
      :items="props.tags"
      :aria-label="props.tagsLabel"
      prefix="# "
      reveal="fade"
      size="sm"
    />

    <section v-if="$slots.comments" class="video-watch-details__comments" :aria-label="props.commentsLabel">
      <slot name="comments" />
    </section>
  </section>
</template>

<style scoped>
.video-watch-details {
  --aoi-player-accent: var(--aoi-active-color);
  --aoi-player-accent-soft: var(--aoi-state-hover);
  --aoi-player-border: var(--aoi-border);
  --aoi-player-surface: var(--aoi-card-bg);
  --aoi-player-text: var(--aoi-text);
  --aoi-player-text-muted: var(--aoi-text-muted);

  display: grid;
  gap: 14px;
  max-width: min(920px, 100%);
  padding-top: 2px;
}

.video-watch-details__meta,
.video-watch-details__description {
  border-color: var(--aoi-player-border);
  background: var(--aoi-player-surface);
}

.video-watch-details__meta {
  padding: 10px 12px;
}

.video-watch-details__actions :deep(.aoi-button) {
  --md-outlined-button-outline-color: var(--aoi-player-border);
  --md-outlined-button-label-text-color: var(--aoi-player-text-muted);
  --md-outlined-button-icon-color: var(--aoi-player-text-muted);
  --md-outlined-button-hover-label-text-color: var(--aoi-player-accent);
  --md-outlined-button-hover-icon-color: var(--aoi-player-accent);
  --md-filled-tonal-button-container-color: var(--aoi-player-accent-soft);
  --md-filled-tonal-button-label-text-color: var(--aoi-player-accent);
  --md-filled-tonal-button-icon-color: var(--aoi-player-accent);
}

.video-watch-details__description {
  display: grid;
  gap: 8px;
}

.video-watch-details__description h2,
.video-watch-details__description p {
  margin: 0;
}

.video-watch-details__description h2 {
  color: var(--aoi-player-text);
  font-size: 15px;
}

.video-watch-details__description p {
  color: var(--aoi-player-text-muted);
  line-height: 1.75;
}

.video-watch-details__tags :deep(.aoi-tag-list__item) {
  border-color: var(--aoi-player-border);
  background: var(--aoi-player-surface);
  color: var(--aoi-player-accent);
}

.video-watch-details__tags :deep(.aoi-tag-list__item:hover) {
  background: var(--aoi-player-accent-soft);
}

.video-watch-details__comments {
  display: grid;
  gap: 18px;
}

@media (max-width: 639px) {
  .video-watch-details {
    gap: 12px;
  }
}
</style>
