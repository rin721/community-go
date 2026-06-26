<script setup lang="ts">
import type { SearchPayload } from "~/types/api"

type SearchTab = "all" | "videos" | "creators" | "categories"

const api = useAoiApi()
const route = useRoute()
const router = useRouter()
const { locale, t } = useI18n()

const query = ref(typeof route.query.q === "string" ? route.query.q : "")
const submittedQuery = computed(() => typeof route.query.q === "string" ? route.query.q.trim() : "")
const hasQuery = computed(() => submittedQuery.value.length > 0)
const dateLocale = computed(() => {
  if (locale.value === "ja") {
    return "ja-JP"
  }
  if (locale.value === "en") {
    return "en-US"
  }
  return "zh-CN"
})
const activeTab = computed<SearchTab>({
  get: () => {
    const value = typeof route.query.type === "string" ? route.query.type : "all"

    return isSearchTab(value) ? value : "all"
  },
  set: (value) => {
    router.replace({
      path: "/search",
      query: {
        ...(submittedQuery.value ? { q: submittedQuery.value } : {}),
        ...(value === "all" ? {} : { type: value })
      }
    })
  }
})

const emptyResult: SearchPayload = {
  categories: {
    items: [],
    nextCursor: null
  },
  creators: {
    items: [],
    nextCursor: null
  },
  query: "",
  totalCount: 0,
  videos: {
    items: [],
    nextCursor: null
  }
}

const { data, error, pending, refresh } = useAsyncData("search-results", () => {
  if (!hasQuery.value) {
    return Promise.resolve(emptyResult)
  }

  return api.search({
    limit: 24,
    q: submittedQuery.value
  })
}, {
  default: () => emptyResult,
  watch: [submittedQuery]
})

const videos = computed(() => data.value.videos.items)
const creators = computed(() => data.value.creators.items)
const categories = computed(() => data.value.categories.items)
const totalCount = computed(() => data.value.totalCount)
const activeTabName = computed(() => t(`search.tabNames.${activeTab.value}`))
const visibleResultCount = computed(() => {
  if (activeTab.value === "videos") {
    return videos.value.length
  }
  if (activeTab.value === "creators") {
    return creators.value.length
  }
  if (activeTab.value === "categories") {
    return categories.value.length
  }
  return totalCount.value
})
const tabItems = computed(() => [
  { icon: "sparkles", label: t("search.tabs.all", { count: formatCount(totalCount.value) }), value: "all" },
  { icon: "play-square", label: t("search.tabs.videos", { count: formatCount(videos.value.length) }), value: "videos" },
  { icon: "users", label: t("search.tabs.creators", { count: formatCount(creators.value.length) }), value: "creators" },
  { icon: "layout-grid", label: t("search.tabs.categories", { count: formatCount(categories.value.length) }), value: "categories" }
])
const resultStats = computed(() => [
  {
    description: t("search.stats.totalDescription"),
    icon: "sparkles",
    label: t("search.stats.total"),
    value: formatCount(totalCount.value)
  },
  {
    description: t("search.stats.videosDescription"),
    icon: "play-square",
    label: t("search.stats.videos"),
    value: formatCount(videos.value.length)
  },
  {
    description: t("search.stats.creatorsDescription"),
    icon: "users",
    label: t("search.stats.creators"),
    value: formatCount(creators.value.length)
  },
  {
    description: t("search.stats.categoriesDescription"),
    icon: "layout-grid",
    label: t("search.stats.categories"),
    value: formatCount(categories.value.length)
  }
])
const showVideos = computed(() => activeTab.value === "all" || activeTab.value === "videos")
const showCreators = computed(() => activeTab.value === "all" || activeTab.value === "creators")
const showCategories = computed(() => activeTab.value === "all" || activeTab.value === "categories")
const hasActiveResults = computed(() => visibleResultCount.value > 0)
const searchSourceLabel = computed(() => hasQuery.value
  ? t("search.sourceWithQuery", { query: submittedQuery.value })
  : t("search.sourceIdle"))
const resultsDescription = computed(() => t("search.resultsDescription", {
  count: formatCount(totalCount.value),
  query: submittedQuery.value
}))
const activeEmptyDescription = computed(() => t("search.emptyTabDescription", {
  query: submittedQuery.value,
  type: activeTabName.value
}))

watch(() => route.query.q, (value) => {
  query.value = typeof value === "string" ? value : ""
})

function formatCount(value: number) {
  return new Intl.NumberFormat(dateLocale.value, {
    maximumFractionDigits: 1,
    notation: value >= 1000 ? "compact" : "standard"
  }).format(value)
}

function submitSearch() {
  const nextQuery = query.value.trim()

  router.replace({
    path: "/search",
    query: nextQuery
      ? {
          q: nextQuery,
          ...(activeTab.value === "all" ? {} : { type: activeTab.value })
        }
      : {}
  })
}

function isSearchTab(value: string): value is SearchTab {
  return value === "all" || value === "videos" || value === "creators" || value === "categories"
}

useHead(() => ({
  title: submittedQuery.value ? t("search.headTitleWithQuery", { query: submittedQuery.value }) : t("search.headTitle")
}))
</script>

<template>
  <div class="aoi-page search-page">
    <section v-aoi-reveal="'rise'" class="search-hero" :aria-label="t('search.title')">
      <PageHeader
        icon="search"
        :eyebrow="t('search.eyebrow')"
        :title="t('search.title')"
        :description="t('search.description')"
      >
        <template #actions>
          <AoiButton tone="accent" variant="tonal" icon="layout-grid" to="/category">
            {{ t("search.browseCategories") }}
          </AoiButton>
        </template>
      </PageHeader>

      <p class="search-hero__source">
        <AoiIcon name="database" :size="14" decorative />
        {{ searchSourceLabel }}
      </p>

      <form class="search-toolbar" @submit.prevent="submitSearch">
        <AoiTextField
          v-model="query"
          :label="t('search.inputLabel')"
          :placeholder="t('search.inputPlaceholder')"
          appearance="outlined"
          @enter="submitSearch"
        />
        <AoiButton tone="accent" variant="filled" icon="search" type="submit">
          {{ t("search.submit") }}
        </AoiButton>
      </form>
    </section>

    <AoiStatGrid
      v-if="hasQuery && !pending && !error"
      class="search-stats"
      :items="resultStats"
      :columns="4"
      reveal="fade"
    />

    <PageState
      v-if="!hasQuery"
      icon="sparkles"
      :title="t('search.idleTitle')"
      :description="t('search.idleDescription')"
    />

    <section
      v-else-if="pending"
      class="search-loading"
      :aria-label="t('search.loadingTitle')"
      aria-live="polite"
    >
      <span class="search-loading__sr">
        {{ t("search.loadingTitle") }}. {{ t("search.loadingDescription") }}
      </span>
      <div class="search-loading__header" aria-hidden="true">
        <span class="search-loading__line search-loading__line--title" />
        <span class="search-loading__line" />
      </div>
      <div class="search-loading__cards" aria-hidden="true">
        <span v-for="item in 6" :key="item" class="search-loading__card" />
      </div>
    </section>

    <PageState
      v-else-if="error"
      icon="circle-alert"
      :title="t('search.errorTitle')"
      :description="t('search.errorDescription')"
      action-icon="refresh-cw"
      :action-label="t('search.retry')"
      @action="refresh()"
    />

    <PageState
      v-else-if="totalCount === 0"
      icon="scan-search"
      :title="t('search.emptyTitle')"
      :description="t('search.emptyDescription', { query: submittedQuery })"
    />

    <AoiSection
      v-else
      class="search-results"
      :title="t('search.resultsTitle')"
      :description="resultsDescription"
      :count="totalCount"
      title-id="search-results-title"
    >
      <template #actions>
        <AoiTabs
          v-model="activeTab"
          :items="tabItems"
          :aria-label="t('search.tabsAria')"
        />
      </template>

      <PageState
        v-if="!hasActiveResults"
        icon="list-filter"
        :title="t('search.emptyTabTitle', { type: activeTabName })"
        :description="activeEmptyDescription"
      />

      <AoiSection
        v-if="showVideos && videos.length"
        :title="t('search.sections.videos')"
        :count="videos.length"
        title-id="search-videos-title"
        :level="3"
        :reveal="false"
      >
        <VideoGrid :videos="videos" />
      </AoiSection>

      <AoiSection
        v-if="showCreators && creators.length"
        :title="t('search.sections.creators')"
        :count="creators.length"
        title-id="search-creators-title"
        :level="3"
        :reveal="false"
      >
        <AoiContentGrid min-width="260px" gap="compact" :mobile-columns="1">
          <AoiReveal
            v-for="(creator, index) in creators"
            :key="creator.id"
            class="result-card-reveal"
            :index="index"
          >
            <CreatorCard :creator="creator" />
          </AoiReveal>
        </AoiContentGrid>
      </AoiSection>

      <AoiSection
        v-if="showCategories && categories.length"
        :title="t('search.sections.categories')"
        :count="categories.length"
        title-id="search-categories-title"
        :level="3"
        :reveal="false"
      >
        <AoiContentGrid min-width="260px" gap="compact" :mobile-columns="1">
          <AoiReveal
            v-for="(category, index) in categories"
            :key="category.id"
            class="result-card-reveal"
            :index="index"
          >
            <CategoryCard :category="category" />
          </AoiReveal>
        </AoiContentGrid>
      </AoiSection>
    </AoiSection>
  </div>
</template>

<style scoped>
.search-page {
  display: grid;
  gap: 18px;
}

.search-hero {
  position: relative;
  display: grid;
  min-width: 0;
  gap: 14px;
  overflow: hidden;
  border: 1px solid var(--aoi-state-border-active);
  border-radius: var(--aoi-radius-sm);
  background:
    linear-gradient(135deg, color-mix(in srgb, var(--aoi-accent-10) 72%, transparent), transparent 46%),
    linear-gradient(180deg, color-mix(in srgb, var(--aoi-surface-solid) 88%, transparent), var(--aoi-surface));
  box-shadow: var(--aoi-shadow-sm);
  padding: 18px;
}

.search-hero::before {
  position: absolute;
  inset: 0 0 auto;
  height: 3px;
  background: linear-gradient(90deg, var(--aoi-accent-50), var(--aoi-sakura-50), var(--aoi-accent-40));
  content: "";
}

.search-hero :deep(.page-header) {
  margin: 0;
}

.search-hero :deep(.page-header__description) {
  max-width: 780px;
  text-wrap: pretty;
}

.search-hero__source {
  display: inline-flex;
  width: fit-content;
  max-width: 100%;
  align-items: center;
  gap: 6px;
  border: 1px solid color-mix(in srgb, var(--aoi-state-border-active) 58%, transparent);
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

.search-toolbar {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 10px;
  align-items: end;
}

.search-toolbar :deep(.aoi-text-field) {
  width: 100%;
}

.search-stats {
  min-width: 0;
}

.search-loading {
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

.search-loading__sr {
  position: absolute;
  overflow: hidden;
  width: 1px;
  height: 1px;
  padding: 0;
  border: 0;
  clip: rect(0 0 0 0);
  white-space: nowrap;
}

.search-loading__header {
  display: grid;
  gap: 10px;
}

.search-loading__line,
.search-loading__card {
  background: linear-gradient(110deg, var(--aoi-accent-10), var(--aoi-surface-muted), var(--aoi-accent-10));
  background-size: 200% 100%;
  animation: search-loading-shimmer 1.2s var(--aoi-ease-out) infinite;
}

.search-loading__line {
  display: block;
  width: min(100%, 640px);
  height: 10px;
  border-radius: var(--aoi-radius-round);
}

.search-loading__line--title {
  width: min(52%, 320px);
  height: 18px;
}

.search-loading__cards {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: var(--aoi-grid-gap-compact);
}

.search-loading__card {
  min-height: 132px;
  border-radius: var(--aoi-radius-sm);
}

.search-results {
  display: grid;
  min-width: 0;
  gap: 18px;
}

.result-card-reveal {
  min-width: 0;
}

.search-results :deep(.aoi-tabs) {
  max-width: 100%;
  overflow-x: auto;
}

@media (max-width: 760px) {
  .search-toolbar {
    grid-template-columns: minmax(0, 1fr);
  }

  .search-toolbar :deep(.aoi-button) {
    width: 100%;
  }

  .search-loading__cards {
    grid-template-columns: 1fr;
  }
}

@media (prefers-reduced-motion: reduce) {
  .search-loading__line,
  .search-loading__card {
    animation: none;
  }
}

@keyframes search-loading-shimmer {
  from {
    background-position: 120% 0;
  }

  to {
    background-position: -80% 0;
  }
}
</style>
