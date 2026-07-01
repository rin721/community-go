<script setup lang="ts">
const route = useRoute()
const api = useAoiApi()
const following = useFollowingStore()
const { locale, t } = useI18n()
const handle = computed(() => String(route.params.handle || ""))
const displayHandle = computed(() => handle.value ? `@${handle.value}` : "@")

const { data: creator, error, pending, refresh } = useAsyncData(
  () => `creator-${handle.value}`,
  () => api.getCreatorProfile(handle.value),
  {
    watch: [handle]
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
const joinedDate = computed(() => {
  if (!creator.value) {
    return ""
  }

  const date = new Date(creator.value.joinedAt)
  if (Number.isNaN(date.getTime())) {
    return t("creator.unknownJoined")
  }

  return new Intl.DateTimeFormat(dateLocale.value, {
    month: "long",
    year: "numeric"
  }).format(date)
})
const isFollowing = computed(() => creator.value ? following.isFollowing(creator.value.id) : false)
const isFollowPending = computed(() => creator.value ? following.isPending(creator.value.id) : false)
const displayedFollowerCount = computed(() => creator.value ? following.followerCountFor(creator.value) : 0)
const creatorDescription = computed(() => creator.value?.bio || t("creator.emptyBio"))
const creatorStats = computed(() => creator.value
  ? [
      { icon: "users-round", label: t("creator.stats.followers"), value: formatCount(displayedFollowerCount.value) },
      { icon: "video", label: t("creator.stats.videos"), value: formatCount(creator.value.videoCount) },
      { icon: "calendar-days", label: t("creator.stats.joined"), value: joinedDate.value }
    ]
  : [])
const categoryTags = computed(() => creator.value?.categories.map((category) => ({
  label: category.name,
  to: `/category/${category.slug}`,
  value: category.id
})) || [])
const followButtonAria = computed(() => creator.value
  ? t(isFollowing.value ? "creator.unfollowAria" : "creator.followAria", { name: creator.value.displayName })
  : t("creator.follow"))
const searchTarget = computed(() => creator.value
  ? `/search?q=${encodeURIComponent(creator.value.displayName)}`
  : "/search")

function formatCount(value: number) {
  return new Intl.NumberFormat(dateLocale.value, {
    maximumFractionDigits: 1,
    notation: value >= 1000 ? "compact" : "standard"
  }).format(value)
}

async function toggleFollow() {
  if (creator.value) {
    await following.toggleCreator(creator.value)
  }
}

useHead(() => ({
  title: creator.value ? `${creator.value.displayName} - Aoi` : `${t("creator.headTitle")} - Aoi`
}))
</script>

<template>
  <div class="aoi-page creator-page">
    <section
      v-if="pending"
      class="creator-loading"
      :aria-label="t('creator.loadingTitle')"
      aria-live="polite"
    >
      <span class="creator-loading__sr">
        {{ t("creator.loadingTitle") }}. {{ t("creator.loadingDescription") }}
      </span>
      <div class="creator-loading__avatar" aria-hidden="true" />
      <div class="creator-loading__copy">
        <span class="creator-loading__line creator-loading__line--title" />
        <span class="creator-loading__line" />
        <span class="creator-loading__line creator-loading__line--short" />
      </div>
    </section>

    <PageState
      v-else-if="error"
      icon="user-x"
      :title="t('creator.errorTitle')"
      :description="t('creator.errorDescription', { handle: displayHandle })"
      action-icon="search"
      :action-label="t('creator.searchAction')"
      @action="navigateTo('/search')"
    />

    <article v-else-if="creator" class="creator-profile">
      <section v-aoi-reveal="'rise'" class="creator-profile__hero">
        <div class="creator-profile__identity">
          <div class="creator-profile__avatar-container">
            <img
              v-if="creator.avatarUrl"
              :src="creator.avatarUrl"
              :alt="creator.displayName"
              class="creator-profile__avatar creator-profile__avatar--img"
            />
            <div v-else class="creator-profile__avatar" aria-hidden="true">
              {{ creator.displayName.slice(0, 1).toUpperCase() }}
            </div>
          </div>
          <span class="creator-profile__handle" :title="`@${creator.handle}`">@{{ creator.handle }}</span>
        </div>

        <div class="creator-profile__content">
          <PageHeader
            :eyebrow="t('creator.profileEyebrow')"
            :title="creator.displayName"
            :description="creatorDescription"
          >
            <template #actions>
              <AoiButton
                tone="accent"
                :variant="isFollowing ? 'tonal' : 'filled'"
                :icon="isFollowing ? 'user-check' : 'bell-plus'"
                :aria-label="followButtonAria"
                :disabled="!following.hydrated || isFollowPending"
                :loading="isFollowPending"
                @click="toggleFollow"
              >
                {{ isFollowPending ? t("creator.followSyncing") : isFollowing ? t("creator.following") : t("creator.follow") }}
              </AoiButton>
              <AoiButton tone="accent" variant="outlined" icon="search" :to="searchTarget">
                {{ t("creator.searchWorks") }}
              </AoiButton>
            </template>
          </PageHeader>

          <p class="creator-profile__source">
            <AoiIcon name="sparkles" :size="14" decorative />
            {{ t("creator.sourceNote") }}
          </p>
        </div>

        <div class="creator-profile__mobile-actions">
          <AoiButton
            tone="accent"
            :variant="isFollowing ? 'tonal' : 'filled'"
            :icon="isFollowing ? 'user-check' : 'bell-plus'"
            :aria-label="followButtonAria"
            :disabled="!following.hydrated || isFollowPending"
            :loading="isFollowPending"
            @click="toggleFollow"
          >
            {{ isFollowPending ? t("creator.followSyncing") : isFollowing ? t("creator.following") : t("creator.follow") }}
          </AoiButton>
          <AoiButton tone="accent" variant="outlined" icon="search" :to="searchTarget">
            {{ t("creator.searchWorks") }}
          </AoiButton>
        </div>

        <AoiStatGrid class="creator-profile__stats" :items="creatorStats" :columns="3" />
      </section>

      <AoiTagList
        v-if="creator.categories.length"
        :items="categoryTags"
        :aria-label="t('creator.categoriesAria')"
        reveal="fade"
        tone="accent"
      />

      <AoiSection :title="t('creator.latestTitle')" title-id="creator-videos-title">
        <VideoGrid v-if="creator.latest.items.length" :videos="creator.latest.items" />
        <PageState
          v-else
          icon="video"
          :title="t('creator.emptyVideosTitle')"
          :description="t('creator.emptyVideosDescription')"
        />
      </AoiSection>
    </article>

    <PageState
      v-else
      icon="user"
      :title="t('creator.noContentTitle')"
      :description="t('creator.noContentDescription')"
      action-icon="refresh-cw"
      :action-label="t('creator.retry')"
      @action="refresh()"
    />
  </div>
</template>

<style scoped>
.creator-page,
.creator-profile,
.creator-profile__hero {
  display: grid;
  gap: 16px;
}

.creator-loading,
.creator-profile__hero {
  position: relative;
  overflow: hidden;
  border: 1px solid var(--aoi-surface-border);
  border-radius: var(--aoi-radius-sm);
  background:
    linear-gradient(135deg, color-mix(in srgb, var(--aoi-accent-10) 72%, transparent), transparent 42%),
    linear-gradient(180deg, color-mix(in srgb, var(--aoi-surface-solid) 86%, transparent), var(--aoi-surface));
  box-shadow: var(--aoi-shadow-sm);
  padding: 18px;
}

.creator-profile__hero {
  overflow: visible;
  border: 0;
  background: transparent;
  box-shadow: none;
  padding: 0;
}

.creator-loading {
  grid-template-columns: 88px minmax(0, 1fr);
  align-items: center;
  gap: 16px;
}

.creator-loading__sr {
  position: absolute;
  overflow: hidden;
  width: 1px;
  height: 1px;
  padding: 0;
  border: 0;
  clip: rect(0 0 0 0);
  white-space: nowrap;
}

.creator-loading__avatar,
.creator-loading__line {
  background: linear-gradient(110deg, var(--aoi-accent-10), var(--aoi-surface-muted), var(--aoi-accent-10));
  background-size: 200% 100%;
  animation: creator-loading-shimmer 1.2s var(--aoi-ease-out) infinite;
}

.creator-loading__avatar {
  width: 88px;
  height: 88px;
  border-radius: var(--aoi-radius-sm);
}

.creator-loading__copy {
  display: grid;
  min-width: 0;
  gap: 10px;
}

.creator-loading__line {
  display: block;
  width: min(100%, 560px);
  height: 10px;
  border-radius: var(--aoi-radius-round);
}

.creator-loading__line--title {
  width: min(62%, 280px);
  height: 18px;
}

.creator-loading__line--short {
  width: min(42%, 220px);
}

.creator-profile__hero {
  grid-template-columns: minmax(112px, 136px) minmax(0, 1fr);
  align-items: start;
}

.creator-profile__identity {
  display: grid;
  min-width: 0;
  gap: 10px;
  justify-items: center;
}

.creator-profile__avatar {
  display: grid;
  width: 88px;
  height: 88px;
  place-items: center;
  border: 1px solid color-mix(in srgb, var(--aoi-accent-50) 44%, transparent);
  border-radius: var(--aoi-radius-sm);
  background:
    linear-gradient(135deg, rgba(255, 255, 255, 0.28), transparent),
    linear-gradient(135deg, var(--aoi-accent-50), var(--aoi-sakura-50));
  box-shadow: var(--aoi-shadow-sm);
  color: white;
  font-size: 30px;
  font-weight: 900;
}

.creator-profile__avatar--img {
  object-fit: cover;
  border-radius: var(--aoi-radius-round);
}

.creator-profile__handle,
.creator-profile__source {
  min-width: 0;
  overflow-wrap: anywhere;
}

.creator-profile__handle {
  width: 100%;
  overflow: hidden;
  color: var(--aoi-accent-60);
  font-size: 12px;
  font-weight: 850;
  text-align: center;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.creator-profile__content {
  display: grid;
  min-width: 0;
  gap: 10px;
}

.creator-profile__source {
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
  margin: -8px 0 0;
  padding: 6px 10px;
}

.creator-profile__stats {
  grid-column: 2;
}

.creator-profile__mobile-actions {
  display: none;
}

@media (max-width: 700px) {
  .creator-loading,
  .creator-profile__hero {
    grid-template-columns: 1fr;
  }

  .creator-loading__avatar,
  .creator-profile__avatar {
    width: 72px;
    height: 72px;
  }

  .creator-profile__identity {
    justify-items: start;
  }

  .creator-profile__handle {
    text-align: start;
  }

  .creator-profile__stats {
    grid-column: auto;
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .creator-profile__mobile-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }
}

@media (max-width: 420px) {
  .creator-profile__stats {
    grid-template-columns: 1fr;
  }
}

@media (prefers-reduced-motion: reduce) {
  .creator-loading__avatar,
  .creator-loading__line {
    animation: none;
  }
}

@keyframes creator-loading-shimmer {
  from {
    background-position: 120% 0;
  }

  to {
    background-position: -80% 0;
  }
}
</style>
