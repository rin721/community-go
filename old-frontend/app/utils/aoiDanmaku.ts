import type {
  AoiDanmakuItem,
  AoiDanmakuMappedItem,
  AoiDanmakuMapper,
  AoiDanmakuMode
} from "~/types/danmaku"

export interface AoiDanmakuRuntimeSettings {
  blocklist: string
  bottomModeEnabled: boolean
  enabled: boolean
  fontScale: number
  opacity: number
  scrollModeEnabled: boolean
  speed: number
  topModeEnabled: boolean
  visibleArea: number
}

export interface AoiDanmakuRenderItem {
  item: AoiDanmakuItem
  key: string
  mode: AoiDanmakuMode
  style: Record<string, string>
  track: number
}

export interface AoiDanmakuDirectiveValue {
  currentTime: number
  durationSeconds: number
  items: AoiDanmakuItem[]
  playing: boolean
  settings?: Partial<AoiDanmakuRuntimeSettings>
}

export const AOI_DANMAKU_DEFAULT_COLOR = "#ffffff"

export const AOI_DANMAKU_COLORS = [
  AOI_DANMAKU_DEFAULT_COLOR,
  "#7ee7ff",
  "#ffe58a",
  "#ffb4d8",
  "#b9f6ca",
  "#d7c4ff"
]

export const AOI_DANMAKU_DEFAULTS: AoiDanmakuRuntimeSettings = {
  blocklist: "",
  bottomModeEnabled: true,
  enabled: true,
  fontScale: 1,
  opacity: 0.86,
  scrollModeEnabled: true,
  speed: 1,
  topModeEnabled: true,
  visibleArea: 65
}

function clampNumber(value: unknown, min: number, max: number, fallback: number) {
  const numberValue = Number(value)

  if (!Number.isFinite(numberValue)) {
    return fallback
  }

  return Math.min(max, Math.max(min, numberValue))
}

function hashString(value: string) {
  let hash = 0

  for (let index = 0; index < value.length; index += 1) {
    hash = ((hash << 5) - hash + value.charCodeAt(index)) | 0
  }

  return Math.abs(hash)
}

function parseBlocklist(value: string) {
  return value
    .split(/[\n,;，；]+/)
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean)
}

function normalizeMode(value: unknown): AoiDanmakuMode {
  return value === "top" || value === "bottom" ? value : "scroll"
}

function modeEnabled(mode: AoiDanmakuMode, settings: AoiDanmakuRuntimeSettings) {
  if (mode === "top") {
    return settings.topModeEnabled
  }

  if (mode === "bottom") {
    return settings.bottomModeEnabled
  }

  return settings.scrollModeEnabled
}

function durationForMode(mode: AoiDanmakuMode, settings: AoiDanmakuRuntimeSettings) {
  const speed = Math.max(0.5, settings.speed)

  return mode === "scroll" ? 9 / speed : 4.2 / speed
}

function trackCountForMode(mode: AoiDanmakuMode, settings: AoiDanmakuRuntimeSettings) {
  const baseTracks = mode === "scroll" ? 10 : 4
  const areaFactor = settings.visibleArea / 100
  const fontFactor = 1 / settings.fontScale

  return Math.max(1, Math.floor(baseTracks * areaFactor * fontFactor))
}

function defaultMapDanmakuItem<T>(item: T): Partial<AoiDanmakuMappedItem> {
  return item && typeof item === "object" ? item as Partial<AoiDanmakuMappedItem> : {}
}

export function normalizeAoiDanmakuItem<T>(
  item: T,
  index: number,
  mapper?: AoiDanmakuMapper<T>
): AoiDanmakuItem {
  const mapped = mapper ? mapper(item, index) : defaultMapDanmakuItem(item)
  const id = typeof mapped.id === "string" && mapped.id.trim()
    ? mapped.id
    : `danmaku-${index + 1}`
  const body = typeof mapped.body === "string" ? mapped.body : String(mapped.body || "")
  const timeSeconds = clampNumber(mapped.timeSeconds, 0, Number.MAX_SAFE_INTEGER, 0)
  const color = typeof mapped.color === "string" && mapped.color.trim()
    ? mapped.color
    : AOI_DANMAKU_DEFAULT_COLOR

  return {
    id,
    body,
    timeSeconds,
    mode: normalizeMode(mapped.mode),
    color,
    authorName: typeof mapped.authorName === "string" ? mapped.authorName : undefined,
    createdAt: typeof mapped.createdAt === "string" ? mapped.createdAt : undefined
  }
}

export function normalizeAoiDanmakuItems<T>(
  items: T[],
  mapper?: AoiDanmakuMapper<T>
) {
  return items.map((item, index) => normalizeAoiDanmakuItem(item, index, mapper))
}

export function normalizeAoiDanmakuSettings(
  value: Partial<AoiDanmakuRuntimeSettings> = {}
): AoiDanmakuRuntimeSettings {
  return {
    blocklist: typeof value.blocklist === "string" ? value.blocklist : AOI_DANMAKU_DEFAULTS.blocklist,
    bottomModeEnabled: typeof value.bottomModeEnabled === "boolean" ? value.bottomModeEnabled : AOI_DANMAKU_DEFAULTS.bottomModeEnabled,
    enabled: typeof value.enabled === "boolean" ? value.enabled : AOI_DANMAKU_DEFAULTS.enabled,
    fontScale: clampNumber(value.fontScale, 0.7, 1.6, AOI_DANMAKU_DEFAULTS.fontScale),
    opacity: clampNumber(value.opacity, 0.2, 1, AOI_DANMAKU_DEFAULTS.opacity),
    scrollModeEnabled: typeof value.scrollModeEnabled === "boolean" ? value.scrollModeEnabled : AOI_DANMAKU_DEFAULTS.scrollModeEnabled,
    speed: clampNumber(value.speed, 0.5, 2, AOI_DANMAKU_DEFAULTS.speed),
    topModeEnabled: typeof value.topModeEnabled === "boolean" ? value.topModeEnabled : AOI_DANMAKU_DEFAULTS.topModeEnabled,
    visibleArea: clampNumber(value.visibleArea, 20, 100, AOI_DANMAKU_DEFAULTS.visibleArea)
  }
}

export function filterAoiDanmakuItems(
  items: AoiDanmakuItem[],
  settings: Partial<AoiDanmakuRuntimeSettings> = {}
) {
  const runtime = normalizeAoiDanmakuSettings(settings)
  const blocked = parseBlocklist(runtime.blocklist)

  if (!runtime.enabled) {
    return []
  }

  return items.filter((item) => {
    const body = item.body.trim()

    if (!body || !modeEnabled(item.mode, runtime)) {
      return false
    }

    const normalizedBody = body.toLowerCase()

    return !blocked.some((word) => normalizedBody.includes(word))
  })
}

export function createAoiDanmakuRenderItems(
  items: AoiDanmakuItem[],
  currentTime: number,
  settings: Partial<AoiDanmakuRuntimeSettings> = {}
): AoiDanmakuRenderItem[] {
  const runtime = normalizeAoiDanmakuSettings(settings)
  const filtered = filterAoiDanmakuItems(items, runtime)
  const safeCurrentTime = Math.max(0, Number.isFinite(currentTime) ? currentTime : 0)

  return filtered.flatMap((item) => {
    const age = safeCurrentTime - item.timeSeconds
    const duration = durationForMode(item.mode, runtime)

    if (age < 0 || age > duration) {
      return []
    }

    const trackCount = trackCountForMode(item.mode, runtime)
    const track = hashString(item.id) % trackCount
    const offset = item.mode === "bottom"
      ? `${Math.min(90, (track + 0.5) * (runtime.visibleArea / trackCount))}%`
      : `${Math.min(runtime.visibleArea, (track + 0.5) * (runtime.visibleArea / trackCount))}%`

    return [{
      item,
      key: `${item.id}-${Math.floor(item.timeSeconds * 10)}`,
      mode: item.mode,
      track,
      style: {
        "--aoi-danmaku-item-bottom": item.mode === "bottom" ? offset : "auto",
        "--aoi-danmaku-item-color": item.color || AOI_DANMAKU_DEFAULT_COLOR,
        "--aoi-danmaku-item-delay": `${Math.min(0, -age)}s`,
        "--aoi-danmaku-item-duration": `${duration}s`,
        "--aoi-danmaku-item-top": item.mode === "bottom" ? "auto" : offset
      }
    }]
  })
}
