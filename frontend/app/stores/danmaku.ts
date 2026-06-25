import type { VideoDanmakuItem, VideoDanmakuMode } from "~/types/api"

const STORAGE_KEY = "aoi.danmaku.v1"
const DEFAULT_AUTHOR_NAME = "Aoi Viewer"
const MAX_DANMAKU_LENGTH = 80

export interface LocalDanmakuDraft {
  body: string
  color?: string
  mode?: VideoDanmakuMode
  timeSeconds: number
}

interface PersistedDanmakuState {
  itemsByVideoId: Record<string, VideoDanmakuItem[]>
}

function emptyState(): PersistedDanmakuState {
  return {
    itemsByVideoId: {}
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value))
}

function createDanmakuId() {
  if (import.meta.client && window.crypto?.randomUUID) {
    return window.crypto.randomUUID()
  }

  return `local-danmaku-${Date.now()}-${Math.random().toString(36).slice(2)}`
}

function normalizeBody(value: string) {
  return value.trim().slice(0, MAX_DANMAKU_LENGTH)
}

function normalizeColor(value: string | undefined) {
  return /^#[\da-f]{6}$/i.test(value || "") ? value! : "#ffffff"
}

function normalizeMode(value: unknown): VideoDanmakuMode {
  return value === "top" || value === "bottom" || value === "scroll" ? value : "scroll"
}

function normalizeTime(value: unknown) {
  const next = Number(value)

  return Number.isFinite(next) ? Math.max(0, next) : 0
}

function isDanmakuItem(value: unknown): value is VideoDanmakuItem {
  if (!isRecord(value)) {
    return false
  }

  const item = value as Partial<VideoDanmakuItem>

  return typeof item.id === "string"
    && typeof item.videoId === "string"
    && typeof item.body === "string"
    && typeof item.createdAt === "string"
    && typeof item.authorName === "string"
    && typeof item.color === "string"
    && typeof item.timeSeconds === "number"
    && (item.mode === "scroll" || item.mode === "top" || item.mode === "bottom")
}

function coercePersistedState(value: unknown): PersistedDanmakuState {
  if (!isRecord(value)) {
    return emptyState()
  }

  const candidate = value as Partial<PersistedDanmakuState>
  const itemsByVideoId: Record<string, VideoDanmakuItem[]> = {}

  if (isRecord(candidate.itemsByVideoId)) {
    for (const [videoId, items] of Object.entries(candidate.itemsByVideoId)) {
      if (Array.isArray(items)) {
        const safeItems = items.filter(isDanmakuItem)

        if (safeItems.length) {
          itemsByVideoId[videoId] = safeItems
        }
      }
    }
  }

  return {
    itemsByVideoId
  }
}

export const useDanmakuStore = defineStore("danmaku", () => {
  const hydrated = ref(false)
  const itemsByVideoId = ref<Record<string, VideoDanmakuItem[]>>({})

  const totalCount = computed(() => Object.values(itemsByVideoId.value).reduce((sum, items) => sum + items.length, 0))

  function assignState(state: PersistedDanmakuState) {
    itemsByVideoId.value = state.itemsByVideoId
  }

  function persist() {
    if (!import.meta.client || !hydrated.value) {
      return
    }

    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify({
        itemsByVideoId: itemsByVideoId.value
      } satisfies PersistedDanmakuState))
    } catch {
      // Local danmaku persistence is optional in the frontend prototype.
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

  function danmakuForVideo(videoId: string) {
    return [...(itemsByVideoId.value[videoId] || [])].sort((a, b) => a.timeSeconds - b.timeSeconds)
  }

  function submitDanmaku(videoId: string, draft: LocalDanmakuDraft, authorName = DEFAULT_AUTHOR_NAME) {
    const body = normalizeBody(draft.body)

    if (!body) {
      return undefined
    }

    const item: VideoDanmakuItem = {
      id: createDanmakuId(),
      videoId,
      body,
      timeSeconds: normalizeTime(draft.timeSeconds),
      mode: normalizeMode(draft.mode),
      color: normalizeColor(draft.color),
      authorName: authorName.trim().slice(0, 24) || DEFAULT_AUTHOR_NAME,
      createdAt: new Date().toISOString()
    }

    itemsByVideoId.value = {
      ...itemsByVideoId.value,
      [videoId]: [...(itemsByVideoId.value[videoId] || []), item]
    }

    return item
  }

  function clearVideoDanmaku(videoId: string) {
    const next = { ...itemsByVideoId.value }
    delete next[videoId]
    itemsByVideoId.value = next
  }

  function resetDanmaku() {
    assignState(emptyState())

    if (import.meta.client) {
      try {
        window.localStorage.removeItem(STORAGE_KEY)
      } catch {
        // Local danmaku persistence is optional in the frontend prototype.
      }
    }
  }

  if (import.meta.client) {
    watch(itemsByVideoId, persist, { deep: true })
  }

  return {
    clearVideoDanmaku,
    danmakuForVideo,
    hydrated,
    itemsByVideoId,
    resetDanmaku,
    restore,
    submitDanmaku,
    totalCount
  }
})
