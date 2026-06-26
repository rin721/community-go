<script setup lang="ts">
import type { CategoryTreeNode } from "~/types/api"
import { flattenCategoryTree, getCategoryLeafNodes, getCategorySelfAndDescendants } from "~~/shared/utils/categories"

const api = useAoiApi()
const { locale, t } = useI18n()

const { data, pending, error, refresh } = useAsyncData("category-index", async () => {
  const [categories, videos] = await Promise.all([
    api.listCategories(),
    api.listVideos({ category: "home" })
  ])

  return { categories, videos: videos.items }
}, {
  default: () => ({ categories: [], videos: [] })
})

const dateLocale = computed(() => {
  if (locale.value === "ja") {
    return "ja-JP"
  }
  if (locale.value === "en") {
    return "en-US"
  }
  return "zh-CN"
})
const categories = computed(() => data.value.categories)
const allCategories = computed(() => flattenCategoryTree(categories.value))
const rootCategoryCount = computed(() => categories.value.length)
const childCategoryCount = computed(() => Math.max(allCategories.value.length - rootCategoryCount.value, 0))
const leafCategoryCount = computed(() => getCategoryLeafNodes(categories.value).length)
const indexedVideoCount = computed(() => data.value.videos.length)
const hasCategories = computed(() => categories.value.length > 0)
const sourceLabel = computed(() => pending.value
  ? t("category.indexSourceLoading")
  : t("category.indexSource", {
      categories: formatCount(rootCategoryCount.value),
      videos: formatCount(indexedVideoCount.value)
    }))
const categoryStats = computed(() => [
  {
    description: t("category.stats.rootDescription"),
    icon: "layout-grid",
    label: t("category.stats.root"),
    value: formatCount(rootCategoryCount.value)
  },
  {
    description: t("category.stats.childrenDescription"),
    icon: "git-branch",
    label: t("category.stats.children"),
    value: formatCount(childCategoryCount.value)
  },
  {
    description: t("category.stats.leafDescription"),
    icon: "tag",
    label: t("category.stats.leaf"),
    value: formatCount(leafCategoryCount.value)
  },
  {
    description: t("category.stats.videosDescription"),
    icon: "play-square",
    label: t("category.stats.videos"),
    value: formatCount(indexedVideoCount.value)
  }
])

function countFor(category: CategoryTreeNode) {
  const slug = category.slug

  if (slug === "home") {
    return data.value.videos.length
  }

  const slugs = getCategorySelfAndDescendants(data.value.categories, slug).map((item) => item.slug)

  return data.value.videos.filter((video) => video.categories.some((item) => slugs.includes(item.slug))).length
}

function formatCount(value: number) {
  return new Intl.NumberFormat(dateLocale.value, {
    maximumFractionDigits: 1,
    notation: value >= 1000 ? "compact" : "standard"
  }).format(value)
}

useHead(() => ({
  title: t("category.indexHeadTitle")
}))
</script>

<template>
  <div class="aoi-page category-index-page">
    <section v-aoi-reveal="'rise'" class="category-hero" :aria-label="t('category.indexTitle')">
      <PageHeader
        icon="layout-grid"
        :eyebrow="t('category.indexEyebrow')"
        :title="t('category.indexTitle')"
        :description="t('category.indexDescription')"
      >
        <template #actions>
          <AoiButton tone="accent" variant="tonal" icon="search" to="/search">
            {{ t("category.searchAction") }}
          </AoiButton>
        </template>
      </PageHeader>

      <p class="category-hero__source">
        <AoiIcon name="database" :size="14" decorative />
        {{ sourceLabel }}
      </p>
    </section>

    <AoiStatGrid
      v-if="!pending && !error && hasCategories"
      class="category-index-page__stats"
      :items="categoryStats"
      :columns="4"
      reveal="fade"
    />

    <section
      v-if="pending"
      class="category-loading"
      :aria-label="t('category.loadingTitle')"
      aria-live="polite"
    >
      <span class="category-loading__sr">
        {{ t("category.loadingTitle") }}. {{ t("category.loadingDescription") }}
      </span>
      <div class="category-loading__header" aria-hidden="true">
        <span class="category-loading__line category-loading__line--title" />
        <span class="category-loading__line" />
      </div>
      <div class="category-loading__cards" aria-hidden="true">
        <span v-for="item in 8" :key="item" class="category-loading__card" />
      </div>
    </section>

    <PageState
      v-else-if="error"
      icon="circle-alert"
      :title="t('category.errorTitle')"
      :description="t('category.errorDescription')"
      action-icon="refresh-cw"
      :action-label="t('category.retry')"
      @action="refresh()"
    />

    <PageState
      v-else-if="!hasCategories"
      icon="folder-x"
      :title="t('category.emptyTitle')"
      :description="t('category.emptyDescription')"
    />

    <AoiSection
      v-else
      class="category-index-page__results"
      :title="t('category.indexSectionsTitle')"
      :description="t('category.indexSectionsDescription')"
      :count="rootCategoryCount"
      title-id="category-index-title"
      :reveal="false"
    >
      <AoiReveal
        v-for="(category, index) in categories"
        :key="category.id"
        :index="index"
      >
        <section class="category-tree-group">
          <CategoryCard
            :category="category"
            :count="countFor(category)"
          />

          <AoiContentGrid
            v-if="category.children.length"
            min-width="220px"
            gap="compact"
            :mobile-columns="1"
          >
            <CategoryCard
              v-for="child in category.children"
              :key="child.id"
              :category="child"
              :count="countFor(child)"
            />
          </AoiContentGrid>
        </section>
      </AoiReveal>
    </AoiSection>
  </div>
</template>

<style scoped>
.category-index-page {
  display: grid;
  gap: 18px;
}

.category-hero {
  position: relative;
  display: grid;
  min-width: 0;
  gap: 14px;
  overflow: hidden;
  border: 1px solid var(--aoi-surface-border);
  border-radius: var(--aoi-radius-sm);
  background:
    linear-gradient(135deg, color-mix(in srgb, var(--aoi-accent-10) 72%, transparent), transparent 46%),
    linear-gradient(180deg, color-mix(in srgb, var(--aoi-surface-solid) 88%, transparent), var(--aoi-surface));
  box-shadow: var(--aoi-shadow-sm);
  padding: 18px;
}

.category-hero :deep(.page-header) {
  margin: 0;
}

.category-hero :deep(.page-header__description) {
  max-width: 780px;
  text-wrap: pretty;
}

.category-hero__source {
  display: inline-flex;
  width: fit-content;
  max-width: 100%;
  align-items: center;
  gap: 6px;
  border: 1px solid var(--aoi-surface-border);
  border-radius: var(--aoi-radius-round);
  background: color-mix(in srgb, var(--aoi-surface-solid) 76%, transparent);
  color: var(--aoi-text-muted);
  font-size: 12px;
  font-weight: 760;
  line-height: 1.5;
  margin: 0;
  overflow-wrap: anywhere;
  padding: 6px 10px;
}

.category-index-page__stats,
.category-index-page__results {
  min-width: 0;
}

.category-tree-group {
  display: grid;
  gap: var(--aoi-grid-gap-compact);
}

.category-loading {
  position: relative;
  display: grid;
  gap: 16px;
  overflow: hidden;
  border: 1px solid var(--aoi-border);
  border-radius: var(--aoi-radius-sm);
  background: var(--aoi-surface);
  box-shadow: var(--aoi-shadow-sm);
  padding: 18px;
}

.category-loading__sr {
  position: absolute;
  overflow: hidden;
  width: 1px;
  height: 1px;
  padding: 0;
  border: 0;
  clip: rect(0 0 0 0);
  white-space: nowrap;
}

.category-loading__header {
  display: grid;
  gap: 10px;
}

.category-loading__line,
.category-loading__card {
  background: linear-gradient(110deg, var(--aoi-accent-10), var(--aoi-surface-muted), var(--aoi-accent-10));
  background-size: 200% 100%;
  animation: category-loading-shimmer 1.2s var(--aoi-ease-out) infinite;
}

.category-loading__line {
  display: block;
  width: min(100%, 640px);
  height: 10px;
  border-radius: var(--aoi-radius-round);
}

.category-loading__line--title {
  width: min(52%, 320px);
  height: 18px;
}

.category-loading__cards {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: var(--aoi-grid-gap-compact);
}

.category-loading__card {
  min-height: 104px;
  border-radius: var(--aoi-radius-sm);
}

@media (max-width: 900px) {
  .category-loading__cards {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 560px) {
  .category-loading__cards {
    grid-template-columns: 1fr;
  }
}

@media (prefers-reduced-motion: reduce) {
  .category-loading__line,
  .category-loading__card {
    animation: none;
  }
}

@keyframes category-loading-shimmer {
  from {
    background-position: 120% 0;
  }

  to {
    background-position: -80% 0;
  }
}
</style>
