export interface AoiImageClipboardFilePayload {
  files: File[]
  event: ClipboardEvent | DragEvent | Event
  source: "drop" | "paste" | "select"
}

export type AoiImageClipboardAspectValue = "free" | "1:1" | "4:3" | "16:9"
export type AoiImageClipboardMode = "dialog" | "inline"
export type AoiImageClipboardConfirmBehavior = "export-close" | "export-stay"

export interface AoiImageClipboardAspectOption {
  icon?: string
  label: string
  ratio?: number
  value: AoiImageClipboardAspectValue | (string & {})
}

export interface AoiImageClipboardCropMeta {
  height: number
  rotate: number
  scaleX: number
  scaleY: number
  width: number
  x: number
  y: number
}

export interface AoiImageClipboardResult {
  blob: Blob
  crop: AoiImageClipboardCropMeta
  file: File
  height: number
  mimeType: "image/webp"
  objectUrl: string
  size: number
  sourceName: string
  width: number
}

export interface AoiImageClipboardExportOptions {
  fileName?: string
  height?: number
  maxHeight?: number
  maxWidth?: number
  quality?: number
  width?: number
}

export type AoiImageClipboardDirectiveValue =
  | ((payload: AoiImageClipboardFilePayload) => void)
  | {
    accept?: string
    disabled?: boolean
    multiple?: boolean
    onFiles: (payload: AoiImageClipboardFilePayload) => void
    selectOnClick?: boolean
  }

export function isAcceptedImageFile(file: File, accept = "image/*") {
  if (!file.type.startsWith("image/")) {
    return false
  }

  const rules = accept
    .split(",")
    .map((rule) => rule.trim().toLowerCase())
    .filter(Boolean)

  if (!rules.length || rules.includes("image/*")) {
    return true
  }

  const fileName = file.name.toLowerCase()
  const fileType = file.type.toLowerCase()

  return rules.some((rule) => {
    if (rule.endsWith("/*")) {
      return fileType.startsWith(rule.slice(0, -1))
    }

    if (rule.startsWith(".")) {
      return fileName.endsWith(rule)
    }

    return fileType === rule
  })
}

export function collectImageFiles(
  fileList?: FileList | File[] | null,
  accept?: string,
  multiple = true
) {
  const files = Array.from(fileList || []).filter((file) => isAcceptedImageFile(file, accept))

  return multiple ? files : files.slice(0, 1)
}

export function collectImageFilesFromDataTransfer(
  dataTransfer?: DataTransfer | null,
  accept?: string,
  multiple = true
) {
  const itemFiles = Array.from(dataTransfer?.items || [])
    .filter((item) => item.kind === "file")
    .map((item) => item.getAsFile())
    .filter((file): file is File => Boolean(file))

  return collectImageFiles(itemFiles.length ? itemFiles : dataTransfer?.files, accept, multiple)
}

export const aoiDefaultImageAspectRatios: AoiImageClipboardAspectOption[] = [
  { label: "自由", value: "free", icon: "move", ratio: Number.NaN },
  { label: "1:1", value: "1:1", icon: "square", ratio: 1 },
  { label: "4:3", value: "4:3", icon: "rectangle-horizontal", ratio: 4 / 3 },
  { label: "16:9", value: "16:9", icon: "panel-top", ratio: 16 / 9 }
]

export function resolveAoiImageAspectRatio(
  value: AoiImageClipboardAspectOption["value"],
  options: AoiImageClipboardAspectOption[] = aoiDefaultImageAspectRatios
) {
  const option = options.find((item) => item.value === value)

  if (option?.ratio !== undefined) {
    return option.ratio
  }

  if (value === "free") {
    return Number.NaN
  }

  const ratioParts = String(value).split(":").map(Number)

  const [width, height] = ratioParts

  if (
    ratioParts.length === 2
    && width !== undefined
    && height !== undefined
    && Number.isFinite(width)
    && Number.isFinite(height)
    && width > 0
    && height > 0
  ) {
    return width / height
  }

  return Number.NaN
}

export function formatAoiImageFileSize(size: number) {
  if (size < 1024) {
    return `${size} B`
  }

  if (size < 1024 * 1024) {
    return `${Math.round(size / 102.4) / 10} KB`
  }

  return `${Math.round(size / 1024 / 102.4) / 10} MB`
}

export async function copyAoiImageBlobToClipboard(blob: Blob) {
  if (!navigator.clipboard || typeof ClipboardItem === "undefined") {
    throw new Error("当前浏览器不支持复制图片到剪贴板")
  }

  try {
    await navigator.clipboard.write([
      new ClipboardItem({
        [blob.type]: blob
      })
    ])
  } catch {
    throw new Error("复制失败，请确认页面处于焦点并允许剪贴板权限")
  }
}

export function downloadAoiImageResult(result: AoiImageClipboardResult) {
  const link = document.createElement("a")
  const objectUrl = URL.createObjectURL(result.blob)

  link.href = objectUrl
  link.download = result.file.name
  link.rel = "noopener"
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000)
}
