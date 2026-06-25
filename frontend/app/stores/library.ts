import type { HistoryEntry, LibraryVideoSnapshot } from "~/types/library"
import type { VideoSummary } from "~/types/api"

const STORAGE_KEY = "aoi.library.v1"

interface PersistedLibraryState {
  favoriteVideos: Record<string, LibraryVideoSnapshot>
  history: HistoryEntry[]
  likedVideoIds: string[]
  watchLaterVideos: Record<string, LibraryVideoSnapshot>
}

function emptyState(): PersistedLibraryState {
  return {
    favoriteVideos: {},
    history: [],
    likedVideoIds: [],
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

  return {
    favoriteVideos: isRecord(candidate.favoriteVideos) ? candidate.favoriteVideos as Record<string, LibraryVideoSnapshot> : {},
    history: Array.isArray(candidate.history) ? candidate.history.filter(isHistoryEntry) : [],
    likedVideoIds: Array.isArray(candidate.likedVideoIds)
      ? candidate.likedVideoIds.filter((item): item is string => typeof item === "string")
      : [],
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

export const useLibraryStore = defineStore("library", () => {
  const favoriteVideos = ref<Record<string, LibraryVideoSnapshot>>({})
  const history = ref<HistoryEntry[]>([])
  const hydrated = ref(false)
  const likedVideoIds = ref<string[]>([])
  const watchLaterVideos = ref<Record<string, LibraryVideoSnapshot>>({})

  const favoriteList = computed(() => Object.values(favoriteVideos.value))
  const historyVideos = computed(() => history.value.map((entry) => entry.video))
  const likedCount = computed(() => likedVideoIds.value.length)
  const watchLaterList = computed(() => Object.values(watchLaterVideos.value))

  function assignState(state: PersistedLibraryState) {
    favoriteVideos.value = state.favoriteVideos
    history.value = state.history
    likedVideoIds.value = state.likedVideoIds
    watchLaterVideos.value = state.watchLaterVideos
  }

  function persist() {
    if (!import.meta.client || !hydrated.value) {
      return
    }

    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify({
        favoriteVideos: favoriteVideos.value,
        history: history.value,
        likedVideoIds: likedVideoIds.value,
        watchLaterVideos: watchLaterVideos.value
      } satisfies PersistedLibraryState))
    } catch {
      // Local persistence is optional in the frontend prototype.
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

  function recordView(video: VideoSummary, progressSeconds?: number) {
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
  }

  function updateHistoryProgress(videoId: string, progressSeconds: number) {
    history.value = history.value.map((entry) => {
      if (entry.video.id !== videoId) {
        return entry
      }

      const normalizedProgress = normalizeProgress(entry.video, progressSeconds)

      return {
        ...entry,
        lastViewedAt: new Date().toISOString(),
        progressSeconds: normalizedProgress ?? entry.progressSeconds
      }
    })
  }

  function historyProgressForVideo(videoId: string) {
    return history.value.find((entry) => entry.video.id === videoId)?.progressSeconds || 0
  }

  function toggleFavorite(video: VideoSummary) {
    if (isFavorite(video.id)) {
      const next = { ...favoriteVideos.value }
      delete next[video.id]
      favoriteVideos.value = next
      return
    }

    favoriteVideos.value = {
      ...favoriteVideos.value,
      [video.id]: snapshotVideo(video)
    }
  }

  function toggleWatchLater(video: VideoSummary) {
    if (isWatchLater(video.id)) {
      const next = { ...watchLaterVideos.value }
      delete next[video.id]
      watchLaterVideos.value = next
      return
    }

    watchLaterVideos.value = {
      ...watchLaterVideos.value,
      [video.id]: snapshotVideo(video)
    }
  }

  function toggleLiked(videoId: string) {
    likedVideoIds.value = isLiked(videoId)
      ? likedVideoIds.value.filter((id) => id !== videoId)
      : [...likedVideoIds.value, videoId]
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

  function clearHistory() {
    history.value = []
  }

  function clearFavorites() {
    favoriteVideos.value = {}
  }

  function clearWatchLater() {
    watchLaterVideos.value = {}
  }

  function resetLibrary() {
    assignState(emptyState())

    if (import.meta.client) {
      try {
        window.localStorage.removeItem(STORAGE_KEY)
      } catch {
        // Local persistence is optional in the frontend prototype.
      }
    }
  }

  if (import.meta.client) {
    watch([favoriteVideos, history, likedVideoIds, watchLaterVideos], persist, { deep: true })
  }

  return {
    clearFavorites,
    clearHistory,
    clearWatchLater,
    favoriteList,
    favoriteVideos,
    history,
    historyVideos,
    hydrated,
    isFavorite,
    isLiked,
    isWatchLater,
    likedCount,
    likedVideoIds,
    historyProgressForVideo,
    recordView,
    resetLibrary,
    restore,
    toggleFavorite,
    toggleLiked,
    toggleWatchLater,
    updateHistoryProgress,
    watchLaterList,
    watchLaterVideos
  }
})
