<script setup lang="ts">
type CollectionTab = "favorites" | "watchLater"

const library = useLibraryStore()
const { locale, t } = useI18n()
const activeTab = ref<CollectionTab>("favorites")
const collectionSynced = ref(false)
const syncPending = ref(false)

const dateLocale = computed(() => {
  if (locale.value === "ja") {
    return "ja-JP"
  }
  if (locale.value === "en") {
    return "en-US"
  }
  return "zh-CN"
})
const favoriteCount = computed(() => library.favoriteList.length)
const watchLaterCount = computed(() => library.watchLaterList.length)
const totalCount = computed(() => favoriteCount.value + watchLaterCount.value)
const activeVideos = computed(() => activeTab.value === "favorites"
  ? library.favoriteList
  : library.watchLaterList)
const hasActiveVideos = computed(() => library.hydrated && activeVideos.value.length > 0)
const hasAnyVideos = computed(() => library.hydrated && totalCount.value > 0)
const canClearActive = computed(() => library.hydrated && activeVideos.value.length > 0 && !syncPending.value)
const isInitialSync = computed(() => !library.hydrated || (syncPending.value && !collectionSynced.value && !hasAnyVideos.value))
const tabItems = computed(() => [
  {
    icon: "star",
    label: t("collections.tabs.favorites", { count: formatCount(favoriteCount.value) }),
    value: "favorites"
  },
  {
    icon: "clock-3",
    label: t("collections.tabs.watchLater", { count: formatCount(watchLaterCount.value) }),
    value: "watchLater"
  }
])
const clearLabel = computed(() => activeTab.value === "favorites"
  ? t("collections.actions.clearFavorites")
  : t("collections.actions.clearWatchLater"))
const activeTitle = computed(() => activeTab.value === "favorites"
  ? t("collections.sections.favoritesTitle")
  : t("collections.sections.watchLaterTitle"))
const activeDescription = computed(() => activeTab.value === "favorites"
  ? t("collections.sections.favoritesDescription")
  : t("collections.sections.watchLaterDescription"))
const emptyTitle = computed(() => activeTab.value === "favorites"
  ? t("collections.empty.favoritesTitle")
  : t("collections.empty.watchLaterTitle"))
const emptyDescription = computed(() => activeTab.value === "favorites"
  ? t("collections.empty.favoritesDescription")
  : t("collections.empty.watchLaterDescription"))
const sourceLabel = computed(() => {
  if (!library.hydrated || syncPending.value) {
    return t("collections.source.syncing")
  }
  if (library.syncError) {
    return t("collections.source.error")
  }
  if (library.backendReady) {
    return t("collections.source.ready", {
      favorites: formatCount(favoriteCount.value),
      watchLater: formatCount(watchLaterCount.value)
    })
  }
  return t("collections.source.local")
})
const collectionStats = computed(() => [
  {
    description: t("collections.stats.favoritesDescription"),
    icon: "star",
    label: t("collections.stats.favorites"),
    value: formatCount(favoriteCount.value)
  },
  {
    description: t("collections.stats.watchLaterDescription"),
    icon: "clock-3",
    label: t("collections.stats.watchLater"),
    value: formatCount(watchLaterCount.value)
  },
  {
    description: t("collections.stats.totalDescription"),
    icon: "library",
    label: t("collections.stats.total"),
    value: formatCount(totalCount.value)
  },
  {
    description: t("collections.stats.backendDescription"),
    icon: library.backendReady ? "cloud-check" : "cloud",
    label: t("collections.stats.backend"),
    value: library.backendReady ? t("collections.stats.backendReady") : t("collections.stats.backendLocal")
  }
])

async function syncLibrary() {
  if (!library.hydrated || syncPending.value) {
    return
  }

  syncPending.value = true
  try {
    await library.syncWithBackend()
  } finally {
    collectionSynced.value = true
    syncPending.value = false
  }
}

async function clearActiveList() {
  if (!canClearActive.value) {
    return
  }

  syncPending.value = true
  try {
    if (activeTab.value === "favorites") {
      await library.clearFavorites()
    } else {
      await library.clearWatchLater()
    }
  } finally {
    collectionSynced.value = true
    syncPending.value = false
  }
}

function formatCount(value: number) {
  return new Intl.NumberFormat(dateLocale.value, {
    maximumFractionDigits: 1,
    notation: value >= 1000 ? "compact" : "standard"
  }).format(value)
}

watch(() => library.hydrated, (hydrated) => {
  if (hydrated) {
    void syncLibrary()
  }
}, { immediate: true })

useHead(() => ({
  title: t("collections.headTitle")
}))
</script>

<template>
  <div class="aoi-page collections-page">
    <section v-aoi-reveal="'rise'" class="collections-hero" :aria-label="t('collections.title')">
      <PageHeader
        icon="star"
        :eyebrow="t('collections.eyebrow')"
        :title="t('collections.title')"
        :description="t('collections.description')"
      >
        <template #actions>
          <AoiButton
            tone="accent"
            variant="tonal"
            icon="refresh-cw"
            :loading="syncPending"
            @click="syncLibrary"
          >
            {{ t("collections.actions.refresh") }}
          </AoiButton>
          <AoiButton
            tone="neutral"
            variant="outlined"
            icon="trash-2"
            :disabled="!canClearActive"
            :loading="syncPending"
            @click="clearActiveList"
          >
            {{ clearLabel }}
          </AoiButton>
        </template>
      </PageHeader>

      <div class="collections-hero__meta">
        <p class="collections-hero__source">
          <AoiIcon name="sparkles" :size="14" decorative />
          {{ sourceLabel }}
        </p>
      </div>

      <div class="collections-hero__mobile-actions">
        <AoiButton
          tone="accent"
          variant="tonal"
          icon="refresh-cw"
          :loading="syncPending"
          @click="syncLibrary"
        >
          {{ t("collections.actions.refresh") }}
        </AoiButton>
        <AoiButton
          tone="neutral"
          variant="outlined"
          icon="trash-2"
          :disabled="!canClearActive"
          :loading="syncPending"
          @click="clearActiveList"
        >
          {{ clearLabel }}
        </AoiButton>
      </div>
    </section>

    <AoiStatGrid
      v-if="library.hydrated"
      class="collections-page__stats"
      :items="collectionStats"
      :columns="4"
      reveal="fade"
    />

    <section
      v-if="isInitialSync"
      class="collections-loading"
      :aria-label="t('collections.loadingTitle')"
      aria-live="polite"
    >
      <span class="collections-loading__sr">
        {{ t("collections.loadingTitle") }}. {{ t("collections.loadingDescription") }}
      </span>
      <div class="collections-loading__header" aria-hidden="true">
        <span class="collections-loading__line collections-loading__line--title" />
        <span class="collections-loading__line" />
      </div>
      <div class="collections-loading__cards" aria-hidden="true">
        <span v-for="item in 6" :key="item" class="collections-loading__card" />
      </div>
    </section>

    <template v-else>
      <AoiReveal variant="fade">
        <AoiTabs
          v-model="activeTab"
          :items="tabItems"
          :aria-label="t('collections.tabsAria')"
        />
      </AoiReveal>

      <AoiStatusMessage
        v-if="library.syncError"
        intent="warning"
        icon="cloud-alert"
      >
        {{ t("collections.source.error") }}
      </AoiStatusMessage>

      <AoiSection
        v-if="hasActiveVideos"
        :title="activeTitle"
        :description="activeDescription"
        :count="activeVideos.length"
        title-id="collections-active-title"
        :reveal="false"
      >
        <template #actions>
          <AoiButton
            tone="accent"
            variant="outlined"
            size="sm"
            icon="trash-2"
            :disabled="!canClearActive"
            :loading="syncPending"
            @click="clearActiveList"
          >
            {{ clearLabel }}
          </AoiButton>
        </template>
        <VideoGrid :videos="activeVideos" />
      </AoiSection>

      <PageState
        v-else-if="library.syncError && !hasAnyVideos"
        icon="cloud-alert"
        :title="t('collections.errorTitle')"
        :description="t('collections.errorDescription')"
        action-icon="refresh-cw"
        :action-label="t('collections.actions.refresh')"
        @action="syncLibrary"
      />

      <PageState
        v-else
        icon="star"
        :title="emptyTitle"
        :description="emptyDescription"
        action-icon="search"
        :action-label="t('collections.empty.action')"
        @action="navigateTo('/search')"
      />
    </template>
  </div>
</template>

<style scoped>
.collections-page {
  display: grid;
  gap: 18px;
}

.collections-hero {
  position: relative;
  display: grid;
  min-width: 0;
  gap: 14px;
  overflow: hidden;
  border: 0;
  background: none;
  box-shadow: none;
  padding: 0;
}

.collections-hero :deep(.page-header) {
  margin: 0;
}

.collections-hero :deep(.page-header__description) {
  max-width: 780px;
  text-wrap: pretty;
}

.collections-hero__meta,
.collections-hero__mobile-actions {
  display: flex;
  min-width: 0;
  flex-wrap: wrap;
  gap: 8px;
}

.collections-hero__source {
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

.collections-hero__mobile-actions {
  display: none;
}

.collections-page__stats {
  min-width: 0;
}

.collections-page :deep(.aoi-tabs) {
  max-width: 100%;
  overflow-x: auto;
}

.collections-loading {
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

.collections-loading__sr {
  position: absolute;
  overflow: hidden;
  width: 1px;
  height: 1px;
  padding: 0;
  border: 0;
  clip: rect(0 0 0 0);
  white-space: nowrap;
}

.collections-loading__header {
  display: grid;
  gap: 10px;
}

.collections-loading__line,
.collections-loading__card {
  background: linear-gradient(110deg, var(--aoi-accent-10), var(--aoi-surface-muted), var(--aoi-accent-10));
  background-size: 200% 100%;
  animation: collections-loading-shimmer 1.2s var(--aoi-ease-out) infinite;
}

.collections-loading__line {
  display: block;
  width: min(100%, 640px);
  height: 10px;
  border-radius: var(--aoi-radius-round);
}

.collections-loading__line--title {
  width: min(52%, 320px);
  height: 18px;
}

.collections-loading__cards {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: var(--aoi-grid-gap-compact);
}

.collections-loading__card {
  min-height: 132px;
  border-radius: var(--aoi-radius-sm);
}

@media (max-width: 760px) {
  .collections-loading__cards {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 639px) {
  .collections-page {
    padding-bottom: calc(var(--aoi-mobile-content-bottom-space) + 24px);
  }

  .collections-hero__meta,
  .collections-hero__mobile-actions {
    display: grid;
  }

  .collections-hero__mobile-actions :deep(.aoi-button) {
    width: 100%;
  }
}

@media (prefers-reduced-motion: reduce) {
  .collections-loading__line,
  .collections-loading__card {
    animation: none;
  }
}

@keyframes collections-loading-shimmer {
  from {
    background-position: 120% 0;
  }

  to {
    background-position: -80% 0;
  }
}
</style>
