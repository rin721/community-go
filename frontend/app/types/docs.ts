export type AoiDocsLocale = "zh-CN" | "en" | "ja"
export type AoiDocsCollection = "docsZhCn" | "docsEn" | "docsJa"

export type AoiComponentDocCategory =
  | "actions"
  | "forms"
  | "layout-content"
  | "feedback"
  | "overlays"
  | "media-player"
  | "danmaku-motion-rich-text"

export interface AoiComponentDocApiRow {
  defaultValue?: string
  description: string
  name: string
  type: string
}

export interface AoiComponentDoc {
  category: AoiComponentDocCategory
  description: string
  demo: string
  events: AoiComponentDocApiRow[]
  name: string
  notes: string[]
  props: AoiComponentDocApiRow[]
  slots: AoiComponentDocApiRow[]
  source: string
  usage: string
}

export interface AoiComponentDocCategoryMeta {
  description: string
  icon: string
  id: AoiComponentDocCategory
  title: string
}
