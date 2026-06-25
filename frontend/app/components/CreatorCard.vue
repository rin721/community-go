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
const isFollowing = computed(() => following.isFollowing(props.creator.id))

function formatCount(value: number) {
  if (value >= 1000) {
    return `${(value / 1000).toFixed(1)}k`
  }

  return String(value)
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
      <span class="creator-card__avatar" aria-hidden="true">
        {{ creator.displayName.slice(0, 1).toUpperCase() }}
      </span>
    </template>
    <template #title>{{ creator.displayName }}</template>
    <template #subtitle>@{{ creator.handle }}</template>
    <template v-if="creator.bio" #description>{{ creator.bio }}</template>
    <template #meta>
      <span>
        <AoiIcon name="users" :size="13" decorative />
        {{ formatCount(creator.followerCount + (isFollowing ? 1 : 0)) }}
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
        :aria-label="isFollowing ? `取消关注 ${creator.displayName}` : `关注 ${creator.displayName}`"
        :disabled="!following.hydrated"
        @click="following.toggleCreator(creator)"
      >
        {{ isFollowing ? "已关注" : "关注" }}
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
