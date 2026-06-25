export type CommentSortMode = "newest" | "oldest"

export interface LocalComment {
  id: string
  videoId: string
  body: string
  authorName: string
  createdAt: string
  updatedAt: string
}
