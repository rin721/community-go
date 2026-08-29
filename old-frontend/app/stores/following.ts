import type { AoiApiErrorPayload, CreatorFollowState, CreatorProfile, FollowingFeedPayload } from "~/types/api"
import type { FollowedCreatorSnapshot } from "~/types/following"

const STORAGE_KEY = "aoi.following.v1"
const CLIENT_ID_STORAGE_KEY = "aoi.community.clientId.v1"

interface PersistedFollowingState {
  followedCreators: Record<string, FollowedCreatorSnapshot>
}

type FollowScope = "account" | "anonymous"

function emptyState(): PersistedFollowingState {
  return {
    followedCreators: {}
  }
}

function snapshotCreator(creator: CreatorProfile, options: {
  followedAt?: string | null
  followerCount?: number
} = {}): FollowedCreatorSnapshot {
  return {
    ...creator,
    categories: creator.categories.map((category) => ({ ...category })),
    followedAt: options.followedAt || creator.followedAt || new Date().toISOString(),
    followerCount: options.followerCount ?? creator.followerCount,
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

function createClientId() {
  const random = globalThis.crypto?.randomUUID?.() || Math.random().toString(36).slice(2)

  return `aoi-client-${random}`.slice(0, 96)
}

function normalizeClientId(value: string | null | undefined) {
  const normalized = String(value || "").trim()

  return normalized && normalized.length <= 96 ? normalized : ""
}

function isAccountClientId(value: string) {
  return value.startsWith("account:")
}

function errorMessage(error: unknown) {
  const apiError = error as Partial<AoiApiErrorPayload>

  return apiError.message || "社区关注接口暂时不可用，已使用本地降级。"
}

export const useFollowingStore = defineStore("following", () => {
  const authSession = useAuthSessionStore()
  const backendReady = ref(false)
  const clientId = ref("")
  const followedCreators = ref<Record<string, FollowedCreatorSnapshot>>({})
  const hydrated = ref(false)
  const followScope = ref<FollowScope>("anonymous")
  const pendingCreatorIds = ref<Record<string, boolean>>({})
  const syncError = ref<string | null>(null)

  const followedList = computed(() => Object.values(followedCreators.value)
    .sort((a, b) => Date.parse(b.followedAt) - Date.parse(a.followedAt)))
  const followedCount = computed(() => followedList.value.length)
  const followedIds = computed(() => new Set(followedList.value.map((creator) => creator.id)))
  const followedHandles = computed(() => new Set(followedList.value.map((creator) => creator.handle)))
  const latestVideos = computed(() => followedList.value
    .flatMap((creator) => creator.latest.items)
    .sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt)))
  const communityAccountActive = computed(() => authSession.authenticated)

  function assignState(state: PersistedFollowingState) {
    followedCreators.value = state.followedCreators
  }

  function ensureClientId() {
    if (clientId.value) {
      return clientId.value
    }

    clientId.value = createClientId()
    persistClientId()

    return clientId.value
  }

  function persist() {
    if (!import.meta.client || !hydrated.value || followScope.value !== "anonymous") {
      return
    }

    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify({
        followedCreators: followedCreators.value
      } satisfies PersistedFollowingState))
    } catch {
      // 本地关注只是同步不可用时的降级缓存。
    }
  }

  function persistClientId() {
    if (!import.meta.client || !clientId.value) {
      return
    }

    try {
      window.localStorage.setItem(CLIENT_ID_STORAGE_KEY, clientId.value)
    } catch {
      // clientId 只用于匿名社区关系；写入失败时仍可在内存中工作。
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
    }

    try {
      clientId.value = normalizeClientId(window.localStorage.getItem(CLIENT_ID_STORAGE_KEY)) || createClientId()
      persistClientId()
    } catch {
      clientId.value = createClientId()
    } finally {
      hydrated.value = true
    }
  }

  function applyBackendFeed(feed: FollowingFeedPayload) {
    if (!feed.clientId) {
      return
    }

    const normalizedClientId = normalizeClientId(feed.clientId)
    const accountScoped = feed.authenticated || isAccountClientId(normalizedClientId)
    followScope.value = accountScoped ? "account" : "anonymous"
    if (normalizedClientId && !accountScoped) {
      clientId.value = normalizedClientId
      persistClientId()
    }

    backendReady.value = true
    syncError.value = null

    if (feed.followingCount > 0) {
      followedCreators.value = Object.fromEntries(feed.creators.map((creator) => [
        creator.id,
        snapshotCreator(creator, {
          followedAt: creator.followedAt,
          followerCount: creator.followerCount
        })
      ]))
      return
    }

    followedCreators.value = {}
  }

  async function syncWithBackend() {
    if (!hydrated.value) {
      return null
    }

    const api = useAoiApi()

    try {
      if (!authSession.hydrated) {
        await authSession.refreshSession({ silent: true })
      }
      const feed = communityAccountActive.value
        ? await api.getAccountFollowingFeed()
        : await api.getFollowingFeed(ensureClientId())
      applyBackendFeed(feed)
      return feed
    } catch (error) {
      backendReady.value = false
      syncError.value = errorMessage(error)
      return null
    }
  }

  function applyFollowState(creator: CreatorProfile, state: CreatorFollowState) {
    if (state.following) {
      followedCreators.value = {
        ...followedCreators.value,
        [creator.id]: snapshotCreator(creator, {
          followedAt: state.followedAt,
          followerCount: state.followerCount
        })
      }
      return
    }

    removeLocalCreator(creator.id)
  }

  function setPending(creatorId: string, value: boolean) {
    pendingCreatorIds.value = {
      ...pendingCreatorIds.value,
      [creatorId]: value
    }

    if (!value) {
      const next = { ...pendingCreatorIds.value }
      delete next[creatorId]
      pendingCreatorIds.value = next
    }
  }

  async function followCreator(creator: CreatorProfile) {
    if (!hydrated.value) {
      return
    }

    const api = useAoiApi()
    setPending(creator.id, true)

    try {
      if (!authSession.hydrated) {
        await authSession.refreshSession({ silent: true })
      }
      const accountScoped = communityAccountActive.value
      followScope.value = accountScoped ? "account" : "anonymous"
      const state = accountScoped
        ? await api.followAccountCreator(creator.handle)
        : await api.followCreator(creator.handle, { clientId: ensureClientId() })
      backendReady.value = true
      syncError.value = null
      applyFollowState(creator, state)
    } catch (error) {
      backendReady.value = false
      syncError.value = errorMessage(error)
      followedCreators.value = {
        ...followedCreators.value,
        [creator.id]: snapshotCreator(creator, {
          followerCount: creator.followerCount + 1
        })
      }
    } finally {
      setPending(creator.id, false)
    }
  }

  async function unfollowCreator(creatorOrId: CreatorProfile | string) {
    const creatorId = typeof creatorOrId === "string" ? creatorOrId : creatorOrId.id
    const snapshot = followedCreators.value[creatorId]
    const handle = typeof creatorOrId === "string" ? snapshot?.handle : creatorOrId.handle

    if (!hydrated.value || !handle) {
      removeLocalCreator(creatorId)
      return
    }

    const api = useAoiApi()
    setPending(creatorId, true)

    try {
      if (!authSession.hydrated) {
        await authSession.refreshSession({ silent: true })
      }
      const accountScoped = communityAccountActive.value
      followScope.value = accountScoped ? "account" : "anonymous"
      if (accountScoped) {
        await api.unfollowAccountCreator(handle)
      } else {
        await api.unfollowCreator(handle, ensureClientId())
      }
      backendReady.value = true
      syncError.value = null
      removeLocalCreator(creatorId)
    } catch (error) {
      backendReady.value = false
      syncError.value = errorMessage(error)
      removeLocalCreator(creatorId)
    } finally {
      setPending(creatorId, false)
    }
  }

  async function toggleCreator(creator: CreatorProfile) {
    if (isFollowing(creator.id)) {
      await unfollowCreator(creator)
      return
    }

    await followCreator(creator)
  }

  function isFollowing(creatorId: string) {
    return Boolean(followedCreators.value[creatorId])
  }

  function isPending(creatorId: string) {
    return Boolean(pendingCreatorIds.value[creatorId])
  }

  function followerCountFor(creator: CreatorProfile) {
    return followedCreators.value[creator.id]?.followerCount ?? creator.followerCount
  }

  function removeLocalCreator(creatorId: string) {
    if (!followedCreators.value[creatorId]) {
      return
    }

    const next = { ...followedCreators.value }
    delete next[creatorId]
    followedCreators.value = next
  }

  function resetFollowing() {
    followScope.value = "anonymous"
    assignState(emptyState())
    backendReady.value = false
    syncError.value = null

    if (import.meta.client) {
      try {
        window.localStorage.removeItem(STORAGE_KEY)
      } catch {
        // 本地关注只是同步不可用时的降级缓存。
      }
    }
  }

  if (import.meta.client) {
    watch(followedCreators, persist, { deep: true })
  }

  return {
    applyBackendFeed,
    backendReady,
    clientId,
    ensureClientId,
    followCreator,
    followedCount,
    followedCreators,
    followedHandles,
    followedIds,
    followedList,
    followerCountFor,
    hydrated,
    isFollowing,
    isPending,
    latestVideos,
    resetFollowing,
    restore,
    syncError,
    syncWithBackend,
    toggleCreator,
    unfollowCreator
  }
})
