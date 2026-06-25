import type {
  UploadDraft,
  UploadDraftSource,
  UploadDraftValidation,
  UploadDraftVisibility
} from "~/types/upload"

const STORAGE_KEY = "aoi.uploadDrafts.v1"

interface PersistedUploadDraftState {
  activeDraftId: string | null
  drafts: Record<string, UploadDraft>
}

function emptyState(): PersistedUploadDraftState {
  return {
    activeDraftId: null,
    drafts: {}
  }
}

function nowIso() {
  return new Date().toISOString()
}

function createId() {
  if (import.meta.client && window.crypto?.randomUUID) {
    return window.crypto.randomUUID()
  }

  return `draft-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function createBlankDraft(): UploadDraft {
  const timestamp = nowIso()

  return {
    allowComments: true,
    categorySlug: "design",
    createdAt: timestamp,
    description: "",
    id: createId(),
    sensitive: false,
    source: null,
    status: "draft",
    tags: [],
    title: "",
    updatedAt: timestamp,
    visibility: "public"
  }
}

function coercePersistedState(value: unknown): PersistedUploadDraftState {
  if (!isRecord(value)) {
    return emptyState()
  }

  const candidate = value as Partial<PersistedUploadDraftState>
  const drafts = isRecord(candidate.drafts)
    ? Object.fromEntries(Object.entries(candidate.drafts).filter(([, draft]) => isUploadDraft(draft)))
    : {}
  const activeDraftId = typeof candidate.activeDraftId === "string" && drafts[candidate.activeDraftId]
    ? candidate.activeDraftId
    : Object.keys(drafts)[0] || null

  return {
    activeDraftId,
    drafts
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value))
}

function isUploadDraft(value: unknown): value is UploadDraft {
  if (!isRecord(value)) {
    return false
  }

  const draft = value as Partial<UploadDraft>

  return typeof draft.id === "string"
    && typeof draft.title === "string"
    && typeof draft.description === "string"
    && typeof draft.categorySlug === "string"
    && isVisibility(draft.visibility)
    && Array.isArray(draft.tags)
    && typeof draft.createdAt === "string"
    && typeof draft.updatedAt === "string"
}

function isVisibility(value: unknown): value is UploadDraftVisibility {
  return value === "public" || value === "unlisted" || value === "private"
}

function uniqueTags(tags: string[]) {
  const seen = new Set<string>()

  return tags
    .map((tag) => tag.trim().replace(/^#/, ""))
    .filter(Boolean)
    .filter((tag) => {
      const key = tag.toLowerCase()

      if (seen.has(key)) {
        return false
      }

      seen.add(key)
      return true
    })
    .slice(0, 8)
}

export const useUploadDraftStore = defineStore("uploadDrafts", () => {
  const activeDraftId = ref<string | null>(null)
  const drafts = ref<Record<string, UploadDraft>>({})
  const hydrated = ref(false)

  const draftList = computed(() => Object.values(drafts.value)
    .sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt)))
  const activeDraft = computed(() => activeDraftId.value ? drafts.value[activeDraftId.value] || null : null)
  const draftCount = computed(() => draftList.value.length)
  const queuedCount = computed(() => draftList.value.filter((draft) => draft.status === "queued-local").length)
  const readyCount = computed(() => draftList.value.filter((draft) => validateDraft(draft).ready).length)

  function assignState(state: PersistedUploadDraftState) {
    activeDraftId.value = state.activeDraftId
    drafts.value = state.drafts
  }

  function persist() {
    if (!import.meta.client || !hydrated.value) {
      return
    }

    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify({
        activeDraftId: activeDraftId.value,
        drafts: drafts.value
      } satisfies PersistedUploadDraftState))
    } catch {
      // Upload drafts are optional prototype data.
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

  function createDraft() {
    const draft = createBlankDraft()

    drafts.value = {
      ...drafts.value,
      [draft.id]: draft
    }
    activeDraftId.value = draft.id

    return draft
  }

  function ensureDraft() {
    return activeDraft.value || createDraft()
  }

  function selectDraft(id: string) {
    if (drafts.value[id]) {
      activeDraftId.value = id
    }
  }

  function updateDraft(id: string, patch: Partial<Omit<UploadDraft, "createdAt" | "id">>) {
    const draft = drafts.value[id]

    if (!draft) {
      return
    }

    const patchChangesStatus = Object.prototype.hasOwnProperty.call(patch, "status")
    const nextStatus = patchChangesStatus
      ? patch.status || draft.status
      : draft.status === "queued-local" ? "draft" : draft.status

    drafts.value = {
      ...drafts.value,
      [id]: {
        ...draft,
        ...patch,
        status: nextStatus,
        tags: patch.tags ? uniqueTags(patch.tags) : draft.tags,
        updatedAt: nowIso()
      }
    }
  }

  function updateActiveDraft(patch: Partial<Omit<UploadDraft, "createdAt" | "id">>) {
    const draft = activeDraft.value

    if (draft) {
      updateDraft(draft.id, patch)
    }
  }

  function setActiveSource(source: Pick<UploadDraftSource, "name" | "size" | "type">) {
    updateActiveDraft({
      source: {
        ...source,
        selectedAt: nowIso()
      }
    })
  }

  function queueActiveDraft() {
    const draft = activeDraft.value

    if (!draft || !validateDraft(draft).ready) {
      return
    }

    updateDraft(draft.id, { status: "queued-local" })
  }

  function deleteDraft(id: string) {
    if (!drafts.value[id]) {
      return
    }

    const next = { ...drafts.value }
    delete next[id]
    drafts.value = next
    activeDraftId.value = activeDraftId.value === id ? Object.keys(next)[0] || null : activeDraftId.value
  }

  function resetDrafts() {
    assignState(emptyState())

    if (import.meta.client) {
      try {
        window.localStorage.removeItem(STORAGE_KEY)
      } catch {
        // Upload drafts are optional prototype data.
      }
    }
  }

  function validateDraft(draft: UploadDraft): UploadDraftValidation {
    const missing: string[] = []
    const warnings: string[] = []

    if (draft.title.trim().length < 4) {
      missing.push("标题至少 4 个字符")
    }

    if (!draft.source) {
      missing.push("选择一个视频文件")
    }

    if (!draft.categorySlug) {
      missing.push("选择内容分区")
    }

    if (draft.description.trim().length < 20) {
      warnings.push("建议补充 20 字以上简介，便于未来搜索与推荐")
    }

    if (draft.tags.length < 2) {
      warnings.push("建议至少添加 2 个标签")
    }

    return {
      missing,
      ready: missing.length === 0,
      warnings
    }
  }

  if (import.meta.client) {
    watch([activeDraftId, drafts], persist, { deep: true })
  }

  return {
    activeDraft,
    activeDraftId,
    createDraft,
    deleteDraft,
    draftCount,
    draftList,
    drafts,
    ensureDraft,
    hydrated,
    queuedCount,
    queueActiveDraft,
    readyCount,
    resetDrafts,
    restore,
    selectDraft,
    setActiveSource,
    updateActiveDraft,
    updateDraft,
    validateDraft
  }
})
