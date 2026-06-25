export type UploadDraftStatus = "draft" | "queued-local"
export type UploadDraftVisibility = "public" | "unlisted" | "private"

export interface UploadDraftSource {
  name: string
  selectedAt: string
  size: number
  type: string
}

export interface UploadDraft {
  allowComments: boolean
  categorySlug: string
  createdAt: string
  description: string
  id: string
  sensitive: boolean
  source: UploadDraftSource | null
  status: UploadDraftStatus
  tags: string[]
  title: string
  updatedAt: string
  visibility: UploadDraftVisibility
}

export interface UploadDraftValidation {
  missing: string[]
  ready: boolean
  warnings: string[]
}
