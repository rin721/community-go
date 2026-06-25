import type { AoiAccentScale } from "./aoiAccentDerivation"

export interface AoiAccentPresetOption extends AoiAccentScale {
  label: string
  subtitle: string
  value: string
}

export interface AoiAccentPresetCardConfig {
  backgroundImagePath?: string
  description?: string
  subtitle?: string
  title?: string
}

export interface AoiAccentPresetCardOption extends AoiAccentPresetOption {
  backgroundImagePath: string
  backgroundImageUrl: string
  cardDescription: string
  cardSubtitle: string
  cardTitle: string
}

export type AoiAccentPresetCards = Record<string, AoiAccentPresetCardConfig>

const publicImageExtensions = new Set([".avif", ".gif", ".jpg", ".jpeg", ".png", ".svg", ".webp"])

export const AOI_ACCENT_PRESETS: AoiAccentPresetOption[] = [
  {
    value: "sunflower-orange",
    label: "葵花橙",
    subtitle: "Sunflower Orange",
    accent60: "#ff7d52",
    accent50: "#ff9471",
    accent40: "#ffb49b",
    accent20: "#ffe0d5",
    accent10: "#fff2ee"
  },
  {
    value: "cocoa-pink",
    label: "心爱粉",
    subtitle: "Cocoa Rose",
    accent60: "#d94f8f",
    accent50: "#f2709c",
    accent40: "#f69bb9",
    accent20: "#ffd6e5",
    accent10: "#fff1f7"
  },
  {
    value: "chino-blue",
    label: "智乃蓝",
    subtitle: "Chino Clear",
    accent60: "#0f9fb7",
    accent50: "#22b8cf",
    accent40: "#5ed3df",
    accent20: "#c9f3f7",
    accent10: "#e9fbfd"
  },
  {
    value: "rize-purple",
    label: "理世紫",
    subtitle: "Rize Violet",
    accent60: "#6f62d9",
    accent50: "#897df1",
    accent40: "#aaa2f7",
    accent20: "#ddd9ff",
    accent10: "#f3f1ff"
  },
  {
    value: "chiya-green",
    label: "千夜绿",
    subtitle: "Chiya Matcha",
    accent60: "#3f9c75",
    accent50: "#5fc795",
    accent40: "#8eddb8",
    accent20: "#d6f3e5",
    accent10: "#effbf5"
  },
  {
    value: "syaro-yellow",
    label: "纱路黄",
    subtitle: "Syaro Honey",
    accent60: "#c98b14",
    accent50: "#f7b955",
    accent40: "#ffd47f",
    accent20: "#ffedc7",
    accent10: "#fff8e8"
  },
  {
    value: "maya-cyan",
    label: "麻耶青",
    subtitle: "Maya Aqua",
    accent60: "#0e89a6",
    accent50: "#2eb6d6",
    accent40: "#72d8ea",
    accent20: "#d2f4fb",
    accent10: "#eefcff"
  },
  {
    value: "megumi-red",
    label: "小惠红",
    subtitle: "Megu Berry",
    accent60: "#d04758",
    accent50: "#f36f7e",
    accent40: "#f89aa5",
    accent20: "#ffd8de",
    accent10: "#fff1f3"
  }
]

const presetValues = new Set(AOI_ACCENT_PRESETS.map((preset) => preset.value))

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value)
}

function normalizeCardText(value: unknown, maxLength: number) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : ""
}

export function isAoiAccentPresetValue(value: unknown): value is string {
  return typeof value === "string" && presetValues.has(value)
}

export function normalizeAoiPublicAssetImagePath(value: unknown) {
  if (typeof value !== "string") {
    return ""
  }

  let path = value.trim().replace(/\\/g, "/").replace(/^\/+/, "")

  if (path.startsWith("public/")) {
    path = path.slice("public/".length)
  }

  const segments = path.split("/").filter(Boolean)

  if (
    !segments.length
    || path.includes("\0")
    || /^[a-zA-Z][a-zA-Z\d+.-]*:/.test(path)
    || segments.some((segment) => segment === "." || segment === "..")
  ) {
    return ""
  }

  const filename = segments[segments.length - 1] || ""
  const dotIndex = filename.lastIndexOf(".")
  const extension = dotIndex >= 0 ? filename.slice(dotIndex).toLowerCase() : ""

  return publicImageExtensions.has(extension) ? segments.join("/") : ""
}

export function normalizeAoiAccentPresetCards(value: unknown): AoiAccentPresetCards {
  const source = isRecord(value) ? value : {}
  const cards: AoiAccentPresetCards = {}

  for (const preset of AOI_ACCENT_PRESETS) {
    const candidate = source[preset.value]

    if (!isRecord(candidate)) {
      continue
    }

    const card: AoiAccentPresetCardConfig = {}
    const title = normalizeCardText(candidate.title, 48)
    const subtitle = normalizeCardText(candidate.subtitle, 64)
    const description = normalizeCardText(candidate.description, 180)
    const backgroundImagePath = normalizeAoiPublicAssetImagePath(candidate.backgroundImagePath)

    if (title) {
      card.title = title
    }

    if (subtitle) {
      card.subtitle = subtitle
    }

    if (description) {
      card.description = description
    }

    if (backgroundImagePath) {
      card.backgroundImagePath = backgroundImagePath
    }

    if (Object.keys(card).length) {
      cards[preset.value] = card
    }
  }

  return cards
}

export function aoiPublicAssetPathToUrl(path: string) {
  const normalized = normalizeAoiPublicAssetImagePath(path)

  if (!normalized) {
    return ""
  }

  return `/${normalized.split("/").map((segment) => encodeURIComponent(segment)).join("/")}`
}

export function createAoiAccentPresetCardOptions(cards: AoiAccentPresetCards = {}): AoiAccentPresetCardOption[] {
  const normalizedCards = normalizeAoiAccentPresetCards(cards)

  return AOI_ACCENT_PRESETS.map((preset) => {
    const card = normalizedCards[preset.value] || {}
    const backgroundImagePath = card.backgroundImagePath || ""

    return {
      ...preset,
      backgroundImagePath,
      backgroundImageUrl: backgroundImagePath ? aoiPublicAssetPathToUrl(backgroundImagePath) : "",
      cardDescription: card.description || "",
      cardSubtitle: card.subtitle || preset.subtitle,
      cardTitle: card.title || preset.label
    }
  })
}
