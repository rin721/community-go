export interface AoiRgbaColor {
  r: number
  g: number
  b: number
  a: number
}

export interface AoiHslColor {
  h: number
  s: number
  l: number
}

export interface AoiHsbColor {
  h: number
  s: number
  b: number
}

const DEFAULT_RGBA: AoiRgbaColor = {
  r: 255,
  g: 125,
  b: 82,
  a: 1
}

export function clampAoiColorValue(value: number, min: number, max: number) {
  if (!Number.isFinite(value)) {
    return min
  }

  return Math.min(max, Math.max(min, value))
}

export function normalizeAoiRgbaColor(value: unknown, fallback: AoiRgbaColor = DEFAULT_RGBA): AoiRgbaColor {
  if (typeof value === "string") {
    return parseAoiHexColor(value, fallback.a) || fallback
  }

  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return fallback
  }

  const candidate = value as Partial<AoiRgbaColor>

  return {
    r: Math.round(readAoiColorNumber(candidate.r, fallback.r, 0, 255)),
    g: Math.round(readAoiColorNumber(candidate.g, fallback.g, 0, 255)),
    b: Math.round(readAoiColorNumber(candidate.b, fallback.b, 0, 255)),
    a: readAoiColorNumber(candidate.a, fallback.a, 0, 1)
  }
}

export function parseAoiHexColor(value: string, fallbackAlpha = 1) {
  const normalized = value.trim().replace(/^#/, "")

  if (/^[\da-f]{3}$/i.test(normalized)) {
    return {
      r: Number.parseInt(`${normalized[0]}${normalized[0]}`, 16),
      g: Number.parseInt(`${normalized[1]}${normalized[1]}`, 16),
      b: Number.parseInt(`${normalized[2]}${normalized[2]}`, 16),
      a: clampAoiColorValue(fallbackAlpha, 0, 1)
    }
  }

  if (/^[\da-f]{6}([\da-f]{2})?$/i.test(normalized)) {
    return {
      r: Number.parseInt(normalized.slice(0, 2), 16),
      g: Number.parseInt(normalized.slice(2, 4), 16),
      b: Number.parseInt(normalized.slice(4, 6), 16),
      a: normalized.length === 8
        ? Number.parseInt(normalized.slice(6, 8), 16) / 255
        : clampAoiColorValue(fallbackAlpha, 0, 1)
    }
  }

  return null
}

export function aoiRgbaToHex(color: AoiRgbaColor, includeAlpha = false) {
  const safe = normalizeAoiRgbaColor(color)
  const hex = [safe.r, safe.g, safe.b]
    .map((component) => component.toString(16).padStart(2, "0"))
    .join("")

  if (!includeAlpha) {
    return `#${hex}`.toUpperCase()
  }

  const alpha = Math.round(safe.a * 255).toString(16).padStart(2, "0")

  return `#${hex}${alpha}`.toUpperCase()
}

export function aoiRgbaToCss(color: AoiRgbaColor) {
  const safe = normalizeAoiRgbaColor(color)

  if (safe.a >= 1) {
    return `rgb(${safe.r}, ${safe.g}, ${safe.b})`
  }

  return `rgba(${safe.r}, ${safe.g}, ${safe.b}, ${formatAoiAlpha(safe.a)})`
}

export function aoiRgbaToHsb(color: AoiRgbaColor): AoiHsbColor {
  const safe = normalizeAoiRgbaColor(color)
  const r = safe.r / 255
  const g = safe.g / 255
  const b = safe.b / 255
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const delta = max - min

  return {
    h: hueFromRgb(r, g, b, max, delta),
    s: max === 0 ? 0 : delta / max * 100,
    b: max * 100
  }
}

export function aoiHsbToRgba(color: AoiHsbColor, alpha = 1): AoiRgbaColor {
  const h = normalizeHue(color.h)
  const s = clampAoiColorValue(color.s, 0, 100) / 100
  const v = clampAoiColorValue(color.b, 0, 100) / 100
  const c = v * s
  const x = c * (1 - Math.abs(h / 60 % 2 - 1))
  const m = v - c
  const [r, g, b] = rgbPrimeFromHue(h, c, x)

  return {
    r: Math.round((r + m) * 255),
    g: Math.round((g + m) * 255),
    b: Math.round((b + m) * 255),
    a: clampAoiColorValue(alpha, 0, 1)
  }
}

export function aoiRgbaToHsl(color: AoiRgbaColor): AoiHslColor {
  const safe = normalizeAoiRgbaColor(color)
  const r = safe.r / 255
  const g = safe.g / 255
  const b = safe.b / 255
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const delta = max - min
  const lightness = (max + min) / 2

  return {
    h: hueFromRgb(r, g, b, max, delta),
    s: delta === 0 ? 0 : delta / (1 - Math.abs(2 * lightness - 1)) * 100,
    l: lightness * 100
  }
}

export function aoiHslToRgba(color: AoiHslColor, alpha = 1): AoiRgbaColor {
  const h = normalizeHue(color.h)
  const s = clampAoiColorValue(color.s, 0, 100) / 100
  const l = clampAoiColorValue(color.l, 0, 100) / 100
  const c = (1 - Math.abs(2 * l - 1)) * s
  const x = c * (1 - Math.abs(h / 60 % 2 - 1))
  const m = l - c / 2
  const [r, g, b] = rgbPrimeFromHue(h, c, x)

  return {
    r: Math.round((r + m) * 255),
    g: Math.round((g + m) * 255),
    b: Math.round((b + m) * 255),
    a: clampAoiColorValue(alpha, 0, 1)
  }
}

export function mixAoiRgbaColor(from: AoiRgbaColor, to: AoiRgbaColor, amount: number): AoiRgbaColor {
  const start = normalizeAoiRgbaColor(from)
  const end = normalizeAoiRgbaColor(to)
  const weight = clampAoiColorValue(amount, 0, 1)

  return {
    r: Math.round(start.r + (end.r - start.r) * weight),
    g: Math.round(start.g + (end.g - start.g) * weight),
    b: Math.round(start.b + (end.b - start.b) * weight),
    a: start.a + (end.a - start.a) * weight
  }
}

function formatAoiAlpha(value: number) {
  return clampAoiColorValue(value, 0, 1)
    .toFixed(3)
    .replace(/0+$/, "")
    .replace(/\.$/, "")
}

function readAoiColorNumber(value: unknown, fallback: number, min: number, max: number) {
  const numeric = Number(value)

  if (!Number.isFinite(numeric)) {
    return clampAoiColorValue(fallback, min, max)
  }

  return clampAoiColorValue(numeric, min, max)
}

function normalizeHue(value: number) {
  if (!Number.isFinite(value)) {
    return 0
  }

  return (value % 360 + 360) % 360
}

function hueFromRgb(r: number, g: number, b: number, max: number, delta: number) {
  if (delta === 0) {
    return 0
  }

  if (max === r) {
    return normalizeHue((g - b) / delta * 60)
  }

  if (max === g) {
    return (b - r) / delta * 60 + 120
  }

  return (r - g) / delta * 60 + 240
}

function rgbPrimeFromHue(hue: number, chroma: number, x: number): [number, number, number] {
  if (hue < 60) {
    return [chroma, x, 0]
  }

  if (hue < 120) {
    return [x, chroma, 0]
  }

  if (hue < 180) {
    return [0, chroma, x]
  }

  if (hue < 240) {
    return [0, x, chroma]
  }

  if (hue < 300) {
    return [x, 0, chroma]
  }

  return [chroma, 0, x]
}
