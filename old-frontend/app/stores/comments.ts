const STORAGE_KEY = "aoi.comments.v1"
const DEFAULT_AUTHOR_NAME = "Aoi 游客"
const MAX_AUTHOR_NAME_LENGTH = 24

interface PersistedCommentIdentity {
  authorName: string
}

function emptyState(): PersistedCommentIdentity {
  return {
    authorName: DEFAULT_AUTHOR_NAME
  }
}

function isRecord(value: unknown) {
  return Boolean(value && typeof value === "object" && !Array.isArray(value))
}

function normalizeAuthorName(value: string) {
  const trimmed = value.trim().slice(0, MAX_AUTHOR_NAME_LENGTH)
  return trimmed || DEFAULT_AUTHOR_NAME
}

function coercePersistedState(value: unknown): PersistedCommentIdentity {
  if (!isRecord(value)) {
    return emptyState()
  }

  const candidate = value as Partial<PersistedCommentIdentity>

  return {
    authorName: normalizeAuthorName(typeof candidate.authorName === "string" ? candidate.authorName : DEFAULT_AUTHOR_NAME)
  }
}

export const useCommentsStore = defineStore("comments", () => {
  const authorName = ref(DEFAULT_AUTHOR_NAME)
  const hydrated = ref(false)

  function assignState(state: PersistedCommentIdentity) {
    authorName.value = state.authorName
  }

  function persist() {
    if (!import.meta.client || !hydrated.value) {
      return
    }

    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify({
        authorName: authorName.value
      } satisfies PersistedCommentIdentity))
    } catch {
      // 显示名称只是便捷偏好；持久化失败不影响评论提交。
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

  function setAuthorName(name: string) {
    authorName.value = normalizeAuthorName(name)
  }

  function resetCommentIdentity() {
    assignState(emptyState())

    if (import.meta.client) {
      try {
        window.localStorage.removeItem(STORAGE_KEY)
      } catch {
        // 显示名称只是便捷偏好；清理失败不影响评论能力。
      }
    }
  }

  if (import.meta.client) {
    watch(authorName, persist)
  }

  return {
    authorName,
    hydrated,
    resetCommentIdentity,
    restore,
    setAuthorName
  }
})
