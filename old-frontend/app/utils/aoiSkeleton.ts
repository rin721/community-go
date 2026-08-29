import type { ComputedRef, InjectionKey } from "vue"

export type AoiSkeletonAnimation = "shimmer" | "pulse" | "none"
export type AoiSkeletonShape = "block" | "text" | "media" | "avatar" | "circle" | "pill"
export type AoiSkeletonSize = number | string
export type AoiSkeletonEmphasis = "muted" | "surface" | "strong" | "accent" | (string & {})

export type AoiSkeletonDefaults = {
  animation: ComputedRef<AoiSkeletonAnimation | undefined>
  emphasis: ComputedRef<AoiSkeletonEmphasis | undefined>
}

export const aoiSkeletonDefaultsKey: InjectionKey<AoiSkeletonDefaults> = Symbol("aoiSkeletonDefaults")

export function toAoiSkeletonCssValue(value?: AoiSkeletonSize | null) {
  if (typeof value === "number") {
    return `${value}px`
  }

  return value || undefined
}
