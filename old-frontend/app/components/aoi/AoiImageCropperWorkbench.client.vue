<script setup lang="ts">
import Cropper from "cropperjs"
import "cropperjs/dist/cropper.css"
import type {
  AoiImageClipboardAspectOption,
  AoiImageClipboardAspectValue,
  AoiImageClipboardConfirmBehavior,
  AoiImageClipboardCropMeta,
  AoiImageClipboardExportOptions,
  AoiImageClipboardResult
} from "~/utils/aoiImageClipboard"
import {
  aoiDefaultImageAspectRatios,
  copyAoiImageBlobToClipboard,
  downloadAoiImageResult,
  formatAoiImageFileSize,
  resolveAoiImageAspectRatio
} from "~/utils/aoiImageClipboard"

const props = withDefaults(defineProps<{
  sourceUrl: string
  sourceName: string
  sourceSize?: number
  aspectRatio?: AoiImageClipboardAspectValue
  aspectRatios?: AoiImageClipboardAspectOption[]
  disabled?: boolean
  maxOutputHeight?: number
  maxOutputWidth?: number
  outputFileName?: string
  quality?: number
  compact?: boolean
  confirmBehavior?: AoiImageClipboardConfirmBehavior
}>(), {
  aspectRatio: "free",
  aspectRatios: () => aoiDefaultImageAspectRatios,
  compact: false,
  confirmBehavior: "export-close",
  disabled: false,
  maxOutputHeight: undefined,
  maxOutputWidth: undefined,
  outputFileName: undefined,
  quality: .82,
  sourceSize: undefined
})

const emit = defineEmits<{
  close: []
  "crop-interaction-end": []
  "crop-interaction-start": []
  error: [message: string]
  result: [payload: AoiImageClipboardResult]
}>()

type CropperLayoutMethods = Cropper & {
  renderCanvas?: (changed?: boolean, transformed?: boolean) => void
  renderCropBox?: () => void
}

const MAX_OUTPUT_DIMENSION = 4096
const CROPPER_READY_TIMEOUT = 8000

const canvasRef = ref<HTMLElement | null>(null)
const imageRef = ref<HTMLImageElement | null>(null)
const selectedAspect = ref<AoiImageClipboardAspectOption["value"]>(props.aspectRatio)
const qualityPercent = ref(Math.round(clamp(props.quality, .1, 1) * 100))
const maxWidthValue = ref(props.maxOutputWidth ? String(props.maxOutputWidth) : "")
const maxHeightValue = ref(props.maxOutputHeight ? String(props.maxOutputHeight) : "")
const cropperReady = ref(false)
const imageLoading = ref(true)
const isExporting = ref(false)
const resultDirty = ref(false)
const flipX = ref(1)
const flipY = ref(1)
const result = ref<AoiImageClipboardResult | null>(null)
const errorText = ref("")
const statusText = ref("")
const cropMeta = ref<AoiImageClipboardCropMeta | null>(null)

let cropper: Cropper | undefined
let initializedSourceUrl = ""
let resolveCropperReady: (() => void) | undefined
let cropperReadyPromise = createCropperReadyPromise()
let resizeFrame = 0
let resizeObserver: ResizeObserver | undefined
let cropInteractionActive = false
let cropInteractionEndTimer = 0
let cropInteractionListenersAttached = false

const aspectItems = computed(() => props.aspectRatios.map((item) => ({
  disabled: props.disabled,
  icon: item.icon,
  label: item.label,
  value: String(item.value)
})))
const qualityValue = computed(() => clamp(qualityPercent.value / 100, .1, 1))
const hasFreshResult = computed(() => Boolean(result.value && !resultDirty.value))
const primaryActionLabel = computed(() => props.confirmBehavior === "export-stay" ? "导出 WebP" : "导出并使用")
const statusLine = computed(() => {
  if (imageLoading.value) {
    return "正在载入图片..."
  }

  if (isExporting.value) {
    return "正在导出 WebP..."
  }

  return statusText.value
})
const resultSummary = computed(() => {
  if (!result.value) {
    return ""
  }

  const summary = `${result.value.width}×${result.value.height} · ${formatAoiImageFileSize(result.value.size)}`

  return resultDirty.value ? `结果待更新 · ${summary}` : summary
})
const sourceSummary = computed(() => {
  if (!props.sourceSize) {
    return props.sourceName
  }

  return `${props.sourceName} · ${formatAoiImageFileSize(props.sourceSize)}`
})

watch(() => props.sourceUrl, () => {
  revokeResultUrl()
  result.value = null
  resultDirty.value = false
  statusText.value = ""
  errorText.value = ""
  flipX.value = 1
  flipY.value = 1
  imageLoading.value = true
  initializedSourceUrl = ""
  nextTick(() => {
    initializeCropper()
    startResizeObserver()
  })
})

watch(() => props.aspectRatio, (value) => {
  selectedAspect.value = value
})

watch(selectedAspect, () => {
  applyAspectRatio()
  markResultDirty("比例已调整，结果待更新")
})

watch([qualityPercent, maxWidthValue, maxHeightValue], () => {
  markResultDirty("导出设置已调整，结果待更新")
})

onMounted(() => {
  nextTick(() => {
    initializeCropper()
    startResizeObserver()
  })
})

onBeforeUnmount(() => {
  stopResizeObserver()
  cancelResizeFrame()
  cleanupCropInteraction()
  revokeResultUrl()
  destroyCropper()
})

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

function createCropperReadyPromise() {
  return new Promise<void>((resolve) => {
    resolveCropperReady = resolve
  })
}

function resolveReadyPromise() {
  resolveCropperReady?.()
  resolveCropperReady = undefined
}

function waitForCropperReady(timeout = CROPPER_READY_TIMEOUT) {
  if (cropper && cropperReady.value) {
    return Promise.resolve()
  }

  initializeCropper()

  if (!cropperReadyPromise) {
    cropperReadyPromise = createCropperReadyPromise()
  }

  return Promise.race([
    cropperReadyPromise,
    new Promise<void>((_, reject) => {
      window.setTimeout(() => reject(new Error("裁剪器加载超时，请重新选择图片")), timeout)
    })
  ])
}

function parseDimension(value: string) {
  const dimension = Number(value)

  return Number.isFinite(dimension) && dimension > 0
    ? Math.min(Math.round(dimension), MAX_OUTPUT_DIMENSION)
    : undefined
}

function destroyCropper() {
  cropper?.destroy()
  cropper = undefined
  cropperReady.value = false
  resolveCropperReady = undefined
}

function cancelResizeFrame() {
  if (resizeFrame) {
    window.cancelAnimationFrame(resizeFrame)
    resizeFrame = 0
  }
}

function startResizeObserver() {
  if (resizeObserver || !canvasRef.value || typeof ResizeObserver === "undefined") {
    return
  }

  resizeObserver = new ResizeObserver(() => {
    refreshCropperLayout()
  })
  resizeObserver.observe(canvasRef.value)
}

function stopResizeObserver() {
  resizeObserver?.disconnect()
  resizeObserver = undefined
}

function refreshCropperLayout() {
  cancelResizeFrame()

  resizeFrame = window.requestAnimationFrame(() => {
    resizeFrame = 0

    if (!cropper || !cropperReady.value) {
      return
    }

    const cropperWithLayout = cropper as CropperLayoutMethods

    cropperWithLayout.renderCanvas?.(true, true)
    cropperWithLayout.renderCropBox?.()
    cropper.crop()
  })
}

function clearCropInteractionEndTimer() {
  if (cropInteractionEndTimer) {
    window.clearTimeout(cropInteractionEndTimer)
    cropInteractionEndTimer = 0
  }
}

function addCropInteractionEndListeners() {
  if (cropInteractionListenersAttached) {
    return
  }

  cropInteractionListenersAttached = true
  window.addEventListener("blur", finishCropInteraction)
  window.addEventListener("mouseup", finishCropInteraction)
  window.addEventListener("pointercancel", finishCropInteraction)
  window.addEventListener("pointerup", finishCropInteraction)
  window.addEventListener("touchcancel", finishCropInteraction)
  window.addEventListener("touchend", finishCropInteraction)
}

function removeCropInteractionEndListeners() {
  if (!cropInteractionListenersAttached) {
    return
  }

  cropInteractionListenersAttached = false
  window.removeEventListener("blur", finishCropInteraction)
  window.removeEventListener("mouseup", finishCropInteraction)
  window.removeEventListener("pointercancel", finishCropInteraction)
  window.removeEventListener("pointerup", finishCropInteraction)
  window.removeEventListener("touchcancel", finishCropInteraction)
  window.removeEventListener("touchend", finishCropInteraction)
}

function beginCropInteraction() {
  clearCropInteractionEndTimer()

  if (!cropInteractionActive) {
    cropInteractionActive = true
    emit("crop-interaction-start")
  }

  addCropInteractionEndListeners()
}

function finishCropInteraction() {
  removeCropInteractionEndListeners()
  clearCropInteractionEndTimer()
  cropInteractionEndTimer = window.setTimeout(() => {
    cropInteractionActive = false
    cropInteractionEndTimer = 0
    emit("crop-interaction-end")
  }, 220)
}

function cleanupCropInteraction() {
  removeCropInteractionEndListeners()
  clearCropInteractionEndTimer()

  if (cropInteractionActive) {
    cropInteractionActive = false
    emit("crop-interaction-end")
  }
}

function revokeResultUrl() {
  if (result.value?.objectUrl) {
    URL.revokeObjectURL(result.value.objectUrl)
  }
}

function initializeCropper() {
  if (!imageRef.value || !props.sourceUrl) {
    return
  }

  if (cropper && initializedSourceUrl === props.sourceUrl) {
    return
  }

  destroyCropper()
  initializedSourceUrl = props.sourceUrl
  cropperReadyPromise = createCropperReadyPromise()

  cropper = new Cropper(imageRef.value, {
    autoCropArea: .88,
    background: false,
    center: true,
    checkOrientation: true,
    crop: (event) => {
      cropMeta.value = normalizeCropMeta(event.detail)
      markResultDirty("裁剪区域已调整，结果待更新")
    },
    cropBoxMovable: true,
    cropBoxResizable: true,
    dragMode: "move",
    guides: true,
    highlight: true,
    modal: true,
    movable: true,
    minContainerHeight: 180,
    minContainerWidth: 220,
    ready: () => {
      cropperReady.value = true
      imageLoading.value = false
      applyAspectRatio()
      cropMeta.value = normalizeCropMeta(cropper?.getData(true))
      refreshCropperLayout()
      statusText.value = "裁剪器已就绪"
      resolveReadyPromise()
    },
    responsive: true,
    rotatable: true,
    scalable: true,
    toggleDragModeOnDblclick: true,
    viewMode: 1,
    wheelZoomRatio: .08,
    zoomOnTouch: true,
    zoomOnWheel: true,
    zoomable: true
  })
}

function normalizeCropMeta(data?: Partial<Cropper.Data>): AoiImageClipboardCropMeta {
  return {
    height: Math.max(Math.round(data?.height || 0), 0),
    rotate: Math.round(data?.rotate || 0),
    scaleX: data?.scaleX || 1,
    scaleY: data?.scaleY || 1,
    width: Math.max(Math.round(data?.width || 0), 0),
    x: Math.round(data?.x || 0),
    y: Math.round(data?.y || 0)
  }
}

function applyAspectRatio() {
  if (!cropper) {
    return
  }

  cropper.setAspectRatio(resolveAoiImageAspectRatio(selectedAspect.value, props.aspectRatios))
  refreshCropperLayout()
}

function markResultDirty(message = "结果待更新") {
  if (!result.value || resultDirty.value || isExporting.value) {
    return
  }

  resultDirty.value = true
  statusText.value = message
}

function onAspectChange(value: string | string[]) {
  selectedAspect.value = (Array.isArray(value) ? value[0] || "free" : value) as AoiImageClipboardAspectOption["value"]
}

function reset() {
  if (!cropper) {
    return
  }

  cropper.reset()
  flipX.value = 1
  flipY.value = 1
  revokeResultUrl()
  result.value = null
  resultDirty.value = false
  statusText.value = "已重置"
  nextTick(applyAspectRatio)
}

function rotateBy(degrees: number) {
  cropper?.rotate(degrees)
  markResultDirty("图片已旋转，结果待更新")
}

function flipHorizontal() {
  flipX.value *= -1
  cropper?.scaleX(flipX.value)
  markResultDirty("图片已翻转，结果待更新")
}

function flipVertical() {
  flipY.value *= -1
  cropper?.scaleY(flipY.value)
  markResultDirty("图片已翻转，结果待更新")
}

function resolveOutputSize(cropData: AoiImageClipboardCropMeta, options: AoiImageClipboardExportOptions = {}) {
  const baseWidth = Math.max(cropData.width, 1)
  const baseHeight = Math.max(cropData.height, 1)
  let width = Math.min(Math.max(Math.round(options.width || baseWidth), 1), MAX_OUTPUT_DIMENSION)
  let height = Math.min(Math.max(Math.round(options.height || (options.width ? baseHeight * width / baseWidth : baseHeight)), 1), MAX_OUTPUT_DIMENSION)

  if (options.height && !options.width) {
    width = Math.min(Math.max(Math.round(baseWidth * height / baseHeight), 1), MAX_OUTPUT_DIMENSION)
  }

  const maxWidth = Math.min(options.maxWidth || parseDimension(maxWidthValue.value) || props.maxOutputWidth || MAX_OUTPUT_DIMENSION, MAX_OUTPUT_DIMENSION)
  const maxHeight = Math.min(options.maxHeight || parseDimension(maxHeightValue.value) || props.maxOutputHeight || MAX_OUTPUT_DIMENSION, MAX_OUTPUT_DIMENSION)
  const scale = Math.min(
    maxWidth ? maxWidth / width : 1,
    maxHeight ? maxHeight / height : 1,
    1
  )

  return {
    height: Math.max(Math.round(height * scale), 1),
    width: Math.max(Math.round(width * scale), 1)
  }
}

function resolveOutputFileName(options: AoiImageClipboardExportOptions = {}) {
  const name = options.fileName || props.outputFileName || props.sourceName || "aoi-image"
  const baseName = name.replace(/\.[^.]+$/, "").trim() || "aoi-image"

  return `${baseName}.webp`
}

function canvasToBlob(canvas: HTMLCanvasElement, quality: number) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob?.type === "image/webp") {
        resolve(blob)
        return
      }

      reject(new Error("当前浏览器不支持 WebP 导出"))
    }, "image/webp", quality)
  })
}

async function waitForImageDecode() {
  const image = imageRef.value

  if (!image) {
    throw new Error("请先载入图片")
  }

  if (!image.complete) {
    await new Promise<void>((resolve, reject) => {
      image.addEventListener("load", () => resolve(), { once: true })
      image.addEventListener("error", () => reject(new Error("图片读取失败")), { once: true })
    })
  }

  if (typeof image.decode === "function") {
    await image.decode().catch(() => undefined)
  }
}

async function exportToWebp(options: AoiImageClipboardExportOptions = {}) {
  isExporting.value = true
  errorText.value = ""
  statusText.value = "正在导出 WebP..."

  try {
    await waitForImageDecode()
    await waitForCropperReady()

    const cropperInstance = cropper

    if (!cropperInstance) {
      throw new Error("裁剪器尚未准备好")
    }

    const crop = normalizeCropMeta(cropperInstance.getData(true))
    const size = resolveOutputSize(crop, options)
    const canvas = cropperInstance.getCroppedCanvas({
      fillColor: "#fff",
      height: size.height,
      imageSmoothingEnabled: true,
      imageSmoothingQuality: "high",
      width: size.width
    })

    if (!canvas) {
      throw new Error("裁剪导出失败")
    }

    const blob = await canvasToBlob(canvas, clamp(options.quality ?? qualityValue.value, .1, 1))
    const file = new File([blob], resolveOutputFileName(options), { type: "image/webp" })
    const payload: AoiImageClipboardResult = {
      blob,
      crop,
      file,
      height: size.height,
      mimeType: "image/webp",
      objectUrl: URL.createObjectURL(blob),
      size: blob.size,
      sourceName: props.sourceName,
      width: size.width
    }

    revokeResultUrl()
    result.value = payload
    resultDirty.value = false
    statusText.value = "已导出 WebP"
    errorText.value = ""
    emit("result", payload)

    return payload
  } finally {
    isExporting.value = false
  }
}

async function exportSafely() {
  try {
    return await exportToWebp()
  } catch (error) {
    handleError(error instanceof Error ? error.message : "WebP 导出失败")
    return undefined
  }
}

async function confirmResult() {
  const payload = await exportSafely()

  if (payload && props.confirmBehavior === "export-close") {
    emit("close")
  }

  return payload
}

async function ensureResult() {
  return hasFreshResult.value && result.value ? result.value : await exportToWebp()
}

async function copyResult() {
  try {
    const payload = await ensureResult()

    await copyAoiImageBlobToClipboard(payload.blob)
    statusText.value = "已复制图片"
    errorText.value = ""

    return payload
  } catch (error) {
    handleError(error instanceof Error ? error.message : "复制图片失败")
    return undefined
  }
}

async function downloadResult() {
  try {
    const payload = await ensureResult()

    downloadAoiImageResult(payload)
    statusText.value = "已下载图片"
    errorText.value = ""

    return payload
  } catch (error) {
    handleError(error instanceof Error ? error.message : "下载图片失败")
    return undefined
  }
}

function handleError(message: string) {
  errorText.value = message
  statusText.value = ""
  emit("error", message)
}

function onImageLoad() {
  imageLoading.value = false
  initializeCropper()
}

function onImageError() {
  imageLoading.value = false
  handleError("图片读取失败，请重新选择")
}

defineExpose({
  copyResult,
  downloadResult,
  exportToWebp,
  reset
})
</script>

<template>
  <section
    class="aoi-image-cropper"
    :class="{ 'aoi-image-cropper--compact': compact }"
  >
    <div class="aoi-image-cropper__workspace">
      <div
        ref="canvasRef"
        class="aoi-image-cropper__canvas"
        @mousedown.capture="beginCropInteraction"
        @pointerdown.capture="beginCropInteraction"
        @touchstart.capture="beginCropInteraction"
        @wheel.stop
      >
        <img
          ref="imageRef"
          class="aoi-image-cropper__image"
          :src="sourceUrl"
          :alt="sourceName"
          @error="onImageError"
          @load="onImageLoad"
        >
        <div v-if="imageLoading" class="aoi-image-cropper__loading">
          <AoiIcon name="loader-circle" :size="24" decorative class="aoi-spin" />
          <span>正在载入图片...</span>
        </div>
      </div>

      <aside class="aoi-image-cropper__panel">
        <div class="aoi-image-cropper__meta">
          <strong>{{ sourceName }}</strong>
          <span>{{ sourceSummary }}</span>
          <span v-if="statusLine">{{ statusLine }}</span>
        </div>

        <div class="aoi-image-cropper__section">
          <span class="aoi-image-cropper__label">比例</span>
          <AoiButtonBox
            :model-value="String(selectedAspect)"
            :items="aspectItems"
            aria-label="裁剪比例"
            no-checkmark
            @update:model-value="onAspectChange"
          />
        </div>

        <div class="aoi-image-cropper__section">
          <AoiSlider
            v-model="qualityPercent"
            compact
            label="WebP 质量"
            :min="10"
            :max="100"
            :step="1"
          />
        </div>

        <div class="aoi-image-cropper__dimensions">
          <AoiTextField
            v-model="maxWidthValue"
            label="最大宽度"
            type="number"
            appearance="outlined"
            min="1"
            step="1"
          />
          <AoiTextField
            v-model="maxHeightValue"
            label="最大高度"
            type="number"
            appearance="outlined"
            min="1"
            step="1"
          />
        </div>

        <AoiActionBar size="sm" label="裁剪变换">
          <AoiIconButton icon="rotate-ccw" label="向左旋转" size="sm" @click="rotateBy(-90)" />
          <AoiIconButton icon="rotate-cw" label="向右旋转" size="sm" @click="rotateBy(90)" />
          <AoiIconButton icon="flip-horizontal-2" label="水平翻转" size="sm" :active="flipX < 0" @click="flipHorizontal" />
          <AoiIconButton icon="flip-vertical-2" label="垂直翻转" size="sm" :active="flipY < 0" @click="flipVertical" />
          <AoiIconButton icon="refresh-cw" label="重置" size="sm" @click="reset" />
        </AoiActionBar>

        <div
          v-if="result"
          class="aoi-image-cropper__result"
          :class="{ 'aoi-image-cropper__result--dirty': resultDirty }"
        >
          <img :src="result.objectUrl" alt="裁剪结果预览">
          <span>{{ result.file.name }}</span>
          <small>{{ resultSummary }}</small>
        </div>

        <p v-if="errorText" class="aoi-image-cropper__error">
          {{ errorText }}
        </p>

        <AoiActionBar class="aoi-image-cropper__primary-actions" size="sm">
          <AoiButton tone="accent" variant="filled"
            icon="check"
            size="sm"
            :disabled="disabled || imageLoading || !cropperReady || isExporting"
            :loading="isExporting"
            @click="confirmResult"
          >
            {{ primaryActionLabel }}
          </AoiButton>
          <AoiButton
            icon="file-type-2"
            size="sm"
            :disabled="disabled || imageLoading || !cropperReady || isExporting"
            @click="exportSafely"
          >
            预览 WebP
          </AoiButton>
          <AoiButton icon="copy" size="sm" :disabled="disabled || imageLoading || !cropperReady || isExporting" @click="copyResult">
            复制
          </AoiButton>
          <AoiButton icon="download" size="sm" :disabled="disabled || imageLoading || !cropperReady || isExporting" @click="downloadResult">
            下载
          </AoiButton>
          <AoiButton icon="x" size="sm" :disabled="isExporting" @click="emit('close')">
            关闭
          </AoiButton>
        </AoiActionBar>
      </aside>
    </div>
  </section>
</template>

<style scoped>
.aoi-image-cropper {
  display: flex;
  width: 100%;
  height: 100%;
  max-height: 100%;
  min-width: 0;
  min-height: 0;
}

.aoi-image-cropper__workspace {
  display: grid;
  flex: 1;
  min-width: 0;
  min-height: 0;
  height: 100%;
  grid-template-columns: minmax(0, 1fr) minmax(280px, 340px);
  gap: 16px;
  align-items: stretch;
}

.aoi-image-cropper__canvas {
  position: relative;
  min-width: 0;
  min-height: 280px;
  height: min(64dvh, 560px);
  max-height: 100%;
  overflow: hidden;
  border: 1px solid var(--aoi-border);
  border-radius: var(--aoi-radius-card);
  background: var(--aoi-surface-solid);
  overscroll-behavior: contain;
  touch-action: none;
  user-select: none;
}

.aoi-image-cropper--compact .aoi-image-cropper__canvas {
  min-height: 260px;
  height: min(62dvh, 540px);
}

.aoi-image-cropper__image {
  display: block;
  width: 100%;
  height: 100%;
  max-width: 100%;
  object-fit: contain;
}

.aoi-image-cropper__loading {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  gap: 8px;
  background: color-mix(in srgb, var(--aoi-surface-solid) 82%, transparent);
  color: var(--aoi-text-muted);
  font-size: .84rem;
  font-weight: 760;
}

.aoi-image-cropper__panel {
  display: grid;
  min-width: 0;
  min-height: 0;
  max-height: 100%;
  gap: 14px;
  align-content: start;
  overflow: auto;
  overscroll-behavior: contain;
  padding-inline-end: 4px;
}

.aoi-image-cropper__meta,
.aoi-image-cropper__section {
  display: grid;
  min-width: 0;
  gap: 8px;
}

.aoi-image-cropper__meta strong,
.aoi-image-cropper__meta span,
.aoi-image-cropper__result span,
.aoi-image-cropper__result small {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.aoi-image-cropper__meta strong {
  color: var(--aoi-text);
  font-size: .95rem;
  font-weight: 820;
}

.aoi-image-cropper__label,
.aoi-image-cropper__meta span,
.aoi-image-cropper__result small {
  color: var(--aoi-text-muted);
  font-size: .78rem;
  font-weight: 700;
}

.aoi-image-cropper__dimensions {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.aoi-image-cropper__result {
  display: grid;
  min-width: 0;
  grid-template-columns: 72px minmax(0, 1fr);
  gap: 8px 10px;
  align-items: center;
}

.aoi-image-cropper__result--dirty {
  opacity: .72;
}

.aoi-image-cropper__result--dirty img {
  filter: saturate(.72);
}

.aoi-image-cropper__result img {
  grid-row: span 2;
  width: 72px;
  aspect-ratio: 1;
  border: 1px solid var(--aoi-border);
  border-radius: var(--aoi-radius-sm);
  background: var(--aoi-surface-solid);
  object-fit: cover;
}

.aoi-image-cropper__result span {
  color: var(--aoi-text);
  font-size: .84rem;
  font-weight: 760;
}

.aoi-image-cropper__error {
  margin: 0;
  color: var(--aoi-danger);
  font-size: .82rem;
  font-weight: 720;
}

.aoi-image-cropper__primary-actions {
  position: sticky;
  bottom: 0;
  z-index: 1;
  justify-content: flex-start;
  border-top: 1px solid var(--aoi-border);
  background: var(--aoi-surface-solid);
  padding-block: 10px;
}

:deep(.cropper-container) {
  max-width: 100%;
  max-height: 100%;
  touch-action: none;
  user-select: none;
}

:deep(.cropper-container *) {
  touch-action: none;
}

.aoi-spin {
  animation: aoi-spin 900ms linear infinite;
}

@keyframes aoi-spin {
  to {
    rotate: 360deg;
  }
}

@media (max-width: 840px) {
  .aoi-image-cropper {
    height: auto;
    max-height: none;
  }

  .aoi-image-cropper__workspace {
    grid-template-columns: 1fr;
    gap: 12px;
    height: auto;
  }

  .aoi-image-cropper__canvas {
    height: clamp(260px, 48dvh, 430px);
    min-height: 260px;
    max-height: 52dvh;
  }

  .aoi-image-cropper__panel {
    max-height: none;
    overflow: visible;
  }
}

@media (max-width: 520px) {
  .aoi-image-cropper__dimensions,
  .aoi-image-cropper__result {
    grid-template-columns: 1fr;
  }

  .aoi-image-cropper__result img {
    grid-row: auto;
    width: 100%;
    max-width: 180px;
  }

  .aoi-image-cropper__panel {
    gap: 10px;
  }

  .aoi-image-cropper__primary-actions {
    margin-inline: -2px;
  }
}
</style>
