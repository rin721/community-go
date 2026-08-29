<script setup lang="ts">
import type { CreatorProfile } from "~/types/api"

const props = withDefaults(defineProps<{
  creator: CreatorProfile
  density?: "default" | "compact"
  showActions?: boolean
}>(), {
  density: "default",
  showActions: true
})

const following = useFollowingStore()
const { t } = useI18n()
const isFollowing = computed(() => following.isFollowing(props.creator.id))
const isFollowPending = computed(() => following.isPending(props.creator.id))
const followerCount = computed(() => following.followerCountFor(props.creator))

function formatCount(value: number) {
  if (value >= 1000) {
    return `${(value / 1000).toFixed(1)}k`
  }

  return String(value)
}

async function toggleFollow() {
  await following.toggleCreator(props.creator)
}
</script>

<template>
  <AoiInfoCard
    class="creator-card"
    :class="`creator-card--${props.density}`"
    :to="`/u/${creator.handle}`"
    :aria-label="creator.displayName"
    layout="inline"
    :density="props.density"
    interactive
  >
    <template #media>
      <img
        v-if="creator.avatarUrl"
        :src="creator.avatarUrl"
        :alt="creator.displayName"
        class="creator-card__avatar creator-card__avatar--img"
      />
      <span v-else class="creator-card__avatar" aria-hidden="true">
        {{ creator.displayName.slice(0, 1).toUpperCase() }}
      </span>
    </template>
    <template #title>{{ creator.displayName }}</template>
    <template #subtitle>@{{ creator.handle }}</template>
    <template v-if="creator.bio" #description>{{ creator.bio }}</template>
    <template #meta>
      <span>
        <AoiIcon name="users" :size="13" decorative />
        {{ formatCount(followerCount) }}
      </span>
      <span>
        <AoiIcon name="video" :size="13" decorative />
        {{ creator.videoCount }}
      </span>
    </template>
    <template v-if="showActions" #actions>
      <AoiButton tone="accent"
        variant="outlined"
        size="sm"
        :icon="isFollowing ? 'user-check' : 'user-plus'"
        :aria-label="isFollowing ? t('creator.unfollowAria', { name: creator.displayName }) : t('creator.followAria', { name: creator.displayName })"
        :disabled="!following.hydrated || isFollowPending"
        :loading="isFollowPending"
        @click.prevent.stop="toggleFollow"
      >
        {{ isFollowPending ? t("creator.followSyncing") : isFollowing ? t("creator.following") : t("creator.follow") }}
      </AoiButton>
    </template>
  </AoiInfoCard>
</template>

<style scoped>
.creator-card__avatar {
  display: grid;
  width: 100%;
  height: var(--aoi-info-card-media-size);
  place-items: center;
  border-radius: var(--aoi-radius-sm);
  background:
    linear-gradient(135deg, rgba(255, 255, 255, 0.28), transparent),
    linear-gradient(135deg, var(--aoi-accent-40), var(--aoi-sakura-40));
  color: white;
  font-weight: 850;
}

.creator-card__avatar--img {
  object-fit: cover;
  border-radius: var(--aoi-radius-round);
}

.creator-card :deep(.aoi-info-card__meta span) {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.creator-card--compact :deep(.aoi-info-card__description) {
  -webkit-line-clamp: 1;
}

@media (max-width: 639px) {
  .creator-card :deep(.aoi-info-card__actions) {
    justify-content: flex-end;
  }
}
</style>
