<script setup lang="ts">
const { t } = useI18n()
const {
  announcement,
  categories,
  error,
  pending,
  refresh,
  selectCategory,
  selectedCategory,
  videos
} = useHomeFeed()

useHead({
  title: "Aoi"
})
</script>

<template>
  <div>
    <BrandBand />

    <div class="aoi-page">
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
          title="内容加载失败"
          action-icon="refresh-cw"
          action-label="重试"
          @action="refresh()"
        />

        <PageState
          v-else-if="!pending && videos.length === 0"
          icon="inbox"
          title="该分类暂时没有内容"
          action-icon="rotate-ccw"
          action-label="返回首页"
          @action="selectCategory('home')"
        />

        <VideoGrid v-else-if="videos.length > 0" :videos="videos" />
      </AoiSection>
    </div>
  </div>
</template>

<style scoped>
@media (max-width: 639px) {
  .home-view-toggle {
    display: none;
  }
}
</style>
