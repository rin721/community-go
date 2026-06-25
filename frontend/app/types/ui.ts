import type { AoiRevealDirectiveValue } from "~/utils/aoiReveal"

export type AoiLayoutMode = "stack" | "grid" | "inline" | "split"
export type AoiTone = "accent" | "muted" | "neutral" | "success" | "warning" | "danger" | "info"
export type AoiFeedbackIntent = "danger" | "info" | "success" | "warning"
export type AoiActionVariant = "filled" | "tonal" | "outlined" | "plain" | "elevated"
export type AoiFieldAppearance = "filled" | "outlined"
export type AoiSurfaceKind = "plain" | "panel" | "card" | "state" | "code" | "toolbar"
export type AoiSurfacePadding = "none" | "sm" | "md" | "lg"
export type AoiContentGridGap = "normal" | "compact" | "video"
export type AoiInfoCardDensity = "default" | "compact"
export type AoiInfoCardLayout = "inline" | "stack"

export interface AoiStatItem {
  description?: string
  icon?: string
  tone?: AoiTone
  label: string
  value: number | string
}

export interface AoiTagItem {
  external?: boolean
  href?: string
  icon?: string
  label: string
  target?: string
  to?: string
  value?: string
}

export type AoiRevealProp = AoiRevealDirectiveValue
