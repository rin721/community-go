<script setup lang="ts">
import { AOI_ALL_CATEGORY } from "~/utils/communityCategories"

const config = useRuntimeConfig()
const { t } = useI18n()
const {
  announcement,
  categories,
  error,
  pending,
  refresh,
  selectCategory,
  selectedCategory,
  setupRequired,
  videos
} = useHomeFeed()

const setupUrl = computed(() => resolveSetupUrl(String(config.public.authApiBaseURL || config.public.apiBaseURL || "")))

useHead({
  title: "Aoi"
})

function openSetup() {
  void navigateTo(setupUrl.value, { external: true })
}

function resolveSetupUrl(apiBaseURL: string) {
  try {
    return `${new URL(apiBaseURL).origin}/setup`
  } catch {
    return "/setup"
  }
}
</script>

<template>
  <div class="aoi-page">
    <BrandBand />

    <PageState
      v-if="setupRequired"
      icon="settings-2"
      :title="t('home.setupRequiredTitle')"
      :description="t('home.setupRequiredDescription')"
      action-icon="external-link"
      :action-label="t('home.setupRequiredAction')"
      @action="openSetup"
    />

    <template v-else>
      <CategoryTabs
        v-model="selectedCategory"
        :categories="categories"
        @change="selectCategory"
      />

      <AnnouncementStrip :announcement="announcement" />

      <AoiSection :title="t('home.latest')" :count="videos.length" title-id="latest-title">
        <template #actions>
          <AoiActionBar class="home-view-toggle" surface size="sm" label="视图模式">
            <AoiIconButton icon="grid-3x3" :label="t('home.gridView')" active variant="tonal" size="sm" />
            <AoiIconButton icon="list" :label="t('home.listView')" size="sm" />
          </AoiActionBar>
        </template>

        <VideoGridSkeleton v-if="pending" />

        <PageState
          v-else-if="!pending && error"
          icon="circle-alert"
          :title="t('home.loadFailedTitle')"
          action-icon="refresh-cw"
          :action-label="t('home.retry')"
          @action="refresh()"
        />

        <PageState
          v-else-if="!pending && videos.length === 0"
          icon="inbox"
          :title="t('home.emptyCategoryTitle')"
          action-icon="rotate-ccw"
          :action-label="t('home.backHome')"
          @action="selectCategory(AOI_ALL_CATEGORY)"
        />

        <VideoGrid v-else-if="videos.length > 0" :videos="videos" />
      </AoiSection>
    </template>
  </div>
</template>

<style scoped>
@media (max-width: 639px) {
  .home-view-toggle {
    display: none;
  }
}
</style>
