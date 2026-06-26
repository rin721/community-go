<script setup lang="ts">
import type { CategoryTreeNode } from "~/types/api"
import { getCategorySelfAndDescendants } from "~~/shared/utils/categories"

const { locale, t } = useI18n()
const api = useAoiApi()
const route = useRoute()
const slug = computed(() => String(route.params.slug || "home"))

const { data, error, pending, refresh } = useAsyncData(() => `category-${slug.value}`, async () => {
  const [category, videos] = await Promise.all([
    api.getCategory(slug.value),
    api.listVideos({ category: slug.value })
  ])

  return {
    category,
    videos: videos.items
  }
}, {
  default: () => ({
    category: null,
    videos: []
  }),
  watch: [slug]
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
const currentCategory = computed(() => data.value.category)
const videos = computed(() => data.value.videos)
const childCategories = computed(() => currentCategory.value?.children || [])
const branchCategoryCount = computed(() => currentCategory.value
  ? getCategorySelfAndDescendants([currentCategory.value], currentCategory.value.slug).length
  : 0)
const sourceLabel = computed(() => currentCategory.value
  ? t("category.detailSource", {
      category: currentCategory.value.name,
      count: formatCount(videos.value.length)
    })
  : t("category.detailSourceLoading", { slug: slug.value }))
const notFoundDescription = computed(() => t("category.notFoundDescription", { slug: slug.value }))
const videosDescription = computed(() => currentCategory.value
  ? t("category.videosDescription", {
      category: currentCategory.value.name,
      count: formatCount(videos.value.length)
    })
  : "")
const categoryStats = computed(() => [
  {
    description: t("category.stats.detailVideosDescription"),
    icon: "play-square",
    label: t("category.stats.videos"),
    value: formatCount(videos.value.length)
  },
  {
    description: t("category.stats.childrenDescription"),
    icon: "git-branch",
    label: t("category.stats.children"),
    value: formatCount(childCategories.value.length)
  },
  {
    description: t("category.stats.branchDescription"),
    icon: "folder-tree",
    label: t("category.stats.branch"),
    value: formatCount(branchCategoryCount.value)
  }
])

useHead(() => ({
  title: currentCategory.value
    ? t("category.detailHeadTitle", { category: currentCategory.value.name })
    : t("category.detailHeadFallback")
}))

function countFor(category: CategoryTreeNode) {
  if (!currentCategory.value) {
    return 0
  }

  const slugs = getCategorySelfAndDescendants([currentCategory.value], category.slug).map((item) => item.slug)

  return videos.value.filter((video) => video.categories.some((item) => slugs.includes(item.slug))).length
}

function formatCount(value: number) {
  return new Intl.NumberFormat(dateLocale.value, {
    maximumFractionDigits: 1,
    notation: value >= 1000 ? "compact" : "standard"
  }).format(value)
}
</script>

<template>
  <div class="aoi-page category-detail-page">
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
        <span v-for="item in 6" :key="item" class="category-loading__card" />
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
      v-else-if="!currentCategory"
      icon="folder-x"
      :title="t('category.notFoundTitle')"
      :description="notFoundDescription"
      action-icon="layout-grid"
      :action-label="t('category.backToCategories')"
      @action="navigateTo('/category')"
    />

    <template v-else>
      <section
        v-aoi-reveal="'rise'"
        class="category-hero"
        :style="{ '--category-accent': currentCategory.accentColor || 'var(--aoi-accent-50)' }"
        :aria-label="currentCategory.name"
      >
        <PageHeader
          icon="folder-open"
          :eyebrow="t('category.detailEyebrow')"
          :title="currentCategory.name"
          :description="currentCategory.description"
        >
          <template #actions>
            <AoiButton tone="accent" variant="tonal" icon="layout-grid" to="/category">
              {{ t("category.allCategoriesAction") }}
            </AoiButton>
            <AoiButton tone="neutral" variant="outlined" icon="search" to="/search">
              {{ t("category.searchAction") }}
            </AoiButton>
          </template>
        </PageHeader>

        <p class="category-hero__source">
          <AoiIcon name="database" :size="14" decorative />
          {{ sourceLabel }}
        </p>
      </section>

      <AoiStatGrid class="category-detail-page__stats" :items="categoryStats" :columns="3" reveal="fade" />

      <AoiSection
        v-if="childCategories.length"
        :title="t('category.childrenTitle')"
        :description="t('category.childrenDescription')"
        :count="childCategories.length"
        title-id="category-children-title"
        :level="3"
        :reveal="false"
      >
        <AoiContentGrid min-width="220px" gap="compact" :mobile-columns="1">
          <AoiReveal
            v-for="(child, index) in childCategories"
            :key="child.id"
            :index="index"
          >
            <CategoryCard
              :category="child"
              :count="countFor(child)"
            />
          </AoiReveal>
        </AoiContentGrid>
      </AoiSection>

      <PageState
        v-if="videos.length === 0"
        icon="inbox"
        :title="t('category.emptyVideosTitle')"
        :description="t('category.emptyVideosDescription')"
      />

      <AoiSection
        v-else
        class="category-detail-page__videos"
        :title="t('category.videosTitle')"
        :description="videosDescription"
        :count="videos.length"
        title-id="category-videos-title"
        :reveal="false"
      >
        <VideoGrid :videos="videos" />
      </AoiSection>
    </template>
  </div>
</template>

<style scoped>
.category-detail-page {
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

.category-detail-page__stats,
.category-detail-page__videos {
  min-width: 0;
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
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: var(--aoi-grid-gap-compact);
}

.category-loading__card {
  min-height: 128px;
  border-radius: var(--aoi-radius-sm);
}

@media (max-width: 760px) {
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
