import type { VideoComment, VideoCommentSortMode } from "~/types/api"

export type CommentSortMode = VideoCommentSortMode

export interface LocalComment {
  id: string
  videoId: string
  body: string
  authorName: string
  createdAt: string
  updatedAt: string
}

export interface CommentView extends VideoComment {
  editable: boolean
  source: "community" | "local"
}
