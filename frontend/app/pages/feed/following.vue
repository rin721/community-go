<script setup lang="ts">
const api = useAoiApi()
const following = useFollowingStore()

const { data: feed, error, pending, refresh } = useAsyncData("following-feed", () => api.getFollowingFeed())
const recommendedCreators = computed(() => feed.value?.creators.filter((creator) => !following.isFollowing(creator.id)) || [])

useHead({
  title: "Following - Aoi"
})
</script>

<template>
  <div class="aoi-page">
    <PageHeader
      icon="radio-tower"
      title="关注动态"
      description="关注流会在接入登录和 Go 后端后展示你订阅的创作者更新；当前提供 mock 预览。"
    />

    <PageState
      v-if="!pending && error"
      icon="cloud-alert"
      title="关注流加载失败"
      description="mock API 暂时没有返回关注流数据。"
      action-icon="refresh-cw"
      action-label="重试"
      @action="refresh()"
    />

    <template v-else-if="!pending && feed">
      <PageState
        v-if="!feed.authenticated && following.hydrated && following.followedCount === 0"
        icon="user-round-plus"
        title="关注流暂未登录"
        :description="feed.message || '接入认证后，这里会展示关注创作者的最新视频；现在也可以先用本地关注预览。'"
        action-icon="search"
        action-label="先去搜索"
        @action="navigateTo('/search')"
      />

      <AoiSection
        v-if="following.hydrated && following.followedList.length"
        title="本地关注"
        description="保存在当前浏览器，未来可迁移到 Go 用户关系接口。"
        title-id="local-following-title"
      >
        <template #actions>
          <AoiButton tone="accent" variant="outlined" size="sm" icon="settings" to="/settings">管理缓存</AoiButton>
        </template>
        <AoiContentGrid min-width="260px" gap="compact" :mobile-columns="1">
          <AoiReveal
            v-for="(creator, index) in following.followedList"
            :key="creator.id"
            class="following-card-reveal"
            :index="index"
          >
            <CreatorCard :creator="creator" />
          </AoiReveal>
        </AoiContentGrid>
      </AoiSection>

      <AoiSection
        v-if="following.hydrated && following.latestVideos.length"
        title="本地关注更新"
        title-id="local-following-latest-title"
      >
        <VideoGrid :videos="following.latestVideos" />
      </AoiSection>

      <AoiSection
        v-if="recommendedCreators.length"
        title="推荐创作者"
        description="这些推荐来自 mock API，可直接关注到本地列表。"
        title-id="following-creators-title"
      >
        <template #actions>
          <AoiButton tone="accent" variant="outlined" size="sm" icon="search" to="/search">探索更多</AoiButton>
        </template>
        <AoiContentGrid min-width="260px" gap="compact" :mobile-columns="1">
          <AoiReveal
            v-for="(creator, index) in recommendedCreators"
            :key="creator.id"
            class="following-card-reveal"
            :index="index"
          >
            <CreatorCard :creator="creator" />
          </AoiReveal>
        </AoiContentGrid>
      </AoiSection>

      <AoiSection
        v-if="feed.latest.items.length"
        title="推荐更新"
        title-id="following-latest-title"
      >
        <VideoGrid :videos="feed.latest.items" />
      </AoiSection>
    </template>

    <PageState
      v-else-if="!pending"
      icon="user-round-plus"
      title="关注流暂无内容"
      description="没有拿到关注流预览数据。"
      action-icon="refresh-cw"
      action-label="重试"
      @action="refresh()"
    />
  </div>
</template>

<style scoped>
.following-card-reveal {
  min-width: 0;
}
</style>
