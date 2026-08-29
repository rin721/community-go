<script setup lang="ts">
const api = useAoiApi()
const { t } = useI18n()

const followingList = ref<any[] | null>(null)
const followingPending = ref(false)
const followingError = ref<string | null>(null)

async function loadFollowing() {
  followingPending.value = true
  followingError.value = null
  try {
    const payload = await api.getAccountFollowingFeed()
    followingList.value = payload.creators || []
  } catch {
    followingError.value = t("me.loadError")
  } finally {
    followingPending.value = false
  }
}

onMounted(() => {
  void loadFollowing()
})
</script>

<template>
  <div class="me-following-subpage">
    <AoiReveal v-if="followingPending" variant="pop" duration="400">
      <div class="me-skeleton-following">
        <AoiSkeletonGroup layout="grid" columns="repeat(auto-fill, minmax(280px, 1fr))" gap="var(--aoi-grid-gap)">
          <AoiSurface
            v-for="i in 6"
            :key="i"
            surface="panel"
            padding="md"
            style="display: flex; align-items: center; gap: 16px;"
          >
            <AoiSkeleton shape="circle" width="48px" height="48px" />
            <div style="flex: 1; display: flex; flex-direction: column; gap: 6px;">
              <AoiSkeleton width="120px" height="18px" radius="4px" />
              <AoiSkeleton width="80px" height="12px" radius="4px" />
            </div>
          </AoiSurface>
        </AoiSkeletonGroup>
      </div>
    </AoiReveal>
    <div v-else-if="followingError" class="me-error-wrapper">
      <AoiStatusMessage intent="danger" icon="alert-circle">
        {{ followingError }}
      </AoiStatusMessage>
      <AoiButton variant="filled" tone="accent" @click="loadFollowing">
        重新加载
      </AoiButton>
    </div>
    <template v-else>
      <AoiReveal v-if="followingList && followingList.length > 0" variant="pop" duration="400" tag="div" class="me-creators-grid">
        <CreatorCard
          v-for="creator in followingList"
          :key="creator.id"
          :creator="creator"
          density="compact"
        />
      </AoiReveal>
      <AoiSurface v-else surface="panel" padding="lg">
        <PageState
          icon="users"
          title="暂无关注"
          description="你还没关注任何社区创作者。去首页发现有趣的创作团队吧。"
          action-icon="search"
          action-label="发现创作者"
          @action="navigateTo('/')"
        />
      </AoiSurface>
    </template>
  </div>
</template>

<style scoped>
.me-creators-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: var(--aoi-grid-gap);
}
.me-loading-wrapper {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 48px 0;
}
.me-loading-text {
  font-size: 0.9rem;
  color: var(--aoi-text-muted);
}
.me-error-wrapper {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  padding: 48px 0;
}
</style>
