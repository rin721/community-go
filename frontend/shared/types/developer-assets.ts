export type AoiDeveloperAssetRootId = "public" | "app-assets" | "i18n-locales"

export type AoiDeveloperAssetKind = "directory" | "file"

export type AoiDeveloperAssetPreviewKind = "audio" | "image" | "text" | "video" | "other"

export type AoiDeveloperAssetAction =
  | "chmod"
  | "copy"
  | "createDirectory"
  | "createFile"
  | "delete"
  | "list"
  | "move"
  | "readText"
  | "rename"
  | "writeText"

export interface AoiDeveloperAssetRoot {
  id: AoiDeveloperAssetRootId
  label: string
  relativePath: string
  publicBaseUrl?: string
}

export interface AoiDeveloperAssetEntry {
  extension: string
  kind: AoiDeveloperAssetKind
  mode: number | null
  modeText: string | null
  modifiedAt: string
  name: string
  path: string
  previewKind: AoiDeveloperAssetPreviewKind
  publicUrl: string | null
  rootId: AoiDeveloperAssetRootId
  size: number
  textEditable: boolean
}

export interface AoiDeveloperAssetListResponse {
  currentPath: string
  entries: AoiDeveloperAssetEntry[]
  ok: boolean
  root: AoiDeveloperAssetRoot
  roots: AoiDeveloperAssetRoot[]
  updatedAt: string
  warning?: string
}

export interface AoiDeveloperAssetReadTextResponse extends AoiDeveloperAssetListResponse {
  content: string
  entry: AoiDeveloperAssetEntry
}

export interface AoiDeveloperAssetActionResponse extends AoiDeveloperAssetListResponse {
  entry?: AoiDeveloperAssetEntry
}

export interface AoiDeveloperAssetRequest {
  action?: AoiDeveloperAssetAction
  content?: string
  destinationPath?: string
  mode?: string
  name?: string
  overwrite?: boolean
  path?: string
  rootId?: AoiDeveloperAssetRootId
}

export interface AoiDeveloperAssetUploadResponse extends AoiDeveloperAssetListResponse {
  uploaded: AoiDeveloperAssetEntry[]
}
