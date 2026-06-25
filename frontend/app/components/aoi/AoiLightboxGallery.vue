<script setup lang="ts">
import type {
  AoiLightboxItem,
  AoiLightboxLabels,
  AoiLightboxVideoState
} from "~/types/lightbox"
import type { ComponentPublicInstance } from "vue"

defineOptions({
  inheritAttrs: false
})

const props = withDefaults(defineProps<{
  items: AoiLightboxItem[]
  open?: boolean
  activeIndex?: number
  defaultOpen?: boolean
  defaultActiveIndex?: number
  loop?: boolean
  showInlineGallery?: boolean
  showThumbnails?: boolean
  showCounter?: boolean
  closeOnBackdrop?: boolean
  labels?: AoiLightboxLabels
}>(), {
  activeIndex: undefined,
  closeOnBackdrop: true,
  defaultActiveIndex: 0,
  defaultOpen: false,
  labels: undefined,
  loop: false,
  open: undefined,
  showCounter: true,
  showInlineGallery: true,
  showThumbnails: true
})

const emit = defineEmits<{
  "update:open": [value: boolean]
  "update:activeIndex": [value: number]
  open: [index: number, item: AoiLightboxItem | undefined]
  close: []
  "item-change": [index: number, item: AoiLightboxItem | undefined]
  "video-state-change": [state: AoiLightboxVideoState, index: number, item: AoiLightboxItem | undefined]
}>()

const { t } = useI18n()
const instance = getCurrentInstance()
const internalOpen = ref(props.defaultOpen)
const internalActiveIndex = ref(props.defaultActiveIndex)
const rootRef = ref<HTMLElement | null>(null)
const mediaRef = ref<HTMLElement | null>(null)
const videoRef = ref<HTMLVideoElement | null>(null)
const thumbRefs = ref<HTMLElement[]>([])
const imageScale = ref(1)
const imageX = ref(0)
const imageY = ref(0)
const imageLoading = ref(false)
const imageFailed = ref(false)
const videoCurrentTime = ref(0)
const videoDuration = ref(0)
const videoLoading = ref(false)
const videoFailed = ref(false)
const videoPlaying = ref(false)
const videoMuted = ref(false)
const videoVolume = ref(1)
const videoFullscreen = ref(false)
const gesture = reactive({
  active: false,
  mode: "none" as "none" | "pan" | "swipe",
  pointerId: -1,
  startX: 0,
  startY: 0,
  lastX: 0,
  lastY: 0,
  baseX: 0,
  baseY: 0
})
let restoreBodyOverflow: string | null = null
let restoreBodyPaddingRight: string | null = null
let restoreFocusElement: HTMLElement | null = null

const resolvedLabels = computed<Required<AoiLightboxLabels>>(() => ({
  close: t("lightbox.close"),
  empty: t("lightbox.empty"),
  first: t("lightbox.first"),
  fullscreen: t("lightbox.fullscreen"),
  imageError: t("lightbox.imageError"),
  last: t("lightbox.last"),
  loading: t("lightbox.loading"),
  media: t("lightbox.media"),
  mute: t("lightbox.mute"),
  next: t("lightbox.next"),
  pause: t("lightbox.pause"),
  play: t("lightbox.play"),
  previous: t("lightbox.previous"),
  resetZoom: t("lightbox.resetZoom"),
  unmute: t("lightbox.unmute"),
  videoError: t("lightbox.videoError"),
  volume: t("lightbox.volume"),
  zoomIn: t("lightbox.zoomIn"),
  zoomOut: t("lightbox.zoomOut"),
  ...props.labels
}))

const isOpenControlled = computed(() => props.open === true || hasRawProp("onUpdate:open"))
const isIndexControlled = computed(() => (hasRawProp("activeIndex") || hasRawProp("active-index")) && props.activeIndex !== undefined)
const isOpen = computed(() => isOpenControlled.value ? Boolean(props.open) : internalOpen.value)
const layer = useAoiLayer("dialog", isOpen)
const currentIndex = computed(() => clampIndex(isIndexControlled.value
  ? props.activeIndex ?? props.defaultActiveIndex
  : internalActiveIndex.value))
const activeItem = computed(() => props.items[currentIndex.value])
const activeItemLabel = computed(() => activeItem.value?.title || activeItem.value?.alt || resolvedLabels.value.media)
const activeThumbSrc = computed(() => thumbnailSource(activeItem.value))
const isActiveImage = computed(() => activeItem.value?.type === "image")
const isActiveVideo = computed(() => activeItem.value?.type === "video")
const isGradientImage = computed(() => isGradientSource(activeItem.value?.src))
const canPrevious = computed(() => props.items.length > 1 && (props.loop || currentIndex.value > 0))
const canNext = computed(() => props.items.length > 1 && (props.loop || currentIndex.value < props.items.length - 1))
const counterText = computed(() => props.items.length > 0
  ? t("lightbox.counter", { current: currentIndex.value + 1, total: props.items.length })
  : t("lightbox.counter", { current: 0, total: 0 }))
const imageTransform = computed(() => ({
  transform: `translate3d(${imageX.value}px, ${imageY.value}px, 0) scale(${imageScale.value})`
}))
const videoProgressMax = computed(() => Math.max(videoDuration.value, activeItem.value?.durationSeconds || 0, 0.01))
const volumePercent = computed(() => Math.round(videoVolume.value * 100))
const videoState = computed<AoiLightboxVideoState>(() => ({
  currentTime: videoCurrentTime.value,
  duration: videoDuration.value,
  error: videoFailed.value,
  fullscreen: videoFullscreen.value,
  loading: videoLoading.value,
  muted: videoMuted.value,
  playing: videoPlaying.value,
  volume: videoVolume.value
}))

watch(isOpen, (open, wasOpen) => {
  if (open === wasOpen) {
    return
  }

  if (open) {
    handleOpen()
    return
  }

  handleClose()
})

watch(currentIndex, (index, previousIndex) => {
  if (index === previousIndex) {
    return
  }

  resetImageTransform()
  resetImageLoadState()
  stopVideo()
  resetVideoState()
  emit("item-change", index, activeItem.value)
  void nextTick(scrollActiveThumbIntoView)
})

watch(() => props.items.length, () => {
  if (props.items.length === 0) {
    close()
    return
  }

  if (currentIndex.value >= props.items.length) {
    setActiveIndex(props.items.length - 1)
  }
})

watch(activeItem, () => {
  resetImageLoadState()
  resetVideoState()
}, {
  immediate: true
})

watch([isOpen, isActiveVideo, () => activeItem.value?.src], ([open, video]) => {
  if (open && video) {
    void nextTick(loadActiveVideo)
  }
})

watch([videoMuted, videoVolume], () => {
  applyVideoVolume()
  emitVideoState()
})

onMounted(() => {
  if (isOpen.value) {
    handleOpen()
  }
})

onBeforeUnmount(() => {
  unlockBodyScroll()
  if (import.meta.client) {
    document.removeEventListener("keydown", onKeydown)
  }
  stopVideo()
})

onBeforeUpdate(() => {
  thumbRefs.value = []
})

function hasRawProp(name: string) {
  const rawProps = instance?.vnode.props || {}
  const kebabName = name.replace(/[A-Z]/g, (match) => `-${match.toLowerCase()}`)

  return Object.prototype.hasOwnProperty.call(rawProps, name)
    || Object.prototype.hasOwnProperty.call(rawProps, kebabName)
}

function clampIndex(index: number) {
  if (props.items.length === 0) {
    return 0
  }

  return Math.min(props.items.length - 1, Math.max(0, Math.trunc(index || 0)))
}

function normalizeIndex(index: number) {
  if (props.items.length === 0) {
    return 0
  }

  if (!props.loop) {
    return clampIndex(index)
  }

  return (index + props.items.length) % props.items.length
}

function setOpen(value: boolean) {
  if (!isOpenControlled.value) {
    internalOpen.value = value
  }

  emit("update:open", value)
}

function setActiveIndex(index: number) {
  const nextIndex = normalizeIndex(index)

  if (!isIndexControlled.value) {
    internalActiveIndex.value = nextIndex
  }

  emit("update:activeIndex", nextIndex)
}

function openAt(index: number) {
  if (props.items.length === 0) {
    return
  }

  setActiveIndex(index)
  setOpen(true)
}

function close() {
  setOpen(false)
}

function previous() {
  if (!canPrevious.value) {
    return
  }

  setActiveIndex(currentIndex.value - 1)
}

function next() {
  if (!canNext.value) {
    return
  }

  setActiveIndex(currentIndex.value + 1)
}

function first() {
  setActiveIndex(0)
}

function last() {
  setActiveIndex(Math.max(0, props.items.length - 1))
}

function handleOpen() {
  if (!import.meta.client) {
    return
  }

  restoreFocusElement = document.activeElement instanceof HTMLElement ? document.activeElement : null
  lockBodyScroll()
  document.addEventListener("keydown", onKeydown)
  resetImageLoadState()
  emit("open", currentIndex.value, activeItem.value)
  void nextTick(() => {
    rootRef.value?.focus()
    scrollActiveThumbIntoView()
  })
}

function handleClose() {
  if (import.meta.client) {
    document.removeEventListener("keydown", onKeydown)
  }

  stopVideo()
  resetImageTransform()
  resetVideoState()
  unlockBodyScroll()
  emit("close")

  if (import.meta.client && restoreFocusElement?.isConnected) {
    restoreFocusElement.focus()
  }
}

function lockBodyScroll() {
  if (!import.meta.client || restoreBodyOverflow !== null) {
    return
  }

  const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth

  restoreBodyOverflow = document.body.style.overflow
  restoreBodyPaddingRight = document.body.style.paddingRight
  document.body.style.overflow = "hidden"

  if (scrollbarWidth > 0) {
    document.body.style.paddingRight = `${scrollbarWidth}px`
  }
}

function unlockBodyScroll() {
  if (!import.meta.client || restoreBodyOverflow === null) {
    return
  }

  document.body.style.overflow = restoreBodyOverflow
  document.body.style.paddingRight = restoreBodyPaddingRight || ""
  restoreBodyOverflow = null
  restoreBodyPaddingRight = null
}

function onBackdropClick(event: MouseEvent) {
  if (!props.closeOnBackdrop || event.target !== event.currentTarget) {
    return
  }

  close()
}

function onKeydown(event: KeyboardEvent) {
  if (!isOpen.value) {
    return
  }

  if (event.key === "Tab") {
    trapFocus(event)
    return
  }

  if (event.key === "Escape") {
    event.preventDefault()
    close()
    return
  }

  if (isControlTarget(event.target)) {
    return
  }

  if (event.key === "ArrowLeft") {
    event.preventDefault()
    previous()
  } else if (event.key === "ArrowRight") {
    event.preventDefault()
    next()
  } else if (event.key === "Home") {
    event.preventDefault()
    first()
  } else if (event.key === "End") {
    event.preventDefault()
    last()
  } else if (event.key === " " && isActiveVideo.value) {
    event.preventDefault()
    void toggleVideoPlay()
  } else if ((event.key === "+" || event.key === "=") && isActiveImage.value) {
    event.preventDefault()
    zoomImage(0.25)
  } else if ((event.key === "-" || event.key === "_") && isActiveImage.value) {
    event.preventDefault()
    zoomImage(-0.25)
  } else if (event.key === "0" && isActiveImage.value) {
    event.preventDefault()
    resetImageTransform()
  }
}

function isControlTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) {
    return false
  }

  return Boolean(target.closest("button, a, input, textarea, select, md-slider, .aoi-lightbox__video-controls"))
}

function trapFocus(event: KeyboardEvent) {
  const root = rootRef.value

  if (!root) {
    return
  }

  const focusable = Array.from(root.querySelectorAll<HTMLElement>([
    "a[href]",
    "button:not([disabled])",
    "input:not([disabled])",
    "select:not([disabled])",
    "textarea:not([disabled])",
    "md-elevated-button:not([disabled])",
    "md-filled-button:not([disabled])",
    "md-filled-icon-button:not([disabled])",
    "md-filled-tonal-button:not([disabled])",
    "md-filled-tonal-icon-button:not([disabled])",
    "md-icon-button:not([disabled])",
    "md-outlined-button:not([disabled])",
    "md-outlined-icon-button:not([disabled])",
    "md-text-button:not([disabled])",
    "md-slider:not([disabled])",
    "[tabindex]:not([tabindex='-1'])"
  ].join(","))).filter((element) => !element.hasAttribute("disabled") && element.offsetParent !== null)

  if (focusable.length === 0) {
    event.preventDefault()
    root.focus()
    return
  }

  const firstElement = focusable[0]!
  const lastElement = focusable[focusable.length - 1]!

  if (event.shiftKey && document.activeElement === firstElement) {
    event.preventDefault()
    lastElement.focus()
  } else if (!event.shiftKey && document.activeElement === lastElement) {
    event.preventDefault()
    firstElement.focus()
  }
}

function resetImageLoadState() {
  imageFailed.value = false
  imageLoading.value = Boolean(activeItem.value?.type === "image" && activeItem.value.src && !isGradientSource(activeItem.value.src))
}

function onImageLoad() {
  imageLoading.value = false
  imageFailed.value = false
}

function onImageError() {
  imageLoading.value = false
  imageFailed.value = true
}

function zoomImage(delta: number) {
  if (!isActiveImage.value) {
    return
  }

  const nextScale = Math.min(4, Math.max(1, Number((imageScale.value + delta).toFixed(2))))

  imageScale.value = nextScale

  if (nextScale === 1) {
    imageX.value = 0
    imageY.value = 0
  }
}

function resetImageTransform() {
  imageScale.value = 1
  imageX.value = 0
  imageY.value = 0
}

function onStagePointerDown(event: PointerEvent) {
  if (event.button !== 0 || isControlTarget(event.target)) {
    return
  }

  gesture.active = true
  gesture.pointerId = event.pointerId
  gesture.startX = event.clientX
  gesture.startY = event.clientY
  gesture.lastX = event.clientX
  gesture.lastY = event.clientY
  gesture.baseX = imageX.value
  gesture.baseY = imageY.value
  gesture.mode = isActiveImage.value && imageScale.value > 1 ? "pan" : "swipe"
  ;(event.currentTarget as HTMLElement).setPointerCapture?.(event.pointerId)
}

function onStagePointerMove(event: PointerEvent) {
  if (!gesture.active || event.pointerId !== gesture.pointerId) {
    return
  }

  gesture.lastX = event.clientX
  gesture.lastY = event.clientY

  if (gesture.mode !== "pan") {
    return
  }

  imageX.value = gesture.baseX + event.clientX - gesture.startX
  imageY.value = gesture.baseY + event.clientY - gesture.startY
}

function onStagePointerUp(event: PointerEvent) {
  if (!gesture.active || event.pointerId !== gesture.pointerId) {
    return
  }

  ;(event.currentTarget as HTMLElement).releasePointerCapture?.(event.pointerId)

  const deltaX = gesture.lastX - gesture.startX
  const deltaY = gesture.lastY - gesture.startY
  const mode = gesture.mode

  gesture.active = false
  gesture.mode = "none"
  gesture.pointerId = -1

  if (mode === "swipe" && Math.abs(deltaX) >= 68 && Math.abs(deltaX) > Math.abs(deltaY) * 1.35) {
    if (deltaX > 0) {
      previous()
    } else {
      next()
    }
  }
}

function thumbnailSource(item?: AoiLightboxItem) {
  if (!item) {
    return undefined
  }

  return item.thumbnailSrc || item.posterSrc || item.src
}

function isGradientSource(source?: string | null) {
  return Boolean(source?.startsWith("gradient:"))
}

function gradientForSource(source?: string | null) {
  const gradients = [
    "linear-gradient(135deg, #6de5e5, #5b8def 48%, #f2709c)",
    "linear-gradient(135deg, #f7b955, #d9f7cc 48%, #65d5e4)",
    "linear-gradient(135deg, #7a68f0, #22b8cf 48%, #151c33)",
    "linear-gradient(135deg, #c9f3f7, #8fc7ff 45%, #f7d3df)",
    "linear-gradient(135deg, #17262b, #216d7d 48%, #f2709c)",
    "linear-gradient(135deg, #fff6fb, #f2709c 45%, #22b8cf)"
  ]

  if (!source) {
    return gradients[0]
  }

  let hash = 0

  for (const char of source) {
    hash = (hash * 31 + char.charCodeAt(0)) >>> 0
  }

  return gradients[hash % gradients.length]
}

function setThumbRef(element: Element | ComponentPublicInstance | null, index: number) {
  if (element instanceof HTMLElement) {
    thumbRefs.value[index] = element
  } else if (element && "$el" in element && element.$el instanceof HTMLElement) {
    thumbRefs.value[index] = element.$el
  }
}

function scrollActiveThumbIntoView() {
  thumbRefs.value[currentIndex.value]?.scrollIntoView({
    behavior: "smooth",
    block: "nearest",
    inline: "center"
  })
}

async function toggleVideoPlay() {
  const video = videoRef.value

  if (!video || videoFailed.value) {
    return
  }

  if (video.paused) {
    try {
      await video.play()
    } catch {
      videoFailed.value = Boolean(video.error)
      videoPlaying.value = false
      videoLoading.value = false
      applyVideoVolume()
      emitVideoState()
    }
    return
  }

  video.pause()
}

function stopVideo() {
  const video = videoRef.value

  if (!video) {
    return
  }

  video.pause()
}

function resetVideoState() {
  videoCurrentTime.value = 0
  videoDuration.value = activeItem.value?.durationSeconds || 0
  videoLoading.value = Boolean(activeItem.value?.type === "video")
  videoFailed.value = false
  videoPlaying.value = false
  videoFullscreen.value = import.meta.client ? Boolean(document.fullscreenElement) : false
}

function applyVideoVolume() {
  const video = videoRef.value

  if (!video) {
    return
  }

  video.muted = videoMuted.value
  video.volume = videoVolume.value
}

function loadActiveVideo() {
  const video = videoRef.value

  if (!video || !isActiveVideo.value) {
    return
  }

  videoLoading.value = true
  videoFailed.value = false
  applyVideoVolume()
  video.load()
}

function onVideoLoadedMetadata() {
  const video = videoRef.value

  if (!video) {
    return
  }

  videoDuration.value = Number.isFinite(video.duration) && video.duration > 0
    ? video.duration
    : activeItem.value?.durationSeconds || 0
  videoLoading.value = false
  applyVideoVolume()
  emitVideoState()
}

function onVideoTimeUpdate() {
  const video = videoRef.value

  if (!video) {
    return
  }

  videoCurrentTime.value = video.currentTime
  emitVideoState()
}

function onVideoPlay() {
  videoPlaying.value = true
  videoLoading.value = false
  emitVideoState()
}

function onVideoPause() {
  videoPlaying.value = false
  emitVideoState()
}

function onVideoEnded() {
  videoPlaying.value = false
  videoCurrentTime.value = videoDuration.value
  emitVideoState()
}

function onVideoWaiting() {
  videoLoading.value = true
  emitVideoState()
}

function onVideoCanPlay() {
  videoLoading.value = false
  videoFailed.value = false
  emitVideoState()
}

function onVideoError() {
  videoLoading.value = false
  videoFailed.value = true
  videoPlaying.value = false
  emitVideoState()
}

function seekVideo(value: number) {
  const video = videoRef.value

  if (!video) {
    return
  }

  const nextTime = Math.min(videoProgressMax.value, Math.max(0, value))

  video.currentTime = nextTime
  videoCurrentTime.value = nextTime
  emitVideoState()
}

function setVideoVolume(value: number) {
  videoVolume.value = Math.min(1, Math.max(0, value / 100))

  if (videoVolume.value > 0 && videoMuted.value) {
    videoMuted.value = false
  }
}

function toggleVideoMuted() {
  videoMuted.value = !videoMuted.value
}

async function toggleVideoFullscreen() {
  if (!import.meta.client || !mediaRef.value) {
    return
  }

  if (document.fullscreenElement) {
    await document.exitFullscreen()
    videoFullscreen.value = false
    emitVideoState()
    return
  }

  await mediaRef.value.requestFullscreen?.()
  videoFullscreen.value = true
  emitVideoState()
}

function emitVideoState() {
  emit("video-state-change", videoState.value, currentIndex.value, activeItem.value)
}

function formatTime(seconds: number) {
  const safeSeconds = Math.max(0, Math.floor(seconds))
  const minutes = Math.floor(safeSeconds / 60)
  const rest = String(safeSeconds % 60).padStart(2, "0")

  return `${minutes}:${rest}`
}

defineExpose({
  close,
  next,
  openAt,
  previous,
  resetImageTransform
})
</script>

<template>
  <div v-bind="$attrs" class="aoi-lightbox-gallery">
    <slot
      :active-index="currentIndex"
      :active-item="activeItem"
      :close="close"
      :next="next"
      :open="isOpen"
      :open-at="openAt"
      :previous="previous"
    >
      <div v-if="showInlineGallery && items.length > 0" class="aoi-lightbox-gallery__grid">
        <button
          v-for="(item, index) in items"
          :key="item.id"
          class="aoi-lightbox-gallery__tile"
          type="button"
          :aria-label="item.title || item.alt || resolvedLabels.media"
          @click="openAt(index)"
        >
          <slot name="thumbnail" :item="item" :index="index" :active="index === currentIndex">
            <AoiLazyImage
              class="aoi-lightbox-gallery__tile-image"
              :src="thumbnailSource(item)"
              :alt="item.alt || item.title || ''"
            />
            <span v-if="item.type === 'video'" class="aoi-lightbox-gallery__tile-type" aria-hidden="true">
              <AoiIcon name="play" :size="18" decorative />
            </span>
            <span v-if="item.title" class="aoi-lightbox-gallery__tile-title">{{ item.title }}</span>
          </slot>
        </button>
      </div>

      <slot v-else name="empty">
        <p class="aoi-lightbox-gallery__empty">{{ resolvedLabels.empty }}</p>
      </slot>
    </slot>
  </div>

  <Teleport to="body">
    <section
      v-if="isOpen"
      ref="rootRef"
      class="aoi-lightbox"
      role="dialog"
      aria-modal="true"
      :aria-label="activeItemLabel"
      tabindex="-1"
      :style="layer.style.value"
      @click="onBackdropClick"
    >
        <div class="aoi-lightbox__chrome" @click.stop>
          <header class="aoi-lightbox__topbar">
            <div class="aoi-lightbox__heading">
              <span v-if="showCounter" class="aoi-lightbox__counter">{{ counterText }}</span>
              <h2>{{ activeItemLabel }}</h2>
            </div>

            <div class="aoi-lightbox__toolbar" :aria-label="resolvedLabels.media">
              <template v-if="isActiveImage">
                <AoiIconButton
                  icon="zoom-out"
                  :label="resolvedLabels.zoomOut"
                  :disabled="imageScale <= 1"
                  size="sm"
                  @click="zoomImage(-0.25)"
                />
                <AoiIconButton
                  icon="rotate-ccw"
                  :label="resolvedLabels.resetZoom"
                  :disabled="imageScale <= 1"
                  size="sm"
                  @click="resetImageTransform"
                />
                <AoiIconButton
                  icon="zoom-in"
                  :label="resolvedLabels.zoomIn"
                  :disabled="imageScale >= 4"
                  size="sm"
                  @click="zoomImage(0.25)"
                />
              </template>
              <AoiIconButton icon="x" :label="resolvedLabels.close" size="sm" @click="close" />
            </div>
          </header>

          <div
            ref="mediaRef"
            class="aoi-lightbox__media"
            :class="{
              'aoi-lightbox__media--image': isActiveImage,
              'aoi-lightbox__media--video': isActiveVideo,
              'aoi-lightbox__media--panning': gesture.mode === 'pan'
            }"
            @pointerdown="onStagePointerDown"
            @pointermove="onStagePointerMove"
            @pointerup="onStagePointerUp"
            @pointercancel="onStagePointerUp"
          >
            <button
              class="aoi-lightbox__nav aoi-lightbox__nav--previous"
              type="button"
              :aria-label="resolvedLabels.previous"
              :disabled="!canPrevious"
              @click="previous"
            >
              <AoiIcon name="chevron-left" :size="28" decorative />
            </button>

            <div v-if="activeItem" class="aoi-lightbox__stage">
              <template v-if="isActiveImage">
                <div
                  v-if="isGradientImage || imageFailed"
                  class="aoi-lightbox__image aoi-lightbox__image-placeholder"
                  :style="[imageTransform, { background: gradientForSource(activeItem.src) }]"
                >
                  <span>{{ imageFailed ? resolvedLabels.imageError : activeItemLabel }}</span>
                </div>
                <img
                  v-else
                  class="aoi-lightbox__image"
                  :class="{ 'aoi-lightbox__image--loading': imageLoading }"
                  :src="activeItem.src"
                  :alt="activeItem.alt || activeItem.title || ''"
                  draggable="false"
                  :style="imageTransform"
                  @load="onImageLoad"
                  @error="onImageError"
                >
                <div v-if="imageLoading" class="aoi-lightbox__state">
                  <AoiProgress type="circular" indeterminate />
                  <span>{{ resolvedLabels.loading }}</span>
                </div>
              </template>

              <template v-else-if="isActiveVideo">
                <div class="aoi-lightbox__video-shell">
                  <video
                    ref="videoRef"
                    class="aoi-lightbox__video"
                    :src="activeItem.src"
                    :poster="activeItem.posterSrc && !isGradientSource(activeItem.posterSrc) ? activeItem.posterSrc : undefined"
                    preload="metadata"
                    playsinline
                    @loadedmetadata="onVideoLoadedMetadata"
                    @timeupdate="onVideoTimeUpdate"
                    @play="onVideoPlay"
                    @pause="onVideoPause"
                    @ended="onVideoEnded"
                    @waiting="onVideoWaiting"
                    @canplay="onVideoCanPlay"
                    @error="onVideoError"
                  />
                  <div
                    v-if="activeItem.posterSrc && isGradientSource(activeItem.posterSrc) && !videoPlaying"
                    class="aoi-lightbox__video-poster"
                    :style="{ background: gradientForSource(activeItem.posterSrc) }"
                    aria-hidden="true"
                  />
                  <button
                    v-if="!videoFailed"
                    class="aoi-lightbox__play-overlay"
                    type="button"
                    :aria-label="videoPlaying ? resolvedLabels.pause : resolvedLabels.play"
                    @click="toggleVideoPlay"
                  >
                    <span>
                      <AoiIcon :name="videoPlaying ? 'pause' : 'play'" :size="34" decorative />
                    </span>
                  </button>
                  <div v-if="videoLoading && !videoFailed" class="aoi-lightbox__state">
                    <AoiProgress type="circular" indeterminate />
                    <span>{{ resolvedLabels.loading }}</span>
                  </div>
                  <div v-else-if="videoFailed" class="aoi-lightbox__state">
                    <AoiIcon name="video-off" :size="30" decorative />
                    <span>{{ resolvedLabels.videoError }}</span>
                  </div>
                </div>

                <div class="aoi-lightbox__video-controls">
                  <AoiIconButton
                    :icon="videoPlaying ? 'pause' : 'play'"
                    :label="videoPlaying ? resolvedLabels.pause : resolvedLabels.play"
                    variant="tonal"
                    @click="toggleVideoPlay"
                  />
                  <div class="aoi-lightbox__timeline">
                    <span>{{ formatTime(videoCurrentTime) }}</span>
                    <AoiSlider
                      :model-value="videoCurrentTime"
                      :aria-label="resolvedLabels.media"
                      contrast="inverse"
                      compact
                      :min="0"
                      :max="videoProgressMax"
                      :step="0.1"
                      @update:model-value="seekVideo"
                    />
                    <span>{{ formatTime(videoProgressMax) }}</span>
                  </div>
                  <AoiIconButton
                    :icon="videoMuted || videoVolume === 0 ? 'volume-x' : 'volume-2'"
                    :label="videoMuted ? resolvedLabels.unmute : resolvedLabels.mute"
                    :active="videoMuted"
                    @click="toggleVideoMuted"
                  />
                  <AoiSlider
                    class="aoi-lightbox__volume"
                    :model-value="volumePercent"
                    :aria-label="resolvedLabels.volume"
                    contrast="inverse"
                    compact
                    :min="0"
                    :max="100"
                    :step="1"
                    @update:model-value="setVideoVolume"
                  />
                  <AoiIconButton
                    icon="maximize"
                    :label="resolvedLabels.fullscreen"
                    @click="toggleVideoFullscreen"
                  />
                </div>
              </template>

              <slot name="caption" :item="activeItem" :index="currentIndex">
                <footer v-if="activeItem.title || activeItem.description" class="aoi-lightbox__caption">
                  <strong v-if="activeItem.title">{{ activeItem.title }}</strong>
                  <p v-if="activeItem.description">{{ activeItem.description }}</p>
                </footer>
              </slot>
            </div>

            <slot v-else name="empty">
              <p class="aoi-lightbox-gallery__empty">{{ resolvedLabels.empty }}</p>
            </slot>

            <button
              class="aoi-lightbox__nav aoi-lightbox__nav--next"
              type="button"
              :aria-label="resolvedLabels.next"
              :disabled="!canNext"
              @click="next"
            >
              <AoiIcon name="chevron-right" :size="28" decorative />
            </button>
          </div>

          <div v-if="showThumbnails && items.length > 1" class="aoi-lightbox__thumbs" role="listbox" :aria-label="resolvedLabels.media">
            <button
              v-for="(item, index) in items"
              :key="item.id"
              :ref="(element) => setThumbRef(element, index)"
              class="aoi-lightbox__thumb"
              type="button"
              role="option"
              :aria-selected="index === currentIndex"
              :aria-label="item.title || item.alt || resolvedLabels.media"
              :class="{ 'aoi-lightbox__thumb--active': index === currentIndex }"
              @click="setActiveIndex(index)"
            >
              <slot name="thumbnail" :item="item" :index="index" :active="index === currentIndex">
                <AoiLazyImage
                  class="aoi-lightbox__thumb-image"
                  :src="thumbnailSource(item)"
                  :alt="item.alt || item.title || ''"
                />
                <AoiIcon v-if="item.type === 'video'" class="aoi-lightbox__thumb-type" name="play" :size="16" decorative />
              </slot>
            </button>
          </div>
        </div>
    </section>
  </Teleport>
</template>

<style scoped>
.aoi-lightbox-gallery {
  display: grid;
  min-width: 0;
}

.aoi-lightbox-gallery__grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: var(--aoi-grid-gap-compact);
}

.aoi-lightbox-gallery__tile {
  position: relative;
  display: grid;
  min-width: 0;
  gap: 8px;
  border: 1px solid var(--aoi-border);
  border-radius: var(--aoi-radius-card);
  background: var(--aoi-card-bg);
  color: var(--aoi-text);
  cursor: pointer;
  padding: 8px;
  text-align: start;
  transition:
    background var(--aoi-motion-base) var(--aoi-ease-out),
    border-color var(--aoi-motion-base) var(--aoi-ease-out),
    transform var(--aoi-motion-base) var(--aoi-ease-out);
}

.aoi-lightbox-gallery__tile:hover {
  border-color: var(--aoi-state-border-active);
  background: var(--aoi-state-hover);
  transform: translate3d(0, -3px, 0);
}

.aoi-lightbox-gallery__tile-image {
  border-radius: var(--aoi-radius-card);
}

.aoi-lightbox-gallery__tile-type {
  position: absolute;
  top: 14px;
  right: 14px;
  display: grid;
  width: 32px;
  height: 32px;
  place-items: center;
  border: 1px solid rgba(255, 255, 255, .64);
  border-radius: var(--aoi-radius-round);
  background: rgba(7, 24, 29, .42);
  color: #fff;
  backdrop-filter: blur(10px);
}

.aoi-lightbox-gallery__tile-title {
  overflow: hidden;
  color: var(--aoi-text);
  font-size: 13px;
  font-weight: 760;
  line-height: 1.45;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.aoi-lightbox-gallery__empty {
  margin: 0;
  color: var(--aoi-text-muted);
  line-height: 1.7;
}

.aoi-lightbox {
  position: fixed;
  inset: 0;
  display: grid;
  place-items: center;
  background: rgba(5, 13, 16, .74);
  color: #fff;
  padding: 18px;
  backdrop-filter: blur(16px);
}

.aoi-lightbox__chrome {
  display: grid;
  grid-template-rows: auto minmax(0, 1fr) auto;
  width: min(1180px, 100%);
  height: min(780px, calc(100vh - 36px));
  min-height: 0;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, .18);
  border-radius: var(--aoi-radius-container);
  background: rgba(8, 20, 24, .92);
  box-shadow: 0 28px 80px rgba(0, 0, 0, .34);
}

.aoi-lightbox__topbar {
  display: flex;
  min-width: 0;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  border-bottom: 1px solid rgba(255, 255, 255, .12);
  padding: 10px 12px;
}

.aoi-lightbox__heading {
  display: grid;
  min-width: 0;
  gap: 2px;
}

.aoi-lightbox__heading h2 {
  overflow: hidden;
  margin: 0;
  color: #fff;
  font-size: 15px;
  font-weight: 820;
  line-height: 1.35;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.aoi-lightbox__counter {
  color: rgba(255, 255, 255, .68);
  font-size: 12px;
  font-variant-numeric: tabular-nums;
  font-weight: 720;
}

.aoi-lightbox__toolbar {
  display: inline-flex;
  flex: 0 0 auto;
  gap: 4px;
}

.aoi-lightbox__toolbar :deep(.aoi-icon-button),
.aoi-lightbox__video-controls :deep(.aoi-icon-button) {
  --md-icon-button-icon-color: rgba(255, 255, 255, .86);
  --md-icon-button-hover-icon-color: #fff;
  --md-icon-button-pressed-icon-color: #fff;
  --md-filled-tonal-button-container-color: rgba(255, 255, 255, .14);
  color: rgba(255, 255, 255, .86);
}

.aoi-lightbox__media {
  position: relative;
  display: grid;
  grid-template-columns: 52px minmax(0, 1fr) 52px;
  min-height: 0;
  overflow: hidden;
  touch-action: pan-y;
}

.aoi-lightbox__media--image {
  cursor: grab;
}

.aoi-lightbox__media--panning {
  cursor: grabbing;
}

.aoi-lightbox__stage {
  position: relative;
  display: grid;
  min-width: 0;
  min-height: 0;
  place-items: center;
  overflow: hidden;
  padding: 14px;
}

.aoi-lightbox__image {
  display: block;
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
  transform-origin: center;
  transition: transform var(--aoi-motion-base) var(--aoi-ease-out), opacity var(--aoi-motion-base) var(--aoi-ease-out);
  user-select: none;
}

.aoi-lightbox__image--loading {
  opacity: .2;
}

.aoi-lightbox__image-placeholder {
  display: grid;
  width: min(100%, 820px);
  aspect-ratio: 16 / 9;
  place-items: center;
  border-radius: var(--aoi-radius-card);
  color: #fff;
  font-size: clamp(18px, 4vw, 34px);
  font-weight: 860;
  text-align: center;
  text-shadow: 0 2px 18px rgba(0, 0, 0, .24);
}

.aoi-lightbox__video-shell {
  position: relative;
  display: grid;
  width: 100%;
  max-width: 980px;
  aspect-ratio: 16 / 9;
  overflow: hidden;
  border-radius: var(--aoi-radius-card);
  background: #061215;
}

.aoi-lightbox__video,
.aoi-lightbox__video-poster {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}

.aoi-lightbox__video {
  object-fit: contain;
}

.aoi-lightbox__video-poster {
  pointer-events: none;
  opacity: .62;
}

.aoi-lightbox__play-overlay {
  position: absolute;
  inset: 0;
  display: grid;
  border: 0;
  background: transparent;
  color: #fff;
  cursor: pointer;
  place-items: center;
}

.aoi-lightbox__play-overlay span {
  display: grid;
  width: 78px;
  height: 78px;
  place-items: center;
  border: 1px solid rgba(255, 255, 255, .64);
  border-radius: var(--aoi-radius-round);
  background: rgba(255, 255, 255, .16);
  backdrop-filter: blur(12px);
  transition: transform var(--aoi-motion-fast) var(--aoi-ease-out);
}

.aoi-lightbox__play-overlay:hover span {
  transform: scale(1.06);
}

.aoi-lightbox__state {
  position: absolute;
  inset: 0;
  display: grid;
  gap: 10px;
  align-content: center;
  justify-items: center;
  background: rgba(6, 18, 21, .58);
  color: rgba(255, 255, 255, .82);
  font-weight: 720;
}

.aoi-lightbox__video-controls {
  display: grid;
  grid-template-columns: 44px minmax(0, 1fr) 44px minmax(82px, 124px) 44px;
  width: min(980px, 100%);
  align-items: center;
  gap: 8px;
  border-top: 1px solid rgba(255, 255, 255, .12);
  background: rgba(6, 18, 21, .78);
  padding: 10px;
}

.aoi-lightbox__timeline {
  display: grid;
  grid-template-columns: 42px minmax(0, 1fr) 42px;
  align-items: center;
  gap: 8px;
  color: rgba(255, 255, 255, .78);
  font-size: 12px;
  font-variant-numeric: tabular-nums;
  font-weight: 720;
}

.aoi-lightbox__volume {
  min-width: 0;
}

.aoi-lightbox__caption {
  position: absolute;
  right: 18px;
  bottom: 18px;
  left: 18px;
  display: grid;
  gap: 4px;
  max-width: 680px;
  justify-self: center;
  border: 1px solid rgba(255, 255, 255, .14);
  border-radius: var(--aoi-radius-card);
  background: rgba(6, 18, 21, .62);
  padding: 10px 12px;
  pointer-events: none;
}

.aoi-lightbox__caption strong,
.aoi-lightbox__caption p {
  margin: 0;
}

.aoi-lightbox__caption p {
  color: rgba(255, 255, 255, .72);
  line-height: 1.6;
}

.aoi-lightbox__nav {
  display: grid;
  width: 42px;
  height: 58px;
  align-self: center;
  justify-self: center;
  border: 1px solid rgba(255, 255, 255, .16);
  border-radius: var(--aoi-radius-control);
  background: rgba(255, 255, 255, .08);
  color: rgba(255, 255, 255, .86);
  cursor: pointer;
  place-items: center;
  transition: background var(--aoi-motion-fast) var(--aoi-ease-out), color var(--aoi-motion-fast) var(--aoi-ease-out);
}

.aoi-lightbox__nav:hover {
  background: rgba(255, 255, 255, .16);
  color: #fff;
}

.aoi-lightbox__nav:disabled {
  cursor: not-allowed;
  opacity: .34;
}

.aoi-lightbox__thumbs {
  display: flex;
  gap: 8px;
  overflow-x: auto;
  border-top: 1px solid rgba(255, 255, 255, .12);
  padding: 10px 12px 12px;
  scrollbar-width: thin;
}

.aoi-lightbox__thumb {
  position: relative;
  display: block;
  flex: 0 0 92px;
  overflow: hidden;
  border: 2px solid transparent;
  border-radius: var(--aoi-radius-card);
  background: transparent;
  cursor: pointer;
  padding: 0;
}

.aoi-lightbox__thumb--active {
  border-color: var(--aoi-accent-40);
}

.aoi-lightbox__thumb-image {
  width: 100%;
  aspect-ratio: 16 / 9;
}

.aoi-lightbox__thumb-type {
  position: absolute;
  top: 6px;
  right: 6px;
  color: #fff;
  filter: drop-shadow(0 1px 4px rgba(0, 0, 0, .34));
}

@media (max-width: 760px) {
  .aoi-lightbox {
    padding: 0;
  }

  .aoi-lightbox__chrome {
    width: 100%;
    height: 100dvh;
    border: 0;
    border-radius: 0;
  }

  .aoi-lightbox__topbar {
    align-items: start;
  }

  .aoi-lightbox__media {
    grid-template-columns: 1fr;
  }

  .aoi-lightbox__nav {
    position: absolute;
    z-index: 2;
    top: 50%;
    transform: translateY(-50%);
  }

  .aoi-lightbox__nav--previous {
    left: 8px;
  }

  .aoi-lightbox__nav--next {
    right: 8px;
  }

  .aoi-lightbox__stage {
    padding: 10px;
  }

  .aoi-lightbox__caption {
    right: 10px;
    bottom: 10px;
    left: 10px;
    max-width: none;
  }

  .aoi-lightbox__video-controls {
    grid-template-columns: 44px minmax(0, 1fr) 44px 44px;
  }

  .aoi-lightbox__volume {
    display: none;
  }

  .aoi-lightbox__thumb {
    flex-basis: 78px;
  }
}

@media (max-width: 520px) {
  .aoi-lightbox-gallery__grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .aoi-lightbox__toolbar {
    gap: 0;
  }

  .aoi-lightbox__heading h2 {
    max-width: 42vw;
  }

  .aoi-lightbox__timeline {
    grid-template-columns: 36px minmax(0, 1fr) 36px;
    gap: 6px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .aoi-lightbox-gallery__tile,
  .aoi-lightbox__image,
  .aoi-lightbox__play-overlay span {
    transition: none;
  }
}
</style>
