<script setup lang="ts">
import type {
  AoiImageClipboardAspectOption,
  AoiImageClipboardAspectValue,
  AoiImageClipboardConfirmBehavior,
  AoiImageClipboardExportOptions,
  AoiImageClipboardMode,
  AoiImageClipboardResult
} from "~/utils/aoiImageClipboard"
import {
  aoiDefaultImageAspectRatios,
  collectImageFiles,
  collectImageFilesFromDataTransfer,
  copyAoiImageBlobToClipboard,
  downloadAoiImageResult,
  formatAoiImageFileSize,
  isAcceptedImageFile
} from "~/utils/aoiImageClipboard"

type WorkbenchExpose = {
  copyResult: () => Promise<AoiImageClipboardResult | undefined>
  downloadResult: () => Promise<AoiImageClipboardResult | undefined>
  exportToWebp: (options?: AoiImageClipboardExportOptions) => Promise<AoiImageClipboardResult>
  reset: () => void
}

const props = withDefaults(defineProps<{
  accept?: string
  ariaLabel?: string
  aspectRatio?: AoiImageClipboardAspectValue
  aspectRatios?: AoiImageClipboardAspectOption[]
  disabled?: boolean
  label?: string
  maxOutputHeight?: number
  maxOutputWidth?: number
  mode?: AoiImageClipboardMode
  open?: boolean
  outputFileName?: string
  quality?: number
  confirmBehavior?: AoiImageClipboardConfirmBehavior
}>(), {
  accept: "image/png,image/jpeg,image/webp,image/gif,image/avif",
  ariaLabel: undefined,
  aspectRatio: "free",
  aspectRatios: () => aoiDefaultImageAspectRatios,
  disabled: false,
  label: undefined,
  maxOutputHeight: undefined,
  maxOutputWidth: undefined,
  mode: "dialog",
  open: undefined,
  outputFileName: undefined,
  quality: .82,
  confirmBehavior: "export-close"
})

const emit = defineEmits<{
  clear: []
  error: [message: string]
  load: [file: File]
  result: [payload: AoiImageClipboardResult]
  "update:open": [value: boolean]
}>()

const WORKBENCH_READY_TIMEOUT = 8000

const rootRef = ref<HTMLElement | null>(null)
const inputRef = ref<HTMLInputElement | null>(null)
const workbenchRef = ref<WorkbenchExpose | null>(null)
const sourceFile = ref<File | null>(null)
const sourceUrl = ref("")
const result = ref<AoiImageClipboardResult | null>(null)
const editorOpen = ref(Boolean(props.open))
const errorText = ref("")
const statusText = ref("")
const isDragActive = ref(false)
const isPasteActive = ref(false)
const cropInteractionActive = ref(false)

let cropInteractionClearTimer = 0

const sourceName = computed(() => sourceFile.value?.name || "")
const sourceSize = computed(() => sourceFile.value?.size)
const hasSource = computed(() => Boolean(sourceFile.value && sourceUrl.value))
const hasResult = computed(() => Boolean(result.value))
const resolvedLabel = computed(() => props.label || "图片裁剪压缩")
const helperText = computed(() => {
  if (errorText.value) {
    return errorText.value
  }

  if (statusText.value) {
    return statusText.value
  }

  if (hasResult.value && result.value) {
    return `${result.value.file.name} · ${result.value.width}×${result.value.height} · ${formatAoiImageFileSize(result.value.size)}`
  }

  if (sourceFile.value) {
    return `${sourceFile.value.name} · ${formatAoiImageFileSize(sourceFile.value.size)}`
  }

  return "选择、拖放或在此区域粘贴图片"
})
const showInlineWorkbench = computed(() => props.mode === "inline" && editorOpen.value && hasSource.value)
const showDialogWorkbench = computed(() => props.mode === "dialog" && editorOpen.value && hasSource.value)

watch(() => props.open, (value) => {
  if (value === undefined) {
    return
  }

  if (value && !hasSource.value) {
    open()
    return
  }

  editorOpen.value = Boolean(value && hasSource.value)
})

watch(() => props.disabled, (disabled) => {
  if (disabled) {
    isDragActive.value = false
    isPasteActive.value = false
  }
})

onMounted(() => {
  document.addEventListener("paste", onDocumentPaste)
  document.addEventListener("drop", onDocumentDrop)
  document.addEventListener("dragover", onDocumentDragOver)
  document.addEventListener("dragleave", onDocumentDragLeave)
  window.addEventListener("blur", clearDragState)
})

onBeforeUnmount(() => {
  document.removeEventListener("paste", onDocumentPaste)
  document.removeEventListener("drop", onDocumentDrop)
  document.removeEventListener("dragover", onDocumentDragOver)
  document.removeEventListener("dragleave", onDocumentDragLeave)
  window.removeEventListener("blur", clearDragState)
  clearCropInteractionTimer()
  revokeSourceUrl()
  revokeResultUrl()
})

function open() {
  if (props.disabled) {
    return
  }

  inputRef.value?.click()
}

function setEditorOpen(value: boolean) {
  editorOpen.value = Boolean(value && hasSource.value)
  emit("update:open", editorOpen.value)
}

function openEditor() {
  if (props.disabled) {
    return
  }

  if (!hasSource.value) {
    open()
    return
  }

  setEditorOpen(true)
}

async function waitForWorkbench(timeout = WORKBENCH_READY_TIMEOUT) {
  const started = Date.now()

  while (!workbenchRef.value && Date.now() - started < timeout) {
    await nextTick()
    await new Promise((resolve) => window.setTimeout(resolve, 50))
  }

  if (!workbenchRef.value) {
    throw new Error("裁剪工作台尚未准备好，请稍后重试")
  }

  return workbenchRef.value
}

async function loadFile(file: File, successMessage = "图片已载入，裁剪工作台已打开") {
  if (props.disabled) {
    return
  }

  if (!isAcceptedImageFile(file, props.accept)) {
    handleError("请选择图片文件")
    return
  }

  const nextSourceUrl = URL.createObjectURL(file)

  revokeSourceUrl()
  sourceFile.value = file
  sourceUrl.value = nextSourceUrl
  revokeResultUrl()
  result.value = null
  errorText.value = ""
  statusText.value = successMessage
  emit("load", file)
  await nextTick()
  setEditorOpen(true)
}

async function exportToWebp(options: AoiImageClipboardExportOptions = {}) {
  if (!hasSource.value) {
    const message = "请先选择图片"

    handleError(message)
    throw new Error(message)
  }

  setEditorOpen(true)
  await nextTick()

  try {
    const workbench = await waitForWorkbench()
    const payload = await workbench.exportToWebp(options)
    const nextResult = updateResult(payload)

    return nextResult
  } catch (error) {
    handleError(error instanceof Error ? error.message : "WebP 导出失败")
    throw error
  }
}

async function copyResult() {
  try {
    const payload = result.value || await exportToWebp()

    if (workbenchRef.value) {
      await workbenchRef.value.copyResult()
      return result.value || payload
    }

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
    const payload = result.value || await exportToWebp()

    if (workbenchRef.value) {
      await workbenchRef.value.downloadResult()
      return result.value || payload
    }

    downloadAoiImageResult(payload)
    statusText.value = "已下载图片"
    errorText.value = ""

    return payload
  } catch (error) {
    handleError(error instanceof Error ? error.message : "下载图片失败")
    return undefined
  }
}

function reset() {
  workbenchRef.value?.reset()
  statusText.value = hasSource.value ? "裁剪已重置" : ""
}

function clear() {
  revokeSourceUrl()
  revokeResultUrl()
  sourceFile.value = null
  result.value = null
  errorText.value = ""
  statusText.value = ""
  isDragActive.value = false
  setEditorOpen(false)
  emit("clear")
}

function revokeSourceUrl() {
  if (sourceUrl.value) {
    URL.revokeObjectURL(sourceUrl.value)
  }

  sourceUrl.value = ""
}

function revokeResultUrl() {
  if (result.value?.objectUrl) {
    URL.revokeObjectURL(result.value.objectUrl)
  }
}

function updateResult(payload: AoiImageClipboardResult) {
  const previousObjectUrl = result.value?.objectUrl

  const nextResult = {
    ...payload,
    objectUrl: URL.createObjectURL(payload.blob)
  }

  if (previousObjectUrl) {
    URL.revokeObjectURL(previousObjectUrl)
  }

  result.value = nextResult
  statusText.value = "WebP 已生成"
  errorText.value = ""
  emit("result", nextResult)

  return nextResult
}

function handleError(message: string) {
  errorText.value = message
  statusText.value = ""
  emit("error", message)
}

function onInputChange(event: Event) {
  const files = collectImageFiles(inputRef.value?.files, props.accept, true)

  if (files[0]) {
    void loadFile(
      files[0],
      files.length > 1 ? "当前仅支持单图裁剪，已载入第一张图片" : undefined
    )
  }

  const input = event.target as HTMLInputElement

  input.value = ""
}

function onPaste(event: ClipboardEvent) {
  const files = collectImageFilesFromDataTransfer(event.clipboardData, props.accept, true)
  const file = files[0]

  if (!file || props.disabled) {
    return
  }

  event.preventDefault()
  void loadFile(
    file,
    files.length > 1 ? "当前仅支持单图裁剪，已载入第一张图片" : undefined
  )
}

function onDrop(event: DragEvent) {
  const files = collectImageFilesFromDataTransfer(event.dataTransfer, props.accept, true)
  const file = files[0]

  isDragActive.value = false

  if (!file || props.disabled) {
    return
  }

  event.preventDefault()
  void loadFile(
    file,
    files.length > 1 ? "当前仅支持单图裁剪，已载入第一张图片" : undefined
  )
}

function onDragOver(event: DragEvent) {
  if (props.disabled) {
    return
  }

  if (collectImageFilesFromDataTransfer(event.dataTransfer, props.accept, false).length) {
    event.preventDefault()
    isDragActive.value = true
  }
}

function onDragLeave(event: DragEvent) {
  const root = rootRef.value

  if (!root || !event.relatedTarget || !root.contains(event.relatedTarget as Node)) {
    isDragActive.value = false
  }
}

function clearDragState() {
  isDragActive.value = false
}

function onDocumentPaste(event: ClipboardEvent) {
  if (!isPasteActive.value && !editorOpen.value) {
    return
  }

  onPaste(event)
}

function onDocumentDrop(event: DragEvent) {
  clearDragState()

  if (!isPasteActive.value && !editorOpen.value) {
    return
  }

  onDrop(event)
}

function onDocumentDragOver(event: DragEvent) {
  if (!isPasteActive.value && !editorOpen.value) {
    return
  }

  onDragOver(event)
}

function onDocumentDragLeave(event: DragEvent) {
  if (!event.relatedTarget) {
    clearDragState()
  }
}

function onFocusIn() {
  isPasteActive.value = true
}

function onFocusOut() {
  window.setTimeout(() => {
    const root = rootRef.value

    if (!root?.contains(document.activeElement)) {
      isPasteActive.value = false
    }
  })
}

function onDialogOpenChange(value: boolean) {
  setEditorOpen(value)
}

function clearCropInteractionTimer() {
  if (cropInteractionClearTimer) {
    window.clearTimeout(cropInteractionClearTimer)
    cropInteractionClearTimer = 0
  }
}

function onCropInteractionStart() {
  clearCropInteractionTimer()
  cropInteractionActive.value = true
}

function onCropInteractionEnd() {
  clearCropInteractionTimer()
  cropInteractionClearTimer = window.setTimeout(() => {
    cropInteractionActive.value = false
    cropInteractionClearTimer = 0
  }, 260)
}

function onDialogCancel(event: Event) {
  if (cropInteractionActive.value) {
    event.preventDefault()
  }
}

defineExpose({
  clear,
  copyResult,
  downloadResult,
  exportToWebp,
  loadFile,
  open,
  openEditor,
  reset
})
</script>

<template>
  <section
    ref="rootRef"
    class="aoi-image-clipboard"
    :class="{
      'aoi-image-clipboard--disabled': disabled,
      'aoi-image-clipboard--dragging': isDragActive,
      'aoi-image-clipboard--error': Boolean(errorText)
    }"
    :aria-label="ariaLabel || resolvedLabel"
    role="group"
    tabindex="0"
    @dragleave="onDragLeave"
    @dragover="onDragOver"
    @drop="onDrop"
    @focusin="onFocusIn"
    @focusout="onFocusOut"
    @mouseenter="isPasteActive = true"
    @mouseleave="isPasteActive = false"
    @paste="onPaste"
  >
    <input
      ref="inputRef"
      class="aoi-image-clipboard__input"
      type="file"
      :accept="accept"
      :disabled="disabled || undefined"
      @change="onInputChange"
    >

    <header class="aoi-image-clipboard__header">
      <div class="aoi-image-clipboard__title-block">
        <strong>{{ resolvedLabel }}</strong>
        <span :class="{ 'aoi-image-clipboard__message--error': Boolean(errorText) }">
          {{ helperText }}
        </span>
      </div>
      <AoiActionBar class="aoi-image-clipboard__header-actions" size="sm">
        <AoiButton size="sm" icon="image-plus" :disabled="disabled" @click="open">
          选择图片
        </AoiButton>
        <AoiButton tone="accent" variant="filled" size="sm" icon="crop" :disabled="disabled || !hasSource" @click="openEditor">
          打开裁剪
        </AoiButton>
      </AoiActionBar>
    </header>

    <button
      class="aoi-image-clipboard__dropzone"
      type="button"
      :disabled="disabled || undefined"
      @click="open"
    >
      <AoiRipple v-if="!disabled" />
      <span class="aoi-image-clipboard__drop-icon">
        <AoiIcon name="image-up" :size="28" decorative />
      </span>
      <span class="aoi-image-clipboard__drop-copy">
        <strong>{{ hasSource ? "更换图片" : "选择或拖放图片" }}</strong>
        <span>也可以把截图或图片文件粘贴到这个区域</span>
      </span>
    </button>

    <div v-if="hasResult && result" class="aoi-image-clipboard__result">
      <img :src="result.objectUrl" alt="裁剪后的 WebP 预览">
      <div class="aoi-image-clipboard__result-meta">
        <strong>{{ result.file.name }}</strong>
        <span>{{ result.width }}×{{ result.height }} · {{ formatAoiImageFileSize(result.size) }}</span>
        <span v-if="result.sourceName">来源：{{ result.sourceName }}</span>
      </div>
      <AoiActionBar class="aoi-image-clipboard__result-actions" size="sm">
        <AoiButton size="sm" icon="copy" :disabled="disabled" @click="copyResult">
          复制
        </AoiButton>
        <AoiButton size="sm" icon="download" :disabled="disabled" @click="downloadResult">
          下载
        </AoiButton>
        <AoiButton size="sm" icon="crop" :disabled="disabled || !hasSource" @click="openEditor">
          重新裁剪
        </AoiButton>
        <AoiIconButton icon="trash-2" label="清除图片" size="sm" :disabled="disabled" @click="clear" />
      </AoiActionBar>
    </div>

    <ClientOnly>
      <AoiImageCropperWorkbench
        v-if="showInlineWorkbench"
        ref="workbenchRef"
        :aspect-ratio="aspectRatio"
        :aspect-ratios="aspectRatios"
        :confirm-behavior="confirmBehavior"
        :disabled="disabled"
        :max-output-height="maxOutputHeight"
        :max-output-width="maxOutputWidth"
        :output-file-name="outputFileName"
        :quality="quality"
        :source-name="sourceName"
        :source-size="sourceSize"
        :source-url="sourceUrl"
        @close="setEditorOpen(false)"
        @crop-interaction-end="onCropInteractionEnd"
        @crop-interaction-start="onCropInteractionStart"
        @error="handleError"
        @result="updateResult"
      />
    </ClientOnly>

    <AoiDialog
      v-if="mode === 'dialog'"
      class="aoi-image-clipboard__dialog"
      :open="showDialogWorkbench"
      @cancel="onDialogCancel"
      @update:open="onDialogOpenChange"
    >
      <template #headline>
        图片裁剪压缩
      </template>

      <ClientOnly>
        <AoiImageCropperWorkbench
          v-if="showDialogWorkbench"
          ref="workbenchRef"
          compact
          :aspect-ratio="aspectRatio"
          :aspect-ratios="aspectRatios"
          :confirm-behavior="confirmBehavior"
          :disabled="disabled"
          :max-output-height="maxOutputHeight"
          :max-output-width="maxOutputWidth"
          :output-file-name="outputFileName"
          :quality="quality"
          :source-name="sourceName"
          :source-size="sourceSize"
          :source-url="sourceUrl"
          @close="setEditorOpen(false)"
          @crop-interaction-end="onCropInteractionEnd"
          @crop-interaction-start="onCropInteractionStart"
          @error="handleError"
          @result="updateResult"
        />
      </ClientOnly>
    </AoiDialog>
  </section>
</template>

<style scoped>
.aoi-image-clipboard {
  display: grid;
  min-width: 0;
  gap: 12px;
  color: var(--aoi-text);
  outline: none;
}

.aoi-image-clipboard:focus-visible {
  border-radius: var(--aoi-radius-card);
  box-shadow: 0 0 0 3px var(--aoi-focus-ring);
}

.aoi-image-clipboard--disabled {
  opacity: .62;
}

.aoi-image-clipboard__input {
  position: fixed;
  inset: 0 auto auto 0;
  width: 1px;
  height: 1px;
  opacity: 0;
  pointer-events: none;
}

.aoi-image-clipboard__header {
  display: flex;
  min-width: 0;
  flex-wrap: wrap;
  gap: 10px;
  align-items: center;
  justify-content: space-between;
}

.aoi-image-clipboard__title-block {
  display: grid;
  min-width: 0;
  gap: 2px;
}

.aoi-image-clipboard__title-block strong {
  font-size: .94rem;
  font-weight: 820;
}

.aoi-image-clipboard__title-block span {
  overflow: hidden;
  color: var(--aoi-text-muted);
  font-size: .8rem;
  font-weight: 680;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.aoi-image-clipboard__message--error {
  color: var(--aoi-danger) !important;
}

.aoi-image-clipboard__dropzone {
  position: relative;
  overflow: clip;
  display: grid;
  min-width: 0;
  grid-template-columns: auto minmax(0, 1fr);
  gap: 12px;
  align-items: center;
  border: 1px dashed var(--aoi-border);
  border-radius: var(--aoi-radius-card);
  background: color-mix(in srgb, var(--aoi-surface-solid) 86%, var(--aoi-accent-20));
  color: inherit;
  cursor: pointer;
  padding: 16px;
  text-align: left;
  transition:
    background-color 160ms ease,
    border-color 160ms ease,
    box-shadow 160ms ease;
}

.aoi-image-clipboard__dropzone:disabled {
  cursor: default;
}

.aoi-image-clipboard__dropzone:focus-visible {
  box-shadow: 0 0 0 3px var(--aoi-focus-ring);
  outline: none;
}

.aoi-image-clipboard--dragging .aoi-image-clipboard__dropzone {
  border-color: var(--aoi-active-color);
  background: var(--aoi-state-active);
}

.aoi-image-clipboard__drop-icon {
  display: grid;
  width: 46px;
  height: 46px;
  place-items: center;
  border-radius: var(--aoi-radius-card);
  background: var(--aoi-state-active);
  color: var(--aoi-active-color);
}

.aoi-image-clipboard__drop-copy {
  display: grid;
  min-width: 0;
  gap: 3px;
}

.aoi-image-clipboard__drop-copy strong {
  font-size: .92rem;
  font-weight: 820;
}

.aoi-image-clipboard__drop-copy span {
  color: var(--aoi-text-muted);
  font-size: .8rem;
  font-weight: 680;
}

.aoi-image-clipboard__result {
  display: grid;
  min-width: 0;
  grid-template-columns: 88px minmax(0, 1fr);
  gap: 10px 12px;
  align-items: center;
  border: 1px solid var(--aoi-border);
  border-radius: var(--aoi-radius-card);
  background: var(--aoi-surface-solid);
  padding: 10px;
}

.aoi-image-clipboard__result img {
  grid-row: span 2;
  width: 88px;
  aspect-ratio: 1;
  border-radius: var(--aoi-radius-sm);
  background: var(--aoi-surface-soft);
  object-fit: cover;
}

.aoi-image-clipboard__result-meta {
  display: grid;
  min-width: 0;
  gap: 2px;
}

.aoi-image-clipboard__result-meta strong,
.aoi-image-clipboard__result-meta span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.aoi-image-clipboard__result-meta strong {
  font-size: .88rem;
  font-weight: 800;
}

.aoi-image-clipboard__result-meta span {
  color: var(--aoi-text-muted);
  font-size: .78rem;
  font-weight: 680;
}

.aoi-image-clipboard__result-actions {
  justify-content: flex-start;
}

:deep(md-dialog.aoi-image-clipboard__dialog) {
  width: min(96vw, 1120px);
  height: min(88dvh, 760px);
  max-height: calc(100dvh - 40px);
  max-width: min(96vw, 1120px);
}

:deep(md-dialog.aoi-image-clipboard__dialog [slot="content"]) {
  display: flex;
  min-height: 0;
  width: min(92vw, 1020px);
  height: 100%;
  max-height: calc(100dvh - 126px);
  overflow: hidden;
}

@media (max-width: 720px) {
  :deep(md-dialog.aoi-image-clipboard__dialog) {
    width: min(100vw - 20px, 680px);
    height: calc(100dvh - 24px);
    max-height: calc(100dvh - 24px);
  }

  :deep(md-dialog.aoi-image-clipboard__dialog [slot="content"]) {
    width: calc(100vw - 20px);
    max-height: calc(100dvh - 104px);
    overflow: auto;
    overscroll-behavior: contain;
  }

  .aoi-image-clipboard__header,
  .aoi-image-clipboard__header-actions,
  .aoi-image-clipboard__result-actions {
    align-items: stretch;
  }

  .aoi-image-clipboard__header-actions,
  .aoi-image-clipboard__result-actions {
    width: 100%;
    justify-content: flex-start;
  }

  .aoi-image-clipboard__dropzone,
  .aoi-image-clipboard__result {
    grid-template-columns: 1fr;
  }

  .aoi-image-clipboard__result img {
    grid-row: auto;
    width: 100%;
    max-width: 180px;
  }
}
</style>
