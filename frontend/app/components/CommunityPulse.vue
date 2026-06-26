<script setup lang="ts">
import type { CommunityDynamicItem } from "~/types/api"

const props = withDefaults(defineProps<{
  description?: string
  emptyDescription?: string
  emptyTitle?: string
  items: CommunityDynamicItem[]
  title: string
}>(), {
  description: undefined,
  emptyDescription: undefined,
  emptyTitle: undefined
})

const { locale, t } = useI18n()

function authorName(item: CommunityDynamicItem) {
  return item.author?.displayName || item.authorName || t("dynamics.anonymousAuthor")
}

function authorHandle(item: CommunityDynamicItem) {
  return item.author?.handle || ""
}

function authorInitial(item: CommunityDynamicItem) {
  return authorName(item).slice(0, 1).toUpperCase()
}

function videoRoute(item: CommunityDynamicItem) {
  if (!item.video) {
    return ""
  }
  return `/video/${item.video.slug || item.video.id}`
}

function formatDate(value: string) {
  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return value
  }

  return new Intl.DateTimeFormat(locale.value, {
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    month: "short"
  }).format(date)
}
</script>

<template>
  <AoiSection
    icon="sparkles"
    :title="props.title"
    :description="props.description"
    :count="props.items.length"
    title-id="community-pulse-title"
  >
    <div v-if="props.items.length" class="community-pulse" role="list">
      <article
        v-for="(item, index) in props.items"
        :key="item.id"
        v-aoi-reveal="'rise'"
        class="community-pulse__card"
        role="listitem"
        :style="{ '--aoi-pulse-index': index }"
      >
        <header class="community-pulse__header">
          <AoiLink
            v-if="authorHandle(item)"
            class="community-pulse__author"
            :to="`/u/${authorHandle(item)}`"
          >
            <span class="community-pulse__avatar" aria-hidden="true">{{ authorInitial(item) }}</span>
            <span class="community-pulse__author-copy">
              <strong>{{ authorName(item) }}</strong>
              <span>@{{ authorHandle(item) }}</span>
            </span>
          </AoiLink>
          <span v-else class="community-pulse__author">
            <span class="community-pulse__avatar" aria-hidden="true">{{ authorInitial(item) }}</span>
            <span class="community-pulse__author-copy">
              <strong>{{ authorName(item) }}</strong>
              <span>{{ t("dynamics.anonymousAuthor") }}</span>
            </span>
          </span>
          <time class="community-pulse__time" :datetime="item.createdAt">{{ formatDate(item.createdAt) }}</time>
        </header>

        <p class="community-pulse__body">{{ item.body }}</p>

        <AoiLink
          v-if="item.video"
          class="community-pulse__video"
          :to="videoRoute(item)"
          :aria-label="t('dynamics.openVideoAria', { title: item.video.title })"
        >
          <span class="community-pulse__video-mark" aria-hidden="true">
            <AoiIcon name="play" :size="14" decorative />
          </span>
          <span class="community-pulse__video-copy">
            <span>{{ t("dynamics.linkedVideo") }}</span>
            <strong>{{ item.video.title }}</strong>
          </span>
        </AoiLink>
      </article>
    </div>

    <PageState
      v-else
      icon="message-circle"
      :title="props.emptyTitle || t('dynamics.emptyTitle')"
      :description="props.emptyDescription || t('dynamics.emptyDescription')"
    />
  </AoiSection>
</template>

<style scoped>
.community-pulse {
  display: grid;
  min-width: 0;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: var(--aoi-grid-gap-compact);
}

.community-pulse__card {
  position: relative;
  display: grid;
  min-width: 0;
  gap: 12px;
  overflow: hidden;
  border: 1px solid color-mix(in srgb, var(--aoi-surface-border) 42%, transparent);
  border-radius: var(--aoi-radius-card);
  background:
    linear-gradient(135deg, color-mix(in srgb, var(--aoi-accent-10) 44%, transparent), transparent 44%),
    color-mix(in srgb, var(--aoi-card-bg) 72%, transparent);
  padding: 14px;
  box-shadow: 0 12px 32px rgba(33, 33, 33, 0.035);
  transition:
    border-color var(--aoi-motion-fast) var(--aoi-ease-out),
    box-shadow var(--aoi-motion-fast) var(--aoi-ease-out),
    transform var(--aoi-motion-fast) var(--aoi-ease-out);
}

.community-pulse__card:hover {
  border-color: color-mix(in srgb, var(--aoi-surface-border-hover) 52%, transparent);
  box-shadow: 0 16px 40px rgba(33, 33, 33, 0.05);
  transform: translateY(-2px);
}

.community-pulse__header,
.community-pulse__author {
  display: flex;
  min-width: 0;
  align-items: center;
}

.community-pulse__header {
  justify-content: space-between;
  gap: 10px;
}

.community-pulse__author {
  gap: 9px;
  text-align: left;
}

.community-pulse__avatar {
  display: grid;
  width: 34px;
  height: 34px;
  place-items: center;
  border: 1px solid color-mix(in srgb, var(--aoi-accent-60) 28%, transparent);
  border-radius: var(--aoi-radius-control);
  background: var(--aoi-sakura-10);
  color: var(--aoi-accent-60);
  flex: 0 0 auto;
  font-weight: 850;
}

.community-pulse__author-copy {
  display: grid;
  min-width: 0;
  gap: 2px;
}

.community-pulse__author-copy strong,
.community-pulse__video-copy strong {
  min-width: 0;
  color: var(--aoi-text);
  overflow-wrap: anywhere;
}

.community-pulse__author-copy span,
.community-pulse__time,
.community-pulse__video-copy span {
  color: var(--aoi-text-muted);
  font-size: 12px;
}

.community-pulse__time {
  flex: 0 0 auto;
  font-variant-numeric: tabular-nums;
}

.community-pulse__body {
  margin: 0;
  color: var(--aoi-text);
  font-size: 14px;
  line-height: 1.75;
  overflow-wrap: anywhere;
  text-wrap: pretty;
}

.community-pulse__video {
  display: grid;
  min-width: 0;
  grid-template-columns: auto minmax(0, 1fr);
  align-items: center;
  gap: 9px;
  border: 1px solid color-mix(in srgb, var(--aoi-surface-border) 42%, transparent);
  border-radius: var(--aoi-radius-control);
  background: color-mix(in srgb, var(--aoi-surface-solid) 52%, transparent);
  padding: 9px;
}

.community-pulse__video-mark {
  display: grid;
  width: 28px;
  height: 28px;
  place-items: center;
  border-radius: var(--aoi-radius-control);
  background: var(--aoi-accent-60);
  color: #fff;
}

.community-pulse__video-copy {
  display: grid;
  min-width: 0;
  gap: 2px;
}

@media (max-width: 639px) {
  .community-pulse {
    grid-template-columns: minmax(0, 1fr);
  }

  .community-pulse__card {
    padding: 12px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .community-pulse__card:hover {
    transform: none;
  }
}
</style>
