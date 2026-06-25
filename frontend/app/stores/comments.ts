import type { CommentSortMode, LocalComment } from "~/types/comments"

const STORAGE_KEY = "aoi.comments.v1"
const DEFAULT_AUTHOR_NAME = "Aoi 游客"
const MAX_AUTHOR_NAME_LENGTH = 24
const MAX_COMMENT_LENGTH = 500

interface PersistedCommentsState {
  authorName: string
  commentsByVideoId: Record<string, LocalComment[]>
}

function emptyState(): PersistedCommentsState {
  return {
    authorName: DEFAULT_AUTHOR_NAME,
    commentsByVideoId: {}
  }
}

function isRecord(value: unknown) {
  return Boolean(value && typeof value === "object" && !Array.isArray(value))
}

function normalizeAuthorName(value: string) {
  const trimmed = value.trim().slice(0, MAX_AUTHOR_NAME_LENGTH)
  return trimmed || DEFAULT_AUTHOR_NAME
}

function normalizeCommentBody(value: string) {
  return value.trim().slice(0, MAX_COMMENT_LENGTH)
}

function createCommentId() {
  if (import.meta.client && window.crypto?.randomUUID) {
    return window.crypto.randomUUID()
  }

  return `local-comment-${Date.now()}-${Math.random().toString(36).slice(2)}`
}

function isLocalComment(value: unknown): value is LocalComment {
  if (!isRecord(value)) {
    return false
  }

  const comment = value as Partial<LocalComment>

  return typeof comment.id === "string"
    && typeof comment.videoId === "string"
    && typeof comment.body === "string"
    && typeof comment.authorName === "string"
    && typeof comment.createdAt === "string"
    && typeof comment.updatedAt === "string"
}

function coercePersistedState(value: unknown): PersistedCommentsState {
  if (!isRecord(value)) {
    return emptyState()
  }

  const candidate = value as Partial<PersistedCommentsState>
  const commentsByVideoId: Record<string, LocalComment[]> = {}
  const rawCommentsByVideoId = candidate.commentsByVideoId

  if (isRecord(rawCommentsByVideoId)) {
    for (const [videoId, comments] of Object.entries(rawCommentsByVideoId as Record<string, unknown>)) {
      if (Array.isArray(comments)) {
        const safeComments = comments.filter(isLocalComment)

        if (safeComments.length) {
          commentsByVideoId[videoId] = safeComments
        }
      }
    }
  }

  return {
    authorName: normalizeAuthorName(typeof candidate.authorName === "string" ? candidate.authorName : DEFAULT_AUTHOR_NAME),
    commentsByVideoId
  }
}

function sortComments(comments: LocalComment[], sort: CommentSortMode) {
  return [...comments].sort((a, b) => {
    const aTime = new Date(a.createdAt).getTime()
    const bTime = new Date(b.createdAt).getTime()

    return sort === "newest" ? bTime - aTime : aTime - bTime
  })
}

export const useCommentsStore = defineStore("comments", () => {
  const authorName = ref(DEFAULT_AUTHOR_NAME)
  const commentsByVideoId = ref<Record<string, LocalComment[]>>({})
  const hydrated = ref(false)

  const totalCount = computed(() => Object.values(commentsByVideoId.value).reduce((sum, comments) => sum + comments.length, 0))
  const videoCount = computed(() => Object.values(commentsByVideoId.value).filter((comments) => comments.length > 0).length)

  function assignState(state: PersistedCommentsState) {
    authorName.value = state.authorName
    commentsByVideoId.value = state.commentsByVideoId
  }

  function persist() {
    if (!import.meta.client || !hydrated.value) {
      return
    }

    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify({
        authorName: authorName.value,
        commentsByVideoId: commentsByVideoId.value
      } satisfies PersistedCommentsState))
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

  function commentsForVideo(videoId: string, sort: CommentSortMode = "newest") {
    return sortComments(commentsByVideoId.value[videoId] || [], sort)
  }

  function commentCountForVideo(videoId: string) {
    return commentsByVideoId.value[videoId]?.length || 0
  }

  function setAuthorName(name: string) {
    authorName.value = normalizeAuthorName(name)
  }

  function submitComment(videoId: string, body: string) {
    const safeBody = normalizeCommentBody(body)

    if (!safeBody) {
      return
    }

    const now = new Date().toISOString()
    const comment: LocalComment = {
      id: createCommentId(),
      videoId,
      body: safeBody,
      authorName: normalizeAuthorName(authorName.value),
      createdAt: now,
      updatedAt: now
    }

    commentsByVideoId.value = {
      ...commentsByVideoId.value,
      [videoId]: [comment, ...(commentsByVideoId.value[videoId] || [])]
    }
  }

  function editComment(videoId: string, commentId: string, body: string) {
    const safeBody = normalizeCommentBody(body)

    if (!safeBody) {
      return
    }

    const comments = commentsByVideoId.value[videoId] || []

    commentsByVideoId.value = {
      ...commentsByVideoId.value,
      [videoId]: comments.map((comment) => comment.id === commentId
        ? { ...comment, body: safeBody, updatedAt: new Date().toISOString() }
        : comment)
    }
  }

  function deleteComment(videoId: string, commentId: string) {
    const comments = commentsByVideoId.value[videoId] || []
    const next = comments.filter((comment) => comment.id !== commentId)

    commentsByVideoId.value = {
      ...commentsByVideoId.value,
      [videoId]: next
    }
  }

  function clearVideoComments(videoId: string) {
    const next = { ...commentsByVideoId.value }
    delete next[videoId]
    commentsByVideoId.value = next
  }

  function resetComments() {
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
    watch([authorName, commentsByVideoId], persist, { deep: true })
  }

  return {
    authorName,
    clearVideoComments,
    commentCountForVideo,
    commentsByVideoId,
    commentsForVideo,
    deleteComment,
    editComment,
    hydrated,
    resetComments,
    restore,
    setAuthorName,
    submitComment,
    totalCount,
    videoCount
  }
})
