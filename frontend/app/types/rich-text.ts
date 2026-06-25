import type { JSONContent } from "@tiptap/core"

export type AoiRichTextDocument = JSONContent

export interface AoiRichTextChangePayload {
  markdown: string
  document: AoiRichTextDocument
  html: string
  text: string
  characterCount: number
  wordCount: number
  overLimit: boolean
}
