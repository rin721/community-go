<script setup lang="ts">
const route = useRoute()
const api = useAoiApi()
const following = useFollowingStore()
const handle = computed(() => String(route.params.handle || ""))

const { data: creator, error, pending, refresh } = useAsyncData(
  () => `creator-${handle.value}`,
  () => api.getCreatorProfile(handle.value),
  {
    watch: [handle]
  }
)

const joinedDate = computed(() => {
  if (!creator.value) {
    return ""
  }

  return new Intl.DateTimeFormat("zh-CN", {
    month: "long",
    year: "numeric"
  }).format(new Date(creator.value.joinedAt))
})
const isFollowing = computed(() => creator.value ? following.isFollowing(creator.value.id) : false)
const localFollowerCount = computed(() => creator.value
  ? creator.value.followerCount + (isFollowing.value ? 1 : 0)
  : 0)
const creatorStats = computed(() => creator.value
  ? [
      { label: "关注者", value: formatCount(localFollowerCount.value) },
      { label: "投稿", value: creator.value.videoCount },
      { label: "加入时间", value: joinedDate.value }
    ]
  : [])
const categoryTags = computed(() => creator.value?.categories.map((category) => ({
  label: category.name,
  to: `/category/${category.slug}`,
  value: category.id
})) || [])

function formatCount(value: number) {
  if (value >= 1000) {
    return `${(value / 1000).toFixed(1)}k`
  }

  return String(value)
}

function toggleFollow() {
  if (creator.value) {
    following.toggleCreator(creator.value)
  }
}

useHead(() => ({
  title: creator.value ? `${creator.value.displayName} - Aoi` : "Creator - Aoi"
}))
</script>

<template>
  <div class="aoi-page">
    <PageState
      v-if="!pending && error"
      icon="user-x"
      title="创作者不存在"
      :description="`没有找到 @${route.params.handle} 对应的创作者。`"
      action-icon="search"
      action-label="去搜索"
      @action="navigateTo('/search')"
    />

    <article v-else-if="!pending && creator" class="creator-profile">
      <section v-aoi-reveal="'rise'" class="creator-profile__hero">
        <div class="creator-profile__avatar" aria-hidden="true">
          {{ creator.displayName.slice(0, 1).toUpperCase() }}
        </div>

        <PageHeader
          :eyebrow="`@${creator.handle}`"
          :title="creator.displayName"
          :description="creator.bio || '这个创作者还没有填写简介。'"
        >
          <template #actions>
            <AoiButton tone="accent"
              :variant="isFollowing ? 'tonal' : 'filled'"
              :icon="isFollowing ? 'user-check' : 'bell-plus'"
              :aria-label="isFollowing ? '取消关注' : '关注'"
              :disabled="!following.hydrated"
              @click="toggleFollow"
            >
              {{ isFollowing ? "已关注" : "关注" }}
            </AoiButton>
            <AoiButton tone="accent" variant="outlined" icon="search" :to="`/search?q=${encodeURIComponent(creator.displayName)}`">
              搜索作品
            </AoiButton>
          </template>
        </PageHeader>

        <div class="creator-profile__mobile-actions">
          <AoiButton tone="accent"
            :variant="isFollowing ? 'tonal' : 'filled'"
            :icon="isFollowing ? 'user-check' : 'bell-plus'"
            :aria-label="isFollowing ? '取消关注' : '关注'"
            :disabled="!following.hydrated"
            @click="toggleFollow"
          >
            {{ isFollowing ? "已关注" : "关注" }}
          </AoiButton>
          <AoiButton tone="accent" variant="outlined" icon="search" :to="`/search?q=${encodeURIComponent(creator.displayName)}`">
            搜索作品
          </AoiButton>
        </div>

        <AoiStatGrid class="creator-profile__stats" :items="creatorStats" :columns="3" />
      </section>

      <AoiTagList
        v-if="creator.categories.length"
        :items="categoryTags"
        aria-label="常见分区"
        reveal="fade"
      />

      <AoiSection title="最新投稿" title-id="creator-videos-title">
        <VideoGrid v-if="creator.latest.items.length" :videos="creator.latest.items" />
        <PageState
          v-else
          icon="video"
          title="暂无投稿"
          description="这个创作者还没有可展示的视频。"
        />
      </AoiSection>
    </article>

    <PageState
      v-else-if="!pending"
      icon="user"
      title="创作者加载中断"
      description="没有拿到创作者资料。"
      action-icon="refresh-cw"
      action-label="重试"
      @action="refresh()"
    />
  </div>
</template>

<style scoped>
.creator-profile,
.creator-profile__hero {
  display: grid;
  gap: 16px;
}

.creator-profile__hero {
  grid-template-columns: 88px minmax(0, 1fr);
  align-items: start;
  border: 1px solid var(--aoi-border);
  border-radius: var(--aoi-radius-sm);
  background:
    linear-gradient(135deg, rgba(34, 184, 207, 0.08), transparent 38%),
    var(--aoi-surface);
  box-shadow: var(--aoi-shadow-sm);
  padding: 18px;
}

.creator-profile__avatar {
  display: grid;
  width: 88px;
  height: 88px;
  place-items: center;
  border-radius: var(--aoi-radius-sm);
  background:
    linear-gradient(135deg, rgba(255, 255, 255, 0.26), transparent),
    linear-gradient(135deg, var(--aoi-accent-50), var(--aoi-sakura-50));
  box-shadow: var(--aoi-shadow-sm);
  color: white;
  font-size: 30px;
  font-weight: 900;
}

.creator-profile__stats {
  grid-column: 2;
}

.creator-profile__mobile-actions {
  display: none;
}

@media (max-width: 700px) {
  .creator-profile__hero {
    grid-template-columns: 1fr;
  }

  .creator-profile__stats {
    grid-column: auto;
    grid-template-columns: 1fr;
  }

  .creator-profile__mobile-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }
}
</style>
