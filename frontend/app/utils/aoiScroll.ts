import type { Ref } from "vue"

export type AoiScrollAxis = "x" | "y"
export type AoiScrollOverscroll = "auto" | "contain" | "none"
export type AoiScrollSnapAlign = "start" | "center" | "end" | "none"
export type AoiScrollSnapMode = "proximity" | "mandatory"
export type AoiScrollSnapStop = "normal" | "always"
export type AoiScrollHijackMode = "section" | "nearest"
export type AoiPageScrollbarStrategy = "auto" | "stable" | "stable-both-edges" | "hidden"

export interface AoiSmoothScrollSettings {
  damping: number
  durationMs: number
  enabled: boolean
}

export interface AoiScrollSnapSettings {
  enabled: boolean
  mode: AoiScrollSnapMode
  strength: number
}

export interface AoiScrollHijackSettings {
  enabled: boolean
  mode: AoiScrollHijackMode
  thresholdPx: number
}

export interface AoiRubberBandSettings {
  enabled: boolean
  maxOffsetPx: number
  strength: number
}

export interface AoiPageScrollbarSettings {
  strategy: AoiPageScrollbarStrategy
}

export interface AoiScrollRuntimeOptions {
  hijack: AoiScrollHijackSettings
  pageScrollbar: AoiPageScrollbarSettings
  rubberBand: AoiRubberBandSettings
  smooth: AoiSmoothScrollSettings
  snap: AoiScrollSnapSettings
}

export interface AoiScrollToOptions {
  duration?: number
  immediate?: boolean
  lock?: boolean
  offset?: number
}

export type AoiScrollTarget = number | string | HTMLElement

export interface AoiScrollRuntime {
  getLenis: () => unknown
  isReducedMotion: Readonly<Ref<boolean>>
  isSmoothEnabled: Readonly<Ref<boolean>>
  refresh: () => void
  scrollTo: (target: AoiScrollTarget, options?: AoiScrollToOptions) => void
  start: () => void
  stop: () => void
}

export const AOI_SCROLL_DEFAULTS: AoiScrollRuntimeOptions = {
  hijack: {
    enabled: false,
    mode: "section",
    thresholdPx: 64
  },
  pageScrollbar: {
    strategy: "stable"
  },
  rubberBand: {
    enabled: true,
    maxOffsetPx: 28,
    strength: 42
  },
  smooth: {
    damping: 0.1,
    durationMs: 1100,
    enabled: true
  },
  snap: {
    enabled: true,
    mode: "proximity",
    strength: 58
  }
}

const snapModes = new Set<AoiScrollSnapMode>(["proximity", "mandatory"])
const hijackModes = new Set<AoiScrollHijackMode>(["section", "nearest"])
const pageScrollbarStrategies = new Set<AoiPageScrollbarStrategy>(["auto", "stable", "stable-both-edges", "hidden"])
const scrollControlSelector = [
  "a[href]",
  "button",
  "input",
  "textarea",
  "select",
  "summary",
  "iframe",
  "video",
  "audio",
  "[contenteditable='true']",
  "[contenteditable='']",
  "[role='button']",
  "[role='slider']",
  "[data-aoi-scroll-ignore]",
  "[data-lenis-prevent]",
  "[data-lenis-prevent-wheel]",
  "[data-lenis-prevent-touch]"
].join(",")

export function isAoiScrollSnapMode(value: unknown): value is AoiScrollSnapMode {
  return typeof value === "string" && snapModes.has(value as AoiScrollSnapMode)
}

export function isAoiScrollHijackMode(value: unknown): value is AoiScrollHijackMode {
  return typeof value === "string" && hijackModes.has(value as AoiScrollHijackMode)
}

export function isAoiPageScrollbarStrategy(value: unknown): value is AoiPageScrollbarStrategy {
  return typeof value === "string" && pageScrollbarStrategies.has(value as AoiPageScrollbarStrategy)
}

export function clampAoiScrollSetting(value: unknown, min: number, max: number, fallback: number) {
  const next = Number(value)

  if (!Number.isFinite(next)) {
    return fallback
  }

  return Math.min(max, Math.max(min, next))
}

export function normalizeAoiSmoothScrollSettings(
  value: Partial<AoiSmoothScrollSettings> = {}
): AoiSmoothScrollSettings {
  return {
    damping: clampAoiScrollSetting(value.damping, 0.04, 0.22, AOI_SCROLL_DEFAULTS.smooth.damping),
    durationMs: clampAoiScrollSetting(value.durationMs, 600, 1800, AOI_SCROLL_DEFAULTS.smooth.durationMs),
    enabled: typeof value.enabled === "boolean" ? value.enabled : AOI_SCROLL_DEFAULTS.smooth.enabled
  }
}

export function normalizeAoiScrollSnapSettings(
  value: Partial<AoiScrollSnapSettings> = {}
): AoiScrollSnapSettings {
  return {
    enabled: typeof value.enabled === "boolean" ? value.enabled : AOI_SCROLL_DEFAULTS.snap.enabled,
    mode: isAoiScrollSnapMode(value.mode) ? value.mode : AOI_SCROLL_DEFAULTS.snap.mode,
    strength: clampAoiScrollSetting(value.strength, 0, 100, AOI_SCROLL_DEFAULTS.snap.strength)
  }
}

export function normalizeAoiScrollHijackSettings(
  value: Partial<AoiScrollHijackSettings> = {}
): AoiScrollHijackSettings {
  return {
    enabled: typeof value.enabled === "boolean" ? value.enabled : AOI_SCROLL_DEFAULTS.hijack.enabled,
    mode: isAoiScrollHijackMode(value.mode) ? value.mode : AOI_SCROLL_DEFAULTS.hijack.mode,
    thresholdPx: clampAoiScrollSetting(value.thresholdPx, 24, 180, AOI_SCROLL_DEFAULTS.hijack.thresholdPx)
  }
}

export function normalizeAoiRubberBandSettings(
  value: Partial<AoiRubberBandSettings> = {}
): AoiRubberBandSettings {
  return {
    enabled: typeof value.enabled === "boolean" ? value.enabled : AOI_SCROLL_DEFAULTS.rubberBand.enabled,
    maxOffsetPx: clampAoiScrollSetting(value.maxOffsetPx, 8, 36, AOI_SCROLL_DEFAULTS.rubberBand.maxOffsetPx),
    strength: clampAoiScrollSetting(value.strength, 0, 100, AOI_SCROLL_DEFAULTS.rubberBand.strength)
  }
}

export function toAoiScrollDurationSeconds(durationMs: number) {
  return Math.max(0.1, durationMs / 1000)
}

export function toAoiScrollSnapType(axis: AoiScrollAxis, enabled: boolean, mode: AoiScrollSnapMode) {
  if (!enabled) {
    return "none"
  }

  return `${axis} ${mode}`
}

export function toAoiSnapDistanceThreshold(strength: number): `${number}%` {
  const clamped = clampAoiScrollSetting(strength, 0, 100, AOI_SCROLL_DEFAULTS.snap.strength)
  const threshold = Math.round(72 - (clamped * 0.42))

  return `${threshold}%`
}

export function toAoiRubberBandRatio(strength: number) {
  return clampAoiScrollSetting(strength, 0, 100, AOI_SCROLL_DEFAULTS.rubberBand.strength) / 100
}

export function isAoiReducedMotionPreferred() {
  return import.meta.client
    ? window.matchMedia("(prefers-reduced-motion: reduce)").matches
    : false
}

export function isAoiInteractiveScrollTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) {
    return false
  }

  if (target.closest(scrollControlSelector)) {
    return true
  }

  const tagName = target.tagName.toLowerCase()

  return tagName.startsWith("md-")
}

export function isAoiScrollableElement(element: HTMLElement, axis: AoiScrollAxis) {
  const style = window.getComputedStyle(element)
  const overflow = axis === "x" ? style.overflowX : style.overflowY
  const canOverflow = overflow === "auto" || overflow === "scroll" || overflow === "overlay"

  if (!canOverflow) {
    return false
  }

  return axis === "x"
    ? element.scrollWidth > element.clientWidth + 1
    : element.scrollHeight > element.clientHeight + 1
}

export function getAoiWheelScrollIntent(event: Pick<WheelEvent, "deltaX" | "deltaY" | "shiftKey">): {
  axis: AoiScrollAxis
  delta: number
} | null {
  const absX = Math.abs(event.deltaX)
  const absY = Math.abs(event.deltaY)

  if (absX === 0 && absY === 0) {
    return null
  }

  if (event.shiftKey && absY > absX) {
    return {
      axis: "x",
      delta: event.deltaY
    }
  }

  if (absX > absY) {
    return {
      axis: "x",
      delta: event.deltaX
    }
  }

  if (absY > 0) {
    return {
      axis: "y",
      delta: event.deltaY
    }
  }

  return {
    axis: "x",
    delta: event.deltaX
  }
}

export function canAoiScrollElementContinue(
  element: HTMLElement,
  axis: AoiScrollAxis,
  delta: number
) {
  if (!isAoiScrollableElement(element, axis) || delta === 0) {
    return false
  }

  const current = axis === "x" ? element.scrollLeft : element.scrollTop
  const max = axis === "x"
    ? element.scrollWidth - element.clientWidth
    : element.scrollHeight - element.clientHeight

  if (max <= 1) {
    return false
  }

  return delta < 0
    ? current > 1
    : current < max - 1
}

export function findAoiScrollableAncestor(
  target: EventTarget | null,
  axis: AoiScrollAxis,
  boundary: HTMLElement | null = null
) {
  const scrollBoundary = boundary || (import.meta.client ? document.documentElement : null)
  let node: HTMLElement | null = null

  if (target instanceof HTMLElement) {
    node = target
  } else if (target instanceof Element) {
    node = target.parentElement
  }

  while (node && node !== scrollBoundary) {
    if (isAoiScrollableElement(node, axis)) {
      return node
    }

    node = node.parentElement
  }

  return null
}

export function shouldAllowAoiNativeWheelScroll(event: Pick<WheelEvent, "deltaX" | "deltaY" | "shiftKey" | "target">) {
  const intent = getAoiWheelScrollIntent(event)

  if (!intent) {
    return false
  }

  const scrollable = findAoiScrollableAncestor(event.target, intent.axis)

  return Boolean(scrollable && canAoiScrollElementContinue(scrollable, intent.axis, intent.delta))
}

export function hasAoiScrollableAncestor(
  target: EventTarget | null,
  boundary: HTMLElement,
  axis: AoiScrollAxis
) {
  if (!(target instanceof HTMLElement)) {
    return false
  }

  let node: HTMLElement | null = target

  while (node && node !== boundary) {
    if (node.dataset.aoiScrollNative === "true" || isAoiScrollableElement(node, axis)) {
      return true
    }

    node = node.parentElement
  }

  return false
}

export function shouldSkipAoiPageScrollEnhancement(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) {
    return false
  }

  return Boolean(target.closest([
    "[data-aoi-scroll-area]",
    "[data-aoi-scroll-native='true']",
    "[data-aoi-scroll-ignore]",
    "[data-lenis-prevent]",
    "[role='dialog']",
    "md-dialog",
    "md-menu",
    "md-select",
    "md-slider",
    ".aoi-lightbox"
  ].join(",")))
}
