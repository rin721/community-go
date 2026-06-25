import type { CreatorProfile } from "~/types/api"
import type { FollowedCreatorSnapshot } from "~/types/following"

const STORAGE_KEY = "aoi.following.v1"

interface PersistedFollowingState {
  followedCreators: Record<string, FollowedCreatorSnapshot>
}

function emptyState(): PersistedFollowingState {
  return {
    followedCreators: {}
  }
}

function snapshotCreator(creator: CreatorProfile): FollowedCreatorSnapshot {
  return {
    ...creator,
    categories: creator.categories.map((category) => ({ ...category })),
    followedAt: new Date().toISOString(),
    latest: {
      items: creator.latest.items.map((video) => ({
        ...video,
        categories: video.categories.map((category) => ({ ...category })),
        uploader: { ...video.uploader }
      })),
      nextCursor: creator.latest.nextCursor
    }
  }
}

function coercePersistedState(value: unknown): PersistedFollowingState {
  if (!isRecord(value)) {
    return emptyState()
  }

  const candidate = value as Partial<PersistedFollowingState>

  return {
    followedCreators: isRecord(candidate.followedCreators)
      ? Object.fromEntries(Object.entries(candidate.followedCreators).filter(([, creator]) => isFollowedCreator(creator)))
      : {}
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value))
}

function isFollowedCreator(value: unknown): value is FollowedCreatorSnapshot {
  if (!isRecord(value)) {
    return false
  }

  const creator = value as Partial<FollowedCreatorSnapshot>

  return typeof creator.id === "string"
    && typeof creator.handle === "string"
    && typeof creator.displayName === "string"
    && typeof creator.followedAt === "string"
    && typeof creator.followerCount === "number"
    && typeof creator.videoCount === "number"
    && Boolean(creator.latest && Array.isArray(creator.latest.items))
}

export const useFollowingStore = defineStore("following", () => {
  const followedCreators = ref<Record<string, FollowedCreatorSnapshot>>({})
  const hydrated = ref(false)

  const followedList = computed(() => Object.values(followedCreators.value)
    .sort((a, b) => Date.parse(b.followedAt) - Date.parse(a.followedAt)))
  const followedCount = computed(() => followedList.value.length)
  const followedIds = computed(() => new Set(followedList.value.map((creator) => creator.id)))
  const followedHandles = computed(() => new Set(followedList.value.map((creator) => creator.handle)))
  const latestVideos = computed(() => followedList.value
    .flatMap((creator) => creator.latest.items)
    .sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt)))

  function assignState(state: PersistedFollowingState) {
    followedCreators.value = state.followedCreators
  }

  function persist() {
    if (!import.meta.client || !hydrated.value) {
      return
    }

    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify({
        followedCreators: followedCreators.value
      } satisfies PersistedFollowingState))
    } catch {
      // Local following is optional prototype data.
    }
  }

  function restore() {
    if (!import.meta.client) {
      return
    }

    try {
      const raw = window.localStorage.getItem(STORAGE_KEY)
      assignState(raw ? coercePersistedState(JSON.parse(raw)) : emptyState())
    } catch {
      assignState(emptyState())
    } finally {
      hydrated.value = true
    }
  }

  function followCreator(creator: CreatorProfile) {
    followedCreators.value = {
      ...followedCreators.value,
      [creator.id]: snapshotCreator(creator)
    }
  }

  function unfollowCreator(creatorId: string) {
    if (!followedCreators.value[creatorId]) {
      return
    }

    const next = { ...followedCreators.value }
    delete next[creatorId]
    followedCreators.value = next
  }

  function toggleCreator(creator: CreatorProfile) {
    if (isFollowing(creator.id)) {
      unfollowCreator(creator.id)
      return
    }

    followCreator(creator)
  }

  function isFollowing(creatorId: string) {
    return Boolean(followedCreators.value[creatorId])
  }

  function resetFollowing() {
    assignState(emptyState())

    if (import.meta.client) {
      try {
        window.localStorage.removeItem(STORAGE_KEY)
      } catch {
        // Local following is optional prototype data.
      }
    }
  }

  if (import.meta.client) {
    watch(followedCreators, persist, { deep: true })
  }

  return {
    followCreator,
    followedCount,
    followedCreators,
    followedHandles,
    followedIds,
    followedList,
    hydrated,
    isFollowing,
    latestVideos,
    resetFollowing,
    restore,
    toggleCreator,
    unfollowCreator
  }
})
