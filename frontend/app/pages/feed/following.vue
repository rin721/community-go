<script setup lang="ts">
const api = useAoiApi()
const following = useFollowingStore()
const { locale, t } = useI18n()
const dynamicAuthorName = ref(t("dynamics.composer.defaultAuthor"))
const dynamicError = ref("")
const dynamicSubmitRevision = ref(0)
const dynamicSubmitting = ref(false)

const { data: feed, error, pending, refresh } = useAsyncData(
  "following-feed",
  () => api.getFollowingFeed(following.clientId || undefined),
  {
    immediate: false,
    server: false
  }
)
const dateLocale = computed(() => {
  if (locale.value === "ja") {
    return "ja-JP"
  }
  if (locale.value === "en") {
    return "en-US"
  }
  return "zh-CN"
})
const isLoadingFeed = computed(() => pending.value || (!feed.value && !error.value))
const recommendedCreators = computed(() => feed.value?.followingCount
  ? []
  : feed.value?.creators.filter((creator) => !following.isFollowing(creator.id)) || [])
const feedMessage = computed(() => following.syncError || feed.value?.message)
const dynamicItems = computed(() => feed.value?.dynamics.items || [])
const latestItems = computed(() => feed.value?.latest.items || [])
const activeClientId = computed(() => following.clientId || feed.value?.clientId || "")
const maskedClientId = computed(() => activeClientId.value
  ? `...${activeClientId.value.slice(-8)}`
  : t("following.clientPending"))
const sourceLabel = computed(() => {
  if (isLoadingFeed.value) {
    return t("following.sourceLoading")
  }
  if (!feed.value) {
    return t("following.sourceMissing")
  }
  if (feed.value.authenticated) {
    return t("following.sourceAuthenticated", {
      count: formatCount(feed.value.followingCount)
    })
  }
  if (feed.value.followingCount > 0) {
    return t("following.sourceAnonymous", {
      count: formatCount(feed.value.followingCount)
    })
  }
  return t("following.sourceRecommended", {
    creators: formatCount(recommendedCreators.value.length),
    videos: formatCount(latestItems.value.length)
  })
})
const followingStats = computed(() => [
  {
    description: t("following.stats.followingDescription"),
    icon: "user-check",
    label: t("following.stats.following"),
    value: formatCount(feed.value?.followingCount ?? following.followedCount)
  },
  {
    description: t("following.stats.creatorsDescription"),
    icon: "users",
    label: t("following.stats.creators"),
    value: formatCount(feed.value?.creators.length ?? following.followedCount)
  },
  {
    description: t("following.stats.latestDescription"),
    icon: "play-square",
    label: t("following.stats.latest"),
    value: formatCount((following.latestVideos.length || latestItems.value.length))
  },
  {
    description: t("following.stats.dynamicsDescription"),
    icon: "radio-tower",
    label: t("following.stats.dynamics"),
    value: formatCount(dynamicItems.value.length)
  }
])

watch(feed, (value) => {
  if (value) {
    following.applyBackendFeed(value)
  }
})

onMounted(async () => {
  if (!following.hydrated) {
    following.restore()
  }
  await refresh()
})

function formatCount(value: number) {
  return new Intl.NumberFormat(dateLocale.value, {
    maximumFractionDigits: 1,
    notation: value >= 1000 ? "compact" : "standard"
  }).format(value)
}

async function publishDynamic(body: string) {
  dynamicError.value = ""
  dynamicSubmitting.value = true

  try {
    await api.createCommunityDynamic({
      authorName: dynamicAuthorName.value.trim(),
      body,
      clientId: following.ensureClientId()
    })
    dynamicSubmitRevision.value += 1
    await refresh()
  } catch (error) {
    dynamicError.value = error instanceof Error
      ? error.message
      : t("dynamics.composer.error")
  } finally {
    dynamicSubmitting.value = false
  }
}

useHead(() => ({
  title: t("following.headTitle")
}))
</script>

<template>
  <div class="aoi-page following-page">
    <section v-aoi-reveal="'rise'" class="following-hero" :aria-label="t('following.title')">
      <PageHeader
        icon="radio-tower"
        :eyebrow="t('following.eyebrow')"
        :title="t('following.title')"
        :description="t('following.description')"
      >
        <template #actions>
          <AoiButton tone="accent" variant="tonal" icon="search" to="/search">
            {{ t("following.searchAction") }}
          </AoiButton>
          <AoiButton tone="neutral" variant="outlined" icon="refresh-cw" @click="refresh()">
            {{ t("following.refresh") }}
          </AoiButton>
        </template>
      </PageHeader>

      <div class="following-hero__meta">
        <p class="following-hero__source">
          <AoiIcon name="database" :size="14" decorative />
          {{ sourceLabel }}
        </p>
        <p class="following-hero__source">
          <AoiIcon name="fingerprint" :size="14" decorative />
          {{ t("following.clientLabel", { client: maskedClientId }) }}
        </p>
      </div>
    </section>

    <AoiStatGrid
      v-if="feed && !error"
      class="following-page__stats"
      :items="followingStats"
      :columns="4"
      reveal="fade"
    />

    <section
      v-if="isLoadingFeed"
      class="following-loading"
      :aria-label="t('following.loadingTitle')"
      aria-live="polite"
    >
      <span class="following-loading__sr">
        {{ t("following.loadingTitle") }}. {{ t("following.loadingDescription") }}
      </span>
      <div class="following-loading__header" aria-hidden="true">
        <span class="following-loading__line following-loading__line--title" />
        <span class="following-loading__line" />
      </div>
      <div class="following-loading__cards" aria-hidden="true">
        <span v-for="item in 6" :key="item" class="following-loading__card" />
      </div>
    </section>

    <PageState
      v-else-if="error"
      icon="cloud-alert"
      :title="t('following.errorTitle')"
      :description="t('following.errorDescription')"
      action-icon="refresh-cw"
      :action-label="t('following.retry')"
      @action="refresh()"
    />

    <template v-else-if="feed">
      <PageState
        v-if="!feed.authenticated && following.hydrated && following.followedCount === 0"
        icon="user-round-plus"
        :title="t('following.emptyTitle')"
        :description="feedMessage || t('following.emptyDescription')"
        action-icon="search"
        :action-label="t('following.searchAction')"
        @action="navigateTo('/search')"
      />

      <AoiSection
        icon="sparkles"
        :title="t('following.dynamicComposerTitle')"
        :description="t('following.dynamicComposerDescription')"
        title-id="following-dynamic-composer-title"
      >
        <CommentComposer
          v-model:author-name="dynamicAuthorName"
          :author-label="t('dynamics.composer.authorLabel')"
          :body-label="t('dynamics.composer.bodyLabel')"
          :body-placeholder="t('dynamics.composer.bodyPlaceholder')"
          :hint="t('dynamics.composer.hint')"
          :submit-label="t('dynamics.composer.submit')"
          :error-text="dynamicError"
          :submitting="dynamicSubmitting"
          :submit-revision="dynamicSubmitRevision"
          :max-body-length="280"
          @submit="publishDynamic"
        />
      </AoiSection>

      <CommunityPulse
        :items="dynamicItems"
        :title="t('following.dynamicsTitle')"
        :description="feedMessage || t('following.dynamicsDescription')"
      />

      <div
        v-if="following.hydrated && (following.followedList.length || following.latestVideos.length)"
        class="following-dashboard"
      >
        <AoiSection
          v-if="following.followedList.length"
          :title="t('following.followedTitle')"
          :description="feedMessage || t('following.followedDescription')"
          title-id="following-creators-title"
        >
          <template #actions>
            <AoiButton tone="accent" variant="outlined" size="sm" icon="refresh-cw" @click="refresh()">
              {{ t("following.refresh") }}
            </AoiButton>
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
          v-if="following.latestVideos.length"
          :title="t('following.latestTitle')"
          title-id="following-latest-title"
        >
          <VideoGrid :videos="following.latestVideos" />
        </AoiSection>
      </div>

      <AoiSection
        v-if="recommendedCreators.length"
        :title="t('following.recommendedTitle')"
        :description="t('following.recommendedDescription')"
        title-id="following-recommended-title"
      >
        <template #actions>
          <AoiButton tone="accent" variant="outlined" size="sm" icon="search" to="/search">
            {{ t("following.exploreMore") }}
          </AoiButton>
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
        v-if="!following.latestVideos.length && latestItems.length"
        :title="t('following.recommendedLatestTitle')"
        :description="t('following.recommendedLatestDescription')"
        title-id="following-recommended-latest-title"
      >
        <VideoGrid :videos="latestItems" />
      </AoiSection>
    </template>

    <PageState
      v-else
      icon="user-round-plus"
      :title="t('following.noContentTitle')"
      :description="t('following.noContentDescription')"
      action-icon="refresh-cw"
      :action-label="t('following.retry')"
      @action="refresh()"
    />
  </div>
</template>

<style scoped>
.following-page {
  display: grid;
  gap: 18px;
}

.following-hero {
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

.following-hero :deep(.page-header) {
  margin: 0;
}

.following-hero :deep(.page-header__description) {
  max-width: 780px;
  text-wrap: pretty;
}

.following-hero__meta {
  display: flex;
  min-width: 0;
  flex-wrap: wrap;
  gap: 8px;
}

.following-hero__source {
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

.following-page__stats,
.following-card-reveal {
  min-width: 0;
}

.following-dashboard {
  display: grid;
  grid-template-columns: minmax(280px, 420px) minmax(0, 1fr);
  align-items: start;
  gap: 18px;
}

.following-loading {
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

.following-loading__sr {
  position: absolute;
  overflow: hidden;
  width: 1px;
  height: 1px;
  padding: 0;
  border: 0;
  clip: rect(0 0 0 0);
  white-space: nowrap;
}

.following-loading__header {
  display: grid;
  gap: 10px;
}

.following-loading__line,
.following-loading__card {
  background: linear-gradient(110deg, var(--aoi-accent-10), var(--aoi-surface-muted), var(--aoi-accent-10));
  background-size: 200% 100%;
  animation: following-loading-shimmer 1.2s var(--aoi-ease-out) infinite;
}

.following-loading__line {
  display: block;
  width: min(100%, 640px);
  height: 10px;
  border-radius: var(--aoi-radius-round);
}

.following-loading__line--title {
  width: min(52%, 320px);
  height: 18px;
}

.following-loading__cards {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: var(--aoi-grid-gap-compact);
}

.following-loading__card {
  min-height: 132px;
  border-radius: var(--aoi-radius-sm);
}

@media (max-width: 900px) {
  .following-dashboard,
  .following-loading__cards {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 560px) {
  .following-hero__meta {
    display: grid;
  }
}

@media (prefers-reduced-motion: reduce) {
  .following-loading__line,
  .following-loading__card {
    animation: none;
  }
}

@keyframes following-loading-shimmer {
  from {
    background-position: 120% 0;
  }

  to {
    background-position: -80% 0;
  }
}
</style>
