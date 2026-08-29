import type { AoiApiErrorPayload, VideoHistoryPayload, VideoInteractionKind, VideoInteractionState, VideoLibraryPayload, VideoSummary } from "~/types/api"
import type { HistoryEntry, LibraryVideoSnapshot } from "~/types/library"

const STORAGE_KEY = "aoi.library.v1"
const CLIENT_ID_STORAGE_KEY = "aoi.community.clientId.v1"
const HISTORY_SYNC_DELAY_MS = 1200

interface PersistedLibraryState {
  favoriteVideos: Record<string, LibraryVideoSnapshot>
  history: HistoryEntry[]
  likedVideoIds: string[]
  likeCountsByVideoId: Record<string, number>
  watchLaterVideos: Record<string, LibraryVideoSnapshot>
}

type CountableVideoSummary = VideoSummary & { likeCount?: number }
type LibraryScope = "account" | "anonymous"

function emptyState(): PersistedLibraryState {
  return {
    favoriteVideos: {},
    history: [],
    likedVideoIds: [],
    likeCountsByVideoId: {},
    watchLaterVideos: {}
  }
}

function snapshotVideo(video: VideoSummary): LibraryVideoSnapshot {
  return {
    ...video,
    categories: video.categories.map((category) => ({ ...category })),
    uploader: { ...video.uploader }
  }
}

function normalizeProgress(video: VideoSummary, progressSeconds?: number) {
  if (typeof progressSeconds !== "number" || !Number.isFinite(progressSeconds)) {
    return undefined
  }

  return Math.max(0, Math.min(video.durationSeconds, Math.floor(progressSeconds)))
}

function coercePersistedState(value: unknown): PersistedLibraryState {
  if (!value || typeof value !== "object") {
    return emptyState()
  }

  const candidate = value as Partial<PersistedLibraryState>
  const persistedLikeCounts = isRecord(candidate.likeCountsByVideoId)
    ? candidate.likeCountsByVideoId as Record<string, unknown>
    : {}

  return {
    favoriteVideos: isRecord(candidate.favoriteVideos) ? candidate.favoriteVideos as Record<string, LibraryVideoSnapshot> : {},
    history: Array.isArray(candidate.history) ? candidate.history.filter(isHistoryEntry) : [],
    likedVideoIds: Array.isArray(candidate.likedVideoIds)
      ? candidate.likedVideoIds.filter((item): item is string => typeof item === "string")
      : [],
    likeCountsByVideoId: Object.fromEntries(Object.entries(persistedLikeCounts).filter(([, count]) => typeof count === "number" && Number.isFinite(count))) as Record<string, number>,
    watchLaterVideos: isRecord(candidate.watchLaterVideos) ? candidate.watchLaterVideos as Record<string, LibraryVideoSnapshot> : {}
  }
}

function isRecord(value: unknown) {
  return Boolean(value && typeof value === "object" && !Array.isArray(value))
}

function isHistoryEntry(value: unknown): value is HistoryEntry {
  if (!isRecord(value)) {
    return false
  }

  const entry = value as Partial<HistoryEntry>

  return typeof entry.lastViewedAt === "string"
    && typeof entry.progressSeconds === "number"
    && Boolean(entry.video && typeof entry.video.id === "string")
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

  return apiError.message || "社区互动接口暂时不可用，已使用本地缓存。"
}

function setListItem<T>(items: T[], value: T, exists: boolean, matches: (item: T) => boolean) {
  if (exists) {
    return items.some(matches) ? items : [...items, value]
  }

  return items.filter((item) => !matches(item))
}

export const useLibraryStore = defineStore("library", () => {
  const authSession = useAuthSessionStore()
  const backendReady = ref(false)
  const clientId = ref("")
  const favoriteVideos = ref<Record<string, LibraryVideoSnapshot>>({})
  const history = ref<HistoryEntry[]>([])
  const hydrated = ref(false)
  const libraryScope = ref<LibraryScope>("anonymous")
  const likedVideoIds = ref<string[]>([])
  const likeCountsByVideoId = ref<Record<string, number>>({})
  const pendingVideoIds = ref<Record<string, boolean>>({})
  const syncError = ref<string | null>(null)
  const watchLaterVideos = ref<Record<string, LibraryVideoSnapshot>>({})
  const historySyncTimers = new Map<string, number>()

  const favoriteList = computed(() => Object.values(favoriteVideos.value))
  const historyVideos = computed(() => history.value.map((entry) => entry.video))
  const likedCount = computed(() => likedVideoIds.value.length)
  const watchLaterList = computed(() => Object.values(watchLaterVideos.value))
  const communityAccountActive = computed(() => authSession.authenticated)

  function assignState(state: PersistedLibraryState) {
    favoriteVideos.value = state.favoriteVideos
    history.value = state.history
    likedVideoIds.value = state.likedVideoIds
    likeCountsByVideoId.value = state.likeCountsByVideoId
    watchLaterVideos.value = state.watchLaterVideos
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
    if (!import.meta.client || !hydrated.value || libraryScope.value !== "anonymous") {
      return
    }

    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify({
        favoriteVideos: favoriteVideos.value,
        history: history.value,
        likedVideoIds: likedVideoIds.value,
        likeCountsByVideoId: likeCountsByVideoId.value,
        watchLaterVideos: watchLaterVideos.value
      } satisfies PersistedLibraryState))
    } catch {
      // 本地资料库只是匿名关系同步不可用时的缓存降级。
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
      const storedClientId = normalizeClientId(window.localStorage.getItem(CLIENT_ID_STORAGE_KEY))
      clientId.value = storedClientId && !isAccountClientId(storedClientId) ? storedClientId : createClientId()
      persistClientId()
    } catch {
      clientId.value = createClientId()
    } finally {
      hydrated.value = true
    }
  }

  function markCurrentScope() {
    if (communityAccountActive.value) {
      libraryScope.value = "account"
    }
  }

  async function resolveAccountScope() {
    if (!authSession.hydrated) {
      await authSession.refreshSession({ silent: true })
    }
    libraryScope.value = communityAccountActive.value ? "account" : "anonymous"
    return communityAccountActive.value
  }

  function applyClientScope(nextClientId: string | null | undefined, authenticated: boolean) {
    const normalizedClientId = normalizeClientId(nextClientId)
    const accountScoped = authenticated || isAccountClientId(normalizedClientId)
    libraryScope.value = accountScoped ? "account" : "anonymous"
    if (normalizedClientId && !accountScoped) {
      clientId.value = normalizedClientId
      persistClientId()
    }
  }

  function recordView(video: VideoSummary, progressSeconds?: number) {
    markCurrentScope()
    const existing = history.value.find((entry) => entry.video.id === video.id)
    const current = history.value.filter((entry) => entry.video.id !== video.id)
    const normalizedProgress = normalizeProgress(video, progressSeconds)

    history.value = [
      {
        lastViewedAt: new Date().toISOString(),
        progressSeconds: normalizedProgress ?? existing?.progressSeconds ?? 0,
        video: snapshotVideo(video)
      },
      ...current
    ]
    queueHistorySync(video.id, 0)
  }

  function updateHistoryProgress(videoId: string, progressSeconds: number) {
    markCurrentScope()
    let updated = false
    history.value = history.value.map((entry) => {
      if (entry.video.id !== videoId) {
        return entry
      }

      const normalizedProgress = normalizeProgress(entry.video, progressSeconds)
      updated = true

      return {
        ...entry,
        lastViewedAt: new Date().toISOString(),
        progressSeconds: normalizedProgress ?? entry.progressSeconds
      }
    })
    if (updated) {
      queueHistorySync(videoId, HISTORY_SYNC_DELAY_MS)
    }
  }

  function historyProgressForVideo(videoId: string) {
    return history.value.find((entry) => entry.video.id === videoId)?.progressSeconds || 0
  }

  function queueHistorySync(videoId: string, delay: number) {
    if (!import.meta.client || !hydrated.value) {
      return
    }
    const existingTimer = historySyncTimers.get(videoId)
    if (existingTimer) {
      window.clearTimeout(existingTimer)
    }
    const timer = window.setTimeout(() => {
      historySyncTimers.delete(videoId)
      void syncHistoryEntry(videoId)
    }, Math.max(0, delay))
    historySyncTimers.set(videoId, timer)
  }

  async function syncHistoryEntry(videoId: string) {
    if (!hydrated.value) {
      return null
    }
    const entry = history.value.find((item) => item.video.id === videoId)
    if (!entry) {
      return null
    }

    const api = useAoiApi()

    try {
      const accountScoped = await resolveAccountScope()
      const item = accountScoped
        ? await api.recordAccountVideoHistory(entry.video.id, { progressSeconds: entry.progressSeconds })
        : await api.recordVideoHistory(entry.video.id, {
          clientId: ensureClientId(),
          progressSeconds: entry.progressSeconds
        })
      backendReady.value = true
      syncError.value = null
      return item
    } catch (error) {
      backendReady.value = false
      syncError.value = errorMessage(error)
      return null
    }
  }

  function applyBackendLibrary(payload: VideoLibraryPayload) {
    if (!payload.clientId) {
      return
    }

    applyClientScope(payload.clientId, payload.authenticated)

    backendReady.value = true
    syncError.value = null
    favoriteVideos.value = Object.fromEntries(payload.favorites.items.map((video) => [video.id, snapshotVideo(video)]))
    watchLaterVideos.value = Object.fromEntries(payload.watchLater.items.map((video) => [video.id, snapshotVideo(video)]))
  }

  function applyBackendHistory(payload: VideoHistoryPayload) {
    if (!payload.clientId) {
      return
    }

    applyClientScope(payload.clientId, payload.authenticated)

    backendReady.value = true
    syncError.value = null
    history.value = payload.items.items.map((item) => ({
      lastViewedAt: item.lastViewedAt,
      progressSeconds: normalizeProgress(item.video, item.progressSeconds) ?? 0,
      video: snapshotVideo(item.video)
    }))
  }

  function applyInteractionState(video: CountableVideoSummary, state: VideoInteractionState) {
    const normalizedClientId = normalizeClientId(state.clientId)
    const accountScoped = communityAccountActive.value || isAccountClientId(normalizedClientId)
    libraryScope.value = accountScoped ? "account" : "anonymous"
    if (normalizedClientId && !accountScoped) {
      clientId.value = normalizedClientId
      persistClientId()
    }

    backendReady.value = true
    syncError.value = null
    likeCountsByVideoId.value = {
      ...likeCountsByVideoId.value,
      [video.id]: state.likeCount
    }
    likedVideoIds.value = setListItem(likedVideoIds.value, video.id, state.liked, (item) => item === video.id)
    setCollectionItem("favorite", video, state.favorited)
    setCollectionItem("watch_later", video, state.watchLater)
  }

  async function syncWithBackend() {
    if (!hydrated.value) {
      return null
    }

    const api = useAoiApi()

    try {
      const accountScoped = await resolveAccountScope()
      const activeClientId = accountScoped ? "" : ensureClientId()
      let payload = accountScoped
        ? await api.getAccountVideoLibrary()
        : await api.getVideoLibrary(activeClientId)

      if (!accountScoped && await pushMissingLocalLibraryItems(payload, activeClientId)) {
        payload = await api.getVideoLibrary(activeClientId)
      }

      applyBackendLibrary(payload)
      return payload
    } catch (error) {
      backendReady.value = false
      syncError.value = errorMessage(error)
      return null
    }
  }

  async function syncHistoryWithBackend(limit = 48) {
    if (!hydrated.value) {
      return null
    }

    const api = useAoiApi()

    try {
      const accountScoped = await resolveAccountScope()
      const activeClientId = accountScoped ? "" : ensureClientId()
      let payload = accountScoped
        ? await api.getAccountVideoHistory(limit)
        : await api.getVideoHistory(activeClientId, limit)
      if (!accountScoped && payload.items.items.length === 0 && history.value.length > 0) {
        await Promise.all(
          history.value.slice(0, limit).map((entry) => api.recordVideoHistory(entry.video.id, {
            clientId: activeClientId,
            progressSeconds: entry.progressSeconds
          }))
        )
        payload = await api.getVideoHistory(activeClientId, limit)
      }
      applyBackendHistory(payload)
      return payload
    } catch (error) {
      backendReady.value = false
      syncError.value = errorMessage(error)
      return null
    }
  }

  async function syncVideoInteractions(video: CountableVideoSummary) {
    if (!hydrated.value) {
      return null
    }

    const api = useAoiApi()

    try {
      const accountScoped = await resolveAccountScope()
      const state = accountScoped
        ? await api.getAccountVideoInteractionState(video.id)
        : await api.getVideoInteractionState(video.id, ensureClientId())
      applyInteractionState(video, state)
      return state
    } catch (error) {
      backendReady.value = false
      syncError.value = errorMessage(error)
      return null
    }
  }

  async function toggleFavorite(video: VideoSummary) {
    await toggleInteraction(video, "favorite")
  }

  async function toggleWatchLater(video: VideoSummary) {
    await toggleInteraction(video, "watch_later")
  }

  async function toggleLiked(video: CountableVideoSummary) {
    await toggleInteraction(video, "like")
  }

  async function toggleInteraction(video: CountableVideoSummary, kind: VideoInteractionKind) {
    if (!hydrated.value || isPending(video.id)) {
      return
    }

    const active = isInteractionActive(video.id, kind)
    const api = useAoiApi()
    setPending(video.id, true)

    try {
      const accountScoped = await resolveAccountScope()
      const state = active
        ? accountScoped
          ? await api.unsetAccountVideoInteraction(video.id, kind)
          : await api.unsetVideoInteraction(video.id, kind, ensureClientId())
        : accountScoped
          ? await api.setAccountVideoInteraction(video.id, kind)
          : await api.setVideoInteraction(video.id, kind, { clientId: ensureClientId() })
      applyInteractionState(video, state)
    } catch (error) {
      backendReady.value = false
      syncError.value = errorMessage(error)
      applyLocalInteraction(video, kind, !active)
    } finally {
      setPending(video.id, false)
    }
  }

  async function pushMissingLocalLibraryItems(payload: VideoLibraryPayload, activeClientId: string) {
    const api = useAoiApi()
    const remoteFavoriteIds = new Set(payload.favorites.items.map((video) => video.id))
    const remoteWatchLaterIds = new Set(payload.watchLater.items.map((video) => video.id))
    const writes: Array<Promise<VideoInteractionState>> = []

    for (const video of favoriteList.value.filter((item) => !remoteFavoriteIds.has(item.id))) {
      writes.push(api.setVideoInteraction(video.id, "favorite", { clientId: activeClientId }))
    }
    for (const video of watchLaterList.value.filter((item) => !remoteWatchLaterIds.has(item.id))) {
      writes.push(api.setVideoInteraction(video.id, "watch_later", { clientId: activeClientId }))
    }

    if (writes.length === 0) {
      return false
    }

    await Promise.all(writes)
    return true
  }

  function applyLocalInteraction(video: CountableVideoSummary, kind: VideoInteractionKind, active: boolean) {
    if (kind === "like") {
      likedVideoIds.value = setListItem(likedVideoIds.value, video.id, active, (item) => item === video.id)
      const current = likeCountFor(video)
      likeCountsByVideoId.value = {
        ...likeCountsByVideoId.value,
        [video.id]: Math.max(0, current + (active ? 1 : -1))
      }
      return
    }

    setCollectionItem(kind, video, active)
  }

  function setCollectionItem(kind: VideoInteractionKind, video: VideoSummary, active: boolean) {
    if (kind === "favorite") {
      favoriteVideos.value = setVideoSnapshot(favoriteVideos.value, video, active)
      return
    }
    if (kind === "watch_later") {
      watchLaterVideos.value = setVideoSnapshot(watchLaterVideos.value, video, active)
    }
  }

  function setVideoSnapshot(items: Record<string, LibraryVideoSnapshot>, video: VideoSummary, active: boolean) {
    if (active) {
      return {
        ...items,
        [video.id]: snapshotVideo(video)
      }
    }

    const next = { ...items }
    delete next[video.id]
    return next
  }

  function isFavorite(videoId: string) {
    return Boolean(favoriteVideos.value[videoId])
  }

  function isWatchLater(videoId: string) {
    return Boolean(watchLaterVideos.value[videoId])
  }

  function isLiked(videoId: string) {
    return likedVideoIds.value.includes(videoId)
  }

  function isInteractionActive(videoId: string, kind: VideoInteractionKind) {
    if (kind === "like") {
      return isLiked(videoId)
    }
    if (kind === "favorite") {
      return isFavorite(videoId)
    }
    return isWatchLater(videoId)
  }

  function isPending(videoId: string) {
    return Boolean(pendingVideoIds.value[videoId])
  }

  function likeCountFor(video: CountableVideoSummary) {
    return likeCountsByVideoId.value[video.id] ?? video.likeCount ?? 0
  }

  function setPending(videoId: string, value: boolean) {
    pendingVideoIds.value = {
      ...pendingVideoIds.value,
      [videoId]: value
    }

    if (!value) {
      const next = { ...pendingVideoIds.value }
      delete next[videoId]
      pendingVideoIds.value = next
    }
  }

  async function clearHistory() {
    if (import.meta.client) {
      for (const timer of historySyncTimers.values()) {
        window.clearTimeout(timer)
      }
    }
    historySyncTimers.clear()

    const accountScoped = hydrated.value ? await resolveAccountScope() : false
    history.value = []
    if (!hydrated.value) {
      return
    }

    const api = useAoiApi()

    try {
      if (accountScoped) {
        await api.clearAccountVideoHistory()
      } else {
        await api.clearVideoHistory({ clientId: ensureClientId() })
      }
      backendReady.value = true
      syncError.value = null
    } catch (error) {
      backendReady.value = false
      syncError.value = errorMessage(error)
    }
  }

  async function clearFavorites() {
    await clearCollection("favorite")
  }

  async function clearWatchLater() {
    await clearCollection("watch_later")
  }

  async function clearCollection(kind: Extract<VideoInteractionKind, "favorite" | "watch_later">) {
    const items = kind === "favorite" ? favoriteList.value : watchLaterList.value
    const accountScoped = hydrated.value ? await resolveAccountScope() : false
    if (kind === "favorite") {
      favoriteVideos.value = {}
    } else {
      watchLaterVideos.value = {}
    }
    if (!hydrated.value || items.length === 0) {
      return
    }

    const api = useAoiApi()
    const activeClientId = accountScoped ? "" : ensureClientId()
    const results = await Promise.allSettled(items.map((video) => accountScoped
      ? api.unsetAccountVideoInteraction(video.id, kind)
      : api.unsetVideoInteraction(video.id, kind, activeClientId)))
    if (results.some((item) => item.status === "rejected")) {
      backendReady.value = false
      syncError.value = "部分互动关系清理失败，下次同步会重新校准。"
      return
    }

    backendReady.value = true
    syncError.value = null
  }

  function resetLibrary() {
    libraryScope.value = "anonymous"
    assignState(emptyState())
    backendReady.value = false
    syncError.value = null

    if (import.meta.client) {
      try {
        window.localStorage.removeItem(STORAGE_KEY)
      } catch {
        // 本地资料库只是匿名关系同步不可用时的缓存降级。
      }
    }
  }

  if (import.meta.client) {
    watch([favoriteVideos, history, likedVideoIds, likeCountsByVideoId, watchLaterVideos], persist, { deep: true })
  }

  return {
    applyBackendHistory,
    applyBackendLibrary,
    backendReady,
    clearFavorites,
    clearHistory,
    clearWatchLater,
    clientId,
    favoriteList,
    favoriteVideos,
    history,
    historyVideos,
    hydrated,
    ensureClientId,
    isFavorite,
    isLiked,
    isPending,
    isWatchLater,
    likeCountFor,
    likedCount,
    likedVideoIds,
    likeCountsByVideoId,
    historyProgressForVideo,
    recordView,
    resetLibrary,
    restore,
    syncError,
    syncHistoryWithBackend,
    syncVideoInteractions,
    syncWithBackend,
    toggleFavorite,
    toggleLiked,
    toggleWatchLater,
    updateHistoryProgress,
    watchLaterList,
    watchLaterVideos
  }
})
