<script setup lang="ts" generic="T">
import type { AoiDanmakuItem, AoiDanmakuMapper, AoiDanmakuMode } from "~/types/danmaku"
import type { PlayerPlaybackRate } from "~/types/player"
import type { VideoSourceKind, VideoSourceOption } from "~/types/api"
import type { AoiVideoSourceEngineError } from "~/composables/useAoiVideoSourceEngine"
import type { AoiDanmakuRuntimeSettings } from "~/utils/aoiDanmaku"
import { inferAoiVideoSourceKind } from "~/composables/useAoiVideoSourceEngine"
import { normalizeAoiDanmakuItems } from "~/utils/aoiDanmaku"

type AoiDanmakuVideoPlayerErrorCode =
  | "dash"
  | "hls"
  | "load"
  | "noSource"
  | "play"
  | "sourceInit"
  | "unsupportedFormat"
  | "unsupportedHls"

interface AoiDanmakuVideoPlayerError extends Omit<AoiVideoSourceEngineError, "source"> {
  code: AoiDanmakuVideoPlayerErrorCode
  source?: VideoSourceOption
}

interface AoiDanmakuVideoPlayerState {
  currentTime: number
  duration: number
  engineAttaching: boolean
  error: AoiDanmakuVideoPlayerError | null
  errorCode: AoiDanmakuVideoPlayerErrorCode | null
  hasError: boolean
  hasLoadedMetadata: boolean
  isFullscreen: boolean
  isLoading: boolean
  isPlaying: boolean
  isWebFullscreen: boolean
  canPlay: boolean
  danmakuEnabled: boolean
  muted: boolean
  playbackRate: number
  theaterMode: boolean
  volume: number
}

interface AoiDanmakuVideoPlayerControls {
  exitFullscreen: () => Promise<void> | void
  pause: () => void
  play: () => Promise<void> | void
  reload: () => Promise<boolean> | void
  requestFullscreen: () => Promise<void> | void
  seekBy: (delta: number) => void
  seekTo: (seconds: number) => void
  selectSource: (id: string) => void
  sendDanmaku: (payload: { body: string, color: string, mode: AoiDanmakuMode }) => void
  setDanmakuEnabled: (value: boolean) => void
  setMuted: (value: boolean) => void
  setPlaybackRate: (value: number) => void
  setTheaterMode: (value: boolean) => void
  setVolume: (value: number) => void
  setWebFullscreen: (value: boolean) => Promise<void> | void
  toggleFullscreen: () => Promise<void> | void
  togglePlay: () => Promise<void> | void
  toggleWebFullscreen: () => Promise<void> | void
}

interface AoiDanmakuVideoPlayerSlotContext<TItem> {
  controls: AoiDanmakuVideoPlayerControls
  danmakuItems: AoiDanmakuItem[]
  rawDanmakuItems: TItem[]
  renderDanmakuItems: AoiDanmakuItem[]
  selectedSource: VideoSourceOption | null
  sources: VideoSourceOption[]
  state: AoiDanmakuVideoPlayerState
}

const props = withDefaults(defineProps<{
  ariaLabel?: string
  danmakuEnabled?: boolean
  danmakuItems?: T[]
  danmakuMapper?: AoiDanmakuMapper<T>
  danmakuSettings?: Partial<AoiDanmakuRuntimeSettings>
  durationSeconds?: number
  initialProgressSeconds?: number
  initialTimeSeconds?: number
  keyboardShortcuts?: boolean
  muted?: boolean
  playbackRate?: PlayerPlaybackRate | number
  poster?: string
  preloadMargin?: string
  selectedSourceId?: string
  sources?: VideoSourceOption[]
  src?: string
  theaterMode?: boolean
  title?: string
  volume?: number
}>(), {
  ariaLabel: undefined,
  danmakuEnabled: true,
  danmakuItems: () => [],
  danmakuMapper: undefined,
  danmakuSettings: () => ({}),
  durationSeconds: 0,
  initialProgressSeconds: undefined,
  initialTimeSeconds: 0,
  keyboardShortcuts: true,
  muted: false,
  playbackRate: 1,
  poster: undefined,
  preloadMargin: "200px 0px",
  selectedSourceId: "",
  sources: () => [],
  src: undefined,
  theaterMode: false,
  title: undefined,
  volume: 0.8
})

const emit = defineEmits<{
  ended: []
  error: [error: AoiDanmakuVideoPlayerError]
  "compose-request": []
  "context-menu": [event: MouseEvent, context: AoiDanmakuVideoPlayerSlotContext<T>]
  "duration-change": [seconds: number]
  progress: [seconds: number]
  "play-state-change": [playing: boolean]
  "send-danmaku": [payload: { body: string, color: string, mode: AoiDanmakuMode, timeSeconds: number }]
  "source-change": [source: VideoSourceOption]
  "time-change": [seconds: number]
  "update:danmakuEnabled": [value: boolean]
  "update:muted": [value: boolean]
  "update:playbackRate": [value: number]
  "update:selectedSourceId": [value: string]
  "update:theaterMode": [value: boolean]
  "update:volume": [value: number]
}>()

defineSlots<{
  default?: (props: AoiDanmakuVideoPlayerSlotContext<T>) => unknown
  composer?: (props: AoiDanmakuVideoPlayerSlotContext<T>) => unknown
  controls?: (props: AoiDanmakuVideoPlayerSlotContext<T>) => unknown
  overlay?: (props: AoiDanmakuVideoPlayerSlotContext<T>) => unknown
  panel?: (props: AoiDanmakuVideoPlayerSlotContext<T>) => unknown
}>()

const rootRef = ref<HTMLElement | null>(null)
const videoRef = ref<HTMLVideoElement | null>(null)
const currentTime = ref(0)
const duration = ref(props.durationSeconds)
const errorState = shallowRef<AoiDanmakuVideoPlayerError | null>(null)
const hasLoadedMetadata = ref(false)
const hasViewportFallback = ref(false)
const isFullscreen = ref(false)
const isLoading = ref(false)
const isPlaying = ref(false)
const isWebFullscreen = ref(false)
const pendingResumeTime = ref(0)
const attachedSourceId = ref("")
let lastProgressEmit = -1
let screenClickTimer: ReturnType<typeof setTimeout> | null = null
const webFullscreenBodyClass = "aoi-player-web-fullscreen-active"

const viewport = useAoiInViewport(rootRef, {
  once: true,
  rootMargin: props.preloadMargin,
  threshold: 0
})
const sourceEngine = useAoiVideoSourceEngine(videoRef)
const engineAttaching = sourceEngine.attaching
const initialTime = computed(() => Math.max(0, props.initialProgressSeconds ?? props.initialTimeSeconds ?? 0))
const safeVolume = computed(() => clampNumber(props.volume, 0, 1, 0.8))
const safePlaybackRate = computed(() => clampNumber(props.playbackRate, 0.25, 4, 1))
const resolvedAriaLabel = computed(() => props.ariaLabel || (props.title ? `${props.title} player` : "Video player"))
const normalizedDanmakuItems = computed(() => normalizeAoiDanmakuItems(props.danmakuItems, props.danmakuMapper))
const normalizedSources = computed(() => {
  const explicitSources = props.sources
    .filter((source) => Boolean(source.src))
    .map((source, index) => normalizeSource(source, index))

  if (explicitSources.length) {
    return explicitSources
  }

  if (!props.src) {
    return []
  }

  return [normalizeSource({
    id: "primary",
    kind: inferAoiVideoSourceKind(props.src),
    label: "Auto",
    src: props.src,
    isDefault: true
  }, 0)]
})
const sourceSignature = computed(() => normalizedSources.value
  .map((source) => `${source.id}:${source.kind}:${source.src}`)
  .join("|"))
const selectedSource = computed(() => {
  return normalizedSources.value.find((source) => source.id === props.selectedSourceId)
    || normalizedSources.value.find((source) => source.isDefault)
    || normalizedSources.value[0]
    || null
})
const shouldLoadMedia = computed(() => (viewport.hasIntersected.value || hasViewportFallback.value) && Boolean(selectedSource.value))
const hasError = computed(() => Boolean(errorState.value))
const canPlay = computed(() => Boolean(shouldLoadMedia.value && selectedSource.value && !hasError.value))
const state = computed<AoiDanmakuVideoPlayerState>(() => ({
  currentTime: currentTime.value,
  duration: duration.value,
  engineAttaching: engineAttaching.value,
  error: errorState.value,
  errorCode: errorState.value?.code || null,
  hasError: hasError.value,
  hasLoadedMetadata: hasLoadedMetadata.value,
  isFullscreen: isFullscreen.value,
  isLoading: isLoading.value,
  isPlaying: isPlaying.value,
  isWebFullscreen: isWebFullscreen.value,
  canPlay: canPlay.value,
  danmakuEnabled: props.danmakuEnabled,
  muted: props.muted,
  playbackRate: safePlaybackRate.value,
  theaterMode: props.theaterMode,
  volume: safeVolume.value
}))
const controls: AoiDanmakuVideoPlayerControls = {
  exitFullscreen,
  pause,
  play,
  reload,
  requestFullscreen,
  seekBy,
  seekTo,
  selectSource,
  sendDanmaku,
  setDanmakuEnabled,
  setMuted,
  setPlaybackRate,
  setTheaterMode,
  setVolume,
  setWebFullscreen,
  toggleFullscreen,
  togglePlay,
  toggleWebFullscreen
}
const slotContext = computed<AoiDanmakuVideoPlayerSlotContext<T>>(() => ({
  controls,
  danmakuItems: normalizedDanmakuItems.value,
  rawDanmakuItems: props.danmakuItems,
  renderDanmakuItems: normalizedDanmakuItems.value,
  selectedSource: selectedSource.value,
  sources: normalizedSources.value,
  state: state.value
}))

function clampNumber(value: unknown, min: number, max: number, fallback: number) {
  const numberValue = Number(value)

  if (!Number.isFinite(numberValue)) {
    return fallback
  }

  return Math.min(max, Math.max(min, numberValue))
}

function normalizeSource(source: VideoSourceOption, index: number): VideoSourceOption {
  const kind = (source.kind || inferAoiVideoSourceKind(source.src, source.mimeType)) as VideoSourceKind

  return {
    ...source,
    id: source.id || `source-${index + 1}`,
    kind,
    label: source.label || source.qualityLabel || "Auto"
  }
}

function engineErrorCode(error: AoiVideoSourceEngineError): AoiDanmakuVideoPlayerErrorCode {
  const map: Record<string, AoiDanmakuVideoPlayerErrorCode> = {
    AOI_VIDEO_DASH_ERROR: "dash",
    AOI_VIDEO_HLS_ERROR: "hls",
    AOI_VIDEO_SOURCE_INIT_ERROR: "sourceInit",
    AOI_VIDEO_UNSUPPORTED_FORMAT: "unsupportedFormat",
    AOI_VIDEO_UNSUPPORTED_HLS: "unsupportedHls"
  }

  return map[error.message] || "load"
}

function setError(error: AoiDanmakuVideoPlayerError) {
  errorState.value = error
  emit("error", error)
}

function clearError() {
  errorState.value = null
}

function emitProgress(force = false) {
  const seconds = Math.floor(currentTime.value)

  if (force || Math.abs(seconds - lastProgressEmit) >= 3) {
    lastProgressEmit = seconds
    emit("progress", seconds)
  }
}

function applyMediaSettings() {
  const video = videoRef.value

  if (!video) {
    return
  }

  video.muted = props.muted
  video.playbackRate = safePlaybackRate.value
  video.volume = safeVolume.value
}

function resetPlaybackState() {
  currentTime.value = 0
  duration.value = props.durationSeconds
  hasLoadedMetadata.value = false
  isLoading.value = false
  isPlaying.value = false
  lastProgressEmit = -1
  pendingResumeTime.value = initialTime.value
  clearError()
}

function refreshViewportFallback() {
  if (!import.meta.client || viewport.hasIntersected.value) {
    return
  }

  const root = rootRef.value

  if (!root) {
    return
  }

  const preloadMargin = Number.parseFloat(props.preloadMargin) || 200
  const rect = root.getBoundingClientRect()

  if (rect.bottom >= -preloadMargin && rect.top <= window.innerHeight + preloadMargin) {
    hasViewportFallback.value = true
  }
}

function onEngineError(error: AoiVideoSourceEngineError) {
  isLoading.value = false
  setError({
    ...error,
    code: engineErrorCode(error)
  })
}

async function attachSelectedSource(options: { autoplay?: boolean, keepTime?: boolean } = {}) {
  const source = selectedSource.value

  if (!source || !shouldLoadMedia.value) {
    if (!source) {
      setError({
        code: "noSource",
        fatal: true,
        message: "AOI_VIDEO_NO_SOURCE"
      })
    }

    return false
  }

  const resumeAt = options.keepTime ? currentTime.value : initialTime.value

  clearError()
  hasLoadedMetadata.value = false
  isLoading.value = true
  pendingResumeTime.value = Math.max(0, resumeAt)

  const attached = await sourceEngine.attachSource(source, {
    autoplay: options.autoplay,
    currentTime: pendingResumeTime.value,
    onError: onEngineError
  })

  if (!attached) {
    isLoading.value = false
    return false
  }

  attachedSourceId.value = source.id
  applyMediaSettings()
  emit("source-change", source)

  return true
}

async function reload() {
  return attachSelectedSource({ keepTime: true })
}

async function play() {
  const video = videoRef.value
  const source = selectedSource.value

  if (!video || !source) {
    return
  }

  if (attachedSourceId.value !== source.id) {
    await attachSelectedSource({ autoplay: true, keepTime: true })
    return
  }

  if (!canPlay.value) {
    return
  }

  try {
    await video.play()
  } catch (cause) {
    if (video.error) {
      setError({
        cause,
        code: "play",
        fatal: true,
        message: "AOI_VIDEO_PLAY_ERROR",
        source
      })
    }
  }
}

function pause() {
  videoRef.value?.pause()
}

async function togglePlay() {
  const video = videoRef.value

  if (!video || video.paused) {
    await play()
    return
  }

  pause()
}

function onLoadedMetadata() {
  const video = videoRef.value

  if (!video) {
    return
  }

  duration.value = Number.isFinite(video.duration) && video.duration > 0 ? video.duration : props.durationSeconds
  emit("duration-change", duration.value)
  applyMediaSettings()

  const resumeAt = Math.min(pendingResumeTime.value, Math.max(0, duration.value - 0.5))

  if (resumeAt > 0) {
    video.currentTime = resumeAt
    currentTime.value = resumeAt
    emit("time-change", resumeAt)
  }

  pendingResumeTime.value = 0
  hasLoadedMetadata.value = true
  isLoading.value = false
}

function onTimeUpdate() {
  const video = videoRef.value

  if (!video) {
    return
  }

  currentTime.value = video.currentTime
  emit("time-change", video.currentTime)
  emitProgress()
}

function onPlay() {
  isPlaying.value = true
  isLoading.value = false
  emit("play-state-change", true)
}

function onPause() {
  isPlaying.value = false
  emitProgress(true)
  emit("play-state-change", false)
}

function onEnded() {
  isPlaying.value = false
  currentTime.value = duration.value
  emit("time-change", duration.value)
  emit("progress", Math.floor(duration.value))
  emit("ended")
  emit("play-state-change", false)
}

function onError() {
  isLoading.value = false
  setError({
    cause: videoRef.value?.error,
    code: "load",
    fatal: true,
    message: "AOI_VIDEO_LOAD_ERROR",
    source: selectedSource.value || undefined
  })
}

function onWaiting() {
  if (!hasLoadedMetadata.value) {
    isLoading.value = true
  }
}

function onCanPlay() {
  isLoading.value = false
  applyMediaSettings()
}

function seekTo(value: number) {
  const video = videoRef.value

  if (!video || duration.value <= 0) {
    return
  }

  const nextTime = Math.min(duration.value, Math.max(0, value))
  video.currentTime = nextTime
  currentTime.value = nextTime
  emit("time-change", nextTime)
  emitProgress(true)
}

function seekBy(delta: number) {
  seekTo(currentTime.value + delta)
}

function setVolume(value: number) {
  emit("update:volume", clampNumber(value, 0, 1, safeVolume.value))
}

function setPlaybackRate(value: number) {
  emit("update:playbackRate", clampNumber(value, 0.25, 4, safePlaybackRate.value))
}

function setMuted(value: boolean) {
  emit("update:muted", value)
}

function setTheaterMode(value: boolean) {
  emit("update:theaterMode", value)
}

function setDanmakuEnabled(value: boolean) {
  emit("update:danmakuEnabled", value)
}

async function requestFullscreen() {
  const root = rootRef.value

  if (!root || !import.meta.client) {
    return
  }

  isWebFullscreen.value = false
  applyWebFullscreenDocumentState(false)
  await root.requestFullscreen?.()
}

async function exitFullscreen() {
  if (import.meta.client && document.fullscreenElement) {
    await document.exitFullscreen()
  }
}

async function toggleFullscreen() {
  if (!import.meta.client) {
    return
  }

  if (document.fullscreenElement) {
    await exitFullscreen()
    return
  }

  await requestFullscreen()
}

async function setWebFullscreen(value: boolean) {
  if (!import.meta.client) {
    return
  }

  if (value && document.fullscreenElement) {
    await exitFullscreen()
  }

  isWebFullscreen.value = value
  applyWebFullscreenDocumentState(value)
}

async function toggleWebFullscreen() {
  await setWebFullscreen(!isWebFullscreen.value)
}

function selectSource(id: string) {
  if (selectedSource.value?.id === id) {
    return
  }

  const wasPlaying = isPlaying.value
  emit("update:selectedSourceId", id)
  void nextTick(() => attachSelectedSource({ autoplay: wasPlaying, keepTime: true }))
}

function sendDanmaku(payload: { body: string, color: string, mode: AoiDanmakuMode }) {
  emit("send-danmaku", {
    ...payload,
    timeSeconds: currentTime.value
  })
}

function onFullscreenChange() {
  isFullscreen.value = Boolean(document.fullscreenElement && rootRef.value?.contains(document.fullscreenElement))

  if (isFullscreen.value) {
    isWebFullscreen.value = false
    applyWebFullscreenDocumentState(false)
  }
}

function applyWebFullscreenDocumentState(value: boolean) {
  if (!import.meta.client) {
    return
  }

  document.documentElement.classList.toggle(webFullscreenBodyClass, value)
  document.body.classList.toggle(webFullscreenBodyClass, value)
}

function clearScreenClickTimer() {
  if (screenClickTimer) {
    clearTimeout(screenClickTimer)
    screenClickTimer = null
  }
}

function onScreenClick() {
  clearScreenClickTimer()
  screenClickTimer = setTimeout(() => {
    screenClickTimer = null
    void togglePlay()
  }, 180)
}

function onScreenDoubleClick() {
  clearScreenClickTimer()
  void toggleFullscreen()
}

function onContextMenu(event: MouseEvent) {
  event.preventDefault()
  event.stopPropagation()
  emit("context-menu", event, slotContext.value)
}

function onKeydown(event: KeyboardEvent) {
  if (!props.keyboardShortcuts) {
    return
  }

  if (event.defaultPrevented) {
    return
  }

  const target = event.target
  const key = event.key.toLowerCase()

  if (key === "escape" && isWebFullscreen.value) {
    event.preventDefault()
    void setWebFullscreen(false)
    return
  }

  if (target instanceof HTMLElement && target.closest(".aoi-danmaku-composer")) {
    return
  }

  if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement) {
    return
  }

  if (key === "enter") {
    event.preventDefault()
    emit("compose-request")
  } else if (key === " ") {
    event.preventDefault()
    void togglePlay()
  } else if (key === "arrowright") {
    event.preventDefault()
    seekBy(5)
  } else if (key === "arrowleft") {
    event.preventDefault()
    seekBy(-5)
  } else if (key === "arrowup") {
    event.preventDefault()
    setVolume(safeVolume.value + 0.05)
  } else if (key === "arrowdown") {
    event.preventDefault()
    setVolume(safeVolume.value - 0.05)
  } else if (key === "m") {
    event.preventDefault()
    setMuted(!props.muted)
  } else if (key === "f") {
    event.preventDefault()
    void toggleFullscreen()
  } else if (key === "w") {
    event.preventDefault()
    void toggleWebFullscreen()
  } else if (key === "d") {
    event.preventDefault()
    setDanmakuEnabled(!props.danmakuEnabled)
  } else if (key === "t") {
    event.preventDefault()
    setTheaterMode(!props.theaterMode)
  }
}

watch([
  () => props.muted,
  safePlaybackRate,
  safeVolume
], applyMediaSettings)

watch(sourceSignature, () => {
  const nextSource = selectedSource.value

  attachedSourceId.value = ""
  sourceEngine.destroy()
  resetPlaybackState()

  if (nextSource && props.selectedSourceId !== nextSource.id) {
    emit("update:selectedSourceId", nextSource.id)
  }
}, {
  immediate: true
})

watch([
  shouldLoadMedia,
  () => selectedSource.value?.id || ""
], ([ready, id], [, oldId]) => {
  if (ready && id && attachedSourceId.value !== id) {
    void nextTick(() => attachSelectedSource({
      autoplay: isPlaying.value && Boolean(oldId),
      keepTime: Boolean(oldId)
    }))
  } else if (ready && !id) {
    setError({
      code: "noSource",
      fatal: true,
      message: "AOI_VIDEO_NO_SOURCE"
    })
  }
}, {
  immediate: true
})

watch(() => props.durationSeconds, (value) => {
  duration.value = value
  emit("duration-change", value)
})

onMounted(() => {
  document.addEventListener("fullscreenchange", onFullscreenChange)
  document.addEventListener("keydown", onKeydown, true)
  void nextTick(() => {
    refreshViewportFallback()
    requestAnimationFrame(refreshViewportFallback)
  })
})

onBeforeUnmount(() => {
  document.removeEventListener("fullscreenchange", onFullscreenChange)
  document.removeEventListener("keydown", onKeydown, true)
  applyWebFullscreenDocumentState(false)
  clearScreenClickTimer()
})

defineExpose({
  exitFullscreen,
  pause,
  play,
  reload,
  requestFullscreen,
  seekBy,
  seekTo,
  selectSource,
  setWebFullscreen,
  toggleFullscreen,
  togglePlay,
  toggleWebFullscreen
})
</script>

<template>
  <section
    ref="rootRef"
    class="aoi-danmaku-video-player"
    :class="{
      'aoi-danmaku-video-player--theater': theaterMode,
      'aoi-danmaku-video-player--web-fullscreen': isWebFullscreen
    }"
    :aria-label="resolvedAriaLabel"
    tabindex="0"
  >
    <div
      class="aoi-danmaku-video-player__screen"
      @click="onScreenClick"
      @contextmenu="onContextMenu"
      @dblclick="onScreenDoubleClick"
    >
      <video
        ref="videoRef"
        class="aoi-danmaku-video-player__video"
        :poster="poster"
        preload="metadata"
        playsinline
        @canplay="onCanPlay"
        @ended="onEnded"
        @error="onError"
        @loadedmetadata="onLoadedMetadata"
        @pause="onPause"
        @play="onPlay"
        @playing="onCanPlay"
        @timeupdate="onTimeUpdate"
        @waiting="onWaiting"
      />

      <AoiDanmakuLayer
        v-if="danmakuEnabled"
        :current-time="currentTime"
        :duration-seconds="duration"
        :items="normalizedDanmakuItems"
        :playing="isPlaying"
        :settings="danmakuSettings"
      />

      <slot v-bind="slotContext" />
      <slot name="overlay" v-bind="slotContext" />

      <div
        v-if="$slots.controls || $slots.composer"
        class="aoi-danmaku-video-player__controls"
        @click.stop
      >
        <slot v-if="$slots.controls" name="controls" v-bind="slotContext" />
        <slot v-if="$slots.composer" name="composer" v-bind="slotContext" />
      </div>

      <div
        v-if="$slots.panel"
        class="aoi-danmaku-video-player__panel-shell"
        @click.stop
      >
        <slot name="panel" v-bind="slotContext" />
      </div>
    </div>
  </section>
</template>

<style scoped>
.aoi-danmaku-video-player {
  container-type: inline-size;
  display: grid;
  overflow: clip;
  border: 1px solid var(--aoi-player-border);
  border-radius: 0;
  background: var(--aoi-player-surface);
  box-shadow: none;
  color: #fff;
  isolation: isolate;
}

.aoi-danmaku-video-player:focus-visible {
  outline: var(--aoi-focus-ring-width) solid var(--aoi-focus);
  outline-offset: var(--aoi-focus-ring-offset);
}

.aoi-danmaku-video-player--theater {
  border-color: color-mix(in srgb, var(--aoi-player-accent) 22%, var(--aoi-player-border));
  box-shadow: 0 10px 30px color-mix(in srgb, var(--aoi-shadow-md) 54%, transparent);
}

.aoi-danmaku-video-player--web-fullscreen {
  position: fixed;
  inset: 0;
  z-index: var(--aoi-z-dialog);
  width: 100vw;
  height: 100vh;
  border: 0;
  border-radius: 0;
  background: #050608;
}

:global(html.aoi-player-web-fullscreen-active),
:global(body.aoi-player-web-fullscreen-active) {
  overflow: hidden;
}

:global(body.aoi-player-web-fullscreen-active .aoi-shell),
:global(body.aoi-player-web-fullscreen-active .aoi-page) {
  transform: none !important;
}

:global(body.aoi-player-web-fullscreen-active .aoi-shell) {
  width: 100vw !important;
  max-width: none !important;
  margin-inline-start: 0 !important;
}

:global(body.aoi-player-web-fullscreen-active .aoi-page) {
  width: 100vw !important;
  max-width: none !important;
  padding-inline: 0 !important;
}

.aoi-danmaku-video-player__screen {
  position: relative;
  display: grid;
  aspect-ratio: 16 / 9;
  min-height: 304px;
  place-items: center;
  background: #000;
  overflow: hidden;
}

.aoi-danmaku-video-player--theater .aoi-danmaku-video-player__screen {
  min-height: min(70vh, 760px);
}

.aoi-danmaku-video-player__video {
  position: absolute;
  inset: 0;
  display: block;
  width: 100%;
  height: 100%;
  background: #000;
  object-fit: contain;
  object-position: center center;
}

.aoi-danmaku-video-player__screen :deep(.aoi-media-overlay-button) {
  z-index: 4;
}

.aoi-danmaku-video-player__screen :deep(.aoi-media-overlay-button__control) {
  width: 62px;
  height: 62px;
  border-color: rgba(255, 255, 255, .48);
  background: rgba(0, 0, 0, .42);
  backdrop-filter: blur(8px);
}

.aoi-danmaku-video-player__screen :deep(.aoi-danmaku-video-player__overlay) {
  position: absolute;
  inset: 0;
  z-index: 6;
  display: grid;
  place-items: center;
  gap: 12px;
  align-content: center;
  background: rgba(0, 0, 0, .72);
  color: rgba(255, 255, 255, .9);
  text-align: center;
  backdrop-filter: blur(6px);
}

.aoi-danmaku-video-player__controls {
  position: absolute;
  inset-inline: 0;
  bottom: 0;
  z-index: 8;
  display: grid;
  gap: 4px;
  background: var(--aoi-player-control-overlay);
  opacity: 0;
  padding: 20px 12px 8px;
  pointer-events: none;
  transform: translate3d(0, 6px, 0);
  transition:
    opacity var(--aoi-motion-base) var(--aoi-ease-out),
    transform var(--aoi-motion-base) var(--aoi-ease-out);
}

.aoi-danmaku-video-player:hover .aoi-danmaku-video-player__controls,
.aoi-danmaku-video-player:focus-within .aoi-danmaku-video-player__controls,
.aoi-danmaku-video-player__controls--visible {
  opacity: 1;
  pointer-events: auto;
  transform: translate3d(0, 0, 0);
}

.aoi-danmaku-video-player__controls :deep(.aoi-danmaku-video-player__control-bar) {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);
  min-width: 0;
  min-height: 36px;
  align-items: center;
  gap: 8px;
}

.aoi-danmaku-video-player__controls :deep(.aoi-danmaku-video-player__timeline) {
  min-height: 18px;
}

.aoi-danmaku-video-player__controls :deep(.aoi-danmaku-video-player__timeline .aoi-slider-field),
.aoi-danmaku-video-player__controls :deep(.aoi-danmaku-video-player__timeline .aoi-slider) {
  height: 18px;
  min-height: 18px;
}

.aoi-danmaku-video-player__controls :deep(.aoi-danmaku-video-player__control-group) {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 4px;
}

.aoi-danmaku-video-player__controls :deep(.aoi-danmaku-video-player__control-group--right) {
  justify-self: end;
  justify-content: flex-end;
}

.aoi-danmaku-video-player__controls :deep(.aoi-danmaku-video-player__control-group--left) {
  justify-self: start;
}

.aoi-danmaku-video-player__controls :deep(.aoi-danmaku-video-player__toolbar .aoi-icon-button),
.aoi-danmaku-video-player__controls :deep(.aoi-danmaku-video-player__control-bar .aoi-icon-button) {
  --md-icon-button-icon-color: rgba(255, 255, 255, .92);
  --md-icon-button-hover-icon-color: #fff;
  --md-icon-button-focus-icon-color: #fff;
  --md-icon-button-pressed-icon-color: #fff;
  --md-icon-button-focus-state-layer-color: transparent;
  --md-icon-button-focus-state-layer-opacity: 0;
  --md-icon-button-hover-state-layer-color: transparent;
  --md-icon-button-hover-state-layer-opacity: 0;
  --md-icon-button-pressed-state-layer-color: transparent;
  --md-icon-button-pressed-state-layer-opacity: 0;
  --aoi-icon-action-size: 32px;
  --md-focus-ring-color: transparent;
  --md-ripple-hover-color: transparent;
  --md-ripple-hover-opacity: 0;
  --md-ripple-pressed-color: transparent;
  --md-ripple-pressed-opacity: 0;
  border-radius: var(--aoi-radius-round);
  outline: 0;
  color: rgba(255, 255, 255, .92);
  width: 34px;
  height: 34px;
  transition: color var(--aoi-motion-fast) var(--aoi-ease-out);
}

.aoi-danmaku-video-player__controls :deep(.aoi-danmaku-video-player__toolbar .aoi-icon-button:focus-visible),
.aoi-danmaku-video-player__controls :deep(.aoi-danmaku-video-player__control-bar .aoi-icon-button:focus-visible) {
  outline: 1px solid color-mix(in srgb, var(--aoi-player-accent) 64%, transparent);
  outline-offset: 2px;
}

.aoi-danmaku-video-player__controls :deep(.aoi-danmaku-video-player__control--state-on) {
  --md-icon-button-icon-color: var(--aoi-player-accent);
  --md-icon-button-hover-icon-color: var(--aoi-player-accent);
  --md-icon-button-focus-icon-color: var(--aoi-player-accent);
  --md-icon-button-pressed-icon-color: var(--aoi-player-accent);
  color: var(--aoi-player-accent);
  box-shadow: none;
}

.aoi-danmaku-video-player__controls :deep(.aoi-danmaku-video-player__volume-control) {
  position: relative;
  z-index: 12;
  display: grid;
  width: 34px;
  height: 34px;
  flex: 0 0 34px;
  place-items: center;
}

.aoi-danmaku-video-player__controls :deep(.aoi-danmaku-video-player__volume-control)::before {
  position: absolute;
  bottom: 100%;
  left: 50%;
  width: 236px;
  height: 12px;
  content: "";
  transform: translateX(-50%);
}

.aoi-danmaku-video-player__controls :deep(.aoi-danmaku-video-player__volume-popover) {
  position: absolute;
  bottom: calc(100% + 8px);
  left: 50%;
  display: grid;
  width: 236px;
  height: 32px;
  align-items: center;
  border: 0;
  border-radius: 5px;
  background: rgba(223, 226, 228, .92);
  box-shadow: 0 8px 18px rgba(0, 0, 0, .2);
  opacity: 0;
  overflow: hidden;
  padding: 0;
  pointer-events: none;
  transform: translate3d(-50%, 4px, 0);
  transition:
    opacity var(--aoi-motion-fast) var(--aoi-ease-out),
    transform var(--aoi-motion-fast) var(--aoi-ease-out);
  backdrop-filter: blur(10px);
}

.aoi-danmaku-video-player__controls :deep(.aoi-danmaku-video-player__volume-control:hover .aoi-danmaku-video-player__volume-popover),
.aoi-danmaku-video-player__controls :deep(.aoi-danmaku-video-player__volume-control:has(.aoi-icon-button:focus-visible) .aoi-danmaku-video-player__volume-popover),
.aoi-danmaku-video-player__controls :deep(.aoi-danmaku-video-player__volume-control:has(.aoi-danmaku-video-player__volume-range:focus-visible) .aoi-danmaku-video-player__volume-popover) {
  opacity: 1;
  pointer-events: auto;
  transform: translate3d(-50%, 0, 0);
}

.aoi-danmaku-video-player__controls :deep(.aoi-danmaku-video-player__volume-track),
.aoi-danmaku-video-player__controls :deep(.aoi-danmaku-video-player__volume-fill) {
  position: absolute;
  inset-block: 0;
  left: 0;
}

.aoi-danmaku-video-player__controls :deep(.aoi-danmaku-video-player__volume-track) {
  right: 0;
  background: rgba(232, 234, 236, .92);
}

.aoi-danmaku-video-player__controls :deep(.aoi-danmaku-video-player__volume-fill) {
  display: grid;
  width: max(52px, var(--aoi-player-volume-percent, 0%));
  max-width: 100%;
  align-items: center;
  background: color-mix(in srgb, #f08bae 86%, var(--aoi-player-accent));
}

.aoi-danmaku-video-player__controls :deep(.aoi-danmaku-video-player__volume-value) {
  color: #fff;
  font-size: 13px;
  font-weight: 800;
  line-height: 1;
  padding-inline-start: 17px;
  text-shadow: 0 1px 1px rgba(0, 0, 0, .14);
  white-space: nowrap;
}

.aoi-danmaku-video-player__controls :deep(.aoi-danmaku-video-player__volume-range) {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  margin: 0;
  cursor: pointer;
  opacity: 0;
}

.aoi-danmaku-video-player__controls :deep(.aoi-danmaku-video-player__volume-range:focus-visible) {
  outline: 0;
}

.aoi-danmaku-video-player__controls :deep(.aoi-danmaku-video-player__volume-popover:has(.aoi-danmaku-video-player__volume-range:focus-visible)) {
  box-shadow:
    0 8px 18px rgba(0, 0, 0, .2),
    0 0 0 1px color-mix(in srgb, var(--aoi-player-accent) 62%, transparent);
}

.aoi-danmaku-video-player__controls :deep(.aoi-danmaku-video-player__spacer) {
  flex: 1 1 auto;
  min-width: 8px;
}

.aoi-danmaku-video-player__controls :deep(.aoi-danmaku-video-player__anchor) {
  display: inline-grid;
  flex: 0 0 auto;
  min-width: 0;
}

.aoi-danmaku-video-player__controls :deep(.aoi-danmaku-video-player__anchor--rate) {
  width: 64px;
}

.aoi-danmaku-video-player__controls :deep(.aoi-danmaku-video-player__control--subtitle) {
  width: 82px;
}

.aoi-danmaku-video-player__controls :deep(.aoi-danmaku-video-player__menu-button) {
  width: 100%;
  min-width: 0;
  max-width: 128px;
  --md-filled-tonal-button-container-color: rgba(255, 255, 255, .12);
  --md-filled-tonal-button-focus-container-color: rgba(255, 255, 255, .12);
  --md-filled-tonal-button-hover-container-color: rgba(255, 255, 255, .12);
  --md-filled-tonal-button-pressed-container-color: rgba(255, 255, 255, .12);
  --md-filled-tonal-button-focus-state-layer-color: transparent;
  --md-filled-tonal-button-focus-state-layer-opacity: 0;
  --md-filled-tonal-button-hover-state-layer-color: transparent;
  --md-filled-tonal-button-hover-state-layer-opacity: 0;
  --md-filled-tonal-button-pressed-state-layer-color: transparent;
  --md-filled-tonal-button-pressed-state-layer-opacity: 0;
  --md-filled-tonal-button-label-text-color: #fff;
  --md-filled-tonal-button-focus-label-text-color: #fff;
  --md-filled-tonal-button-hover-label-text-color: #fff;
  --md-filled-tonal-button-pressed-label-text-color: #fff;
  --md-filled-tonal-button-icon-color: #fff;
  --md-filled-tonal-button-focus-icon-color: #fff;
  --md-filled-tonal-button-hover-icon-color: #fff;
  --md-filled-tonal-button-pressed-icon-color: #fff;
  --md-filled-tonal-button-container-height: 30px;
  --md-filled-tonal-button-label-text-size: 12px;
  --md-focus-ring-color: transparent;
  --md-ripple-hover-color: transparent;
  --md-ripple-hover-opacity: 0;
  --md-ripple-pressed-color: transparent;
  --md-ripple-pressed-opacity: 0;
  outline: 0;
}

.aoi-danmaku-video-player__controls :deep(.aoi-danmaku-video-player__menu-button .aoi-button) {
  max-width: 100%;
}

.aoi-danmaku-video-player__controls :deep(.aoi-danmaku-video-player__menu-button:focus-visible) {
  outline: 1px solid color-mix(in srgb, var(--aoi-player-accent) 64%, transparent);
  outline-offset: 2px;
}

.aoi-danmaku-video-player__controls :deep(.aoi-danmaku-video-player__rate-button) {
  min-width: 64px;
}

.aoi-danmaku-video-player :deep(.aoi-danmaku-video-player__floating-menu) {
  --md-focus-ring-color: var(--aoi-player-accent);
  --md-menu-container-color: color-mix(in srgb, var(--aoi-player-surface) 96%, transparent);
  --md-menu-container-shape: 8px;
  --md-menu-item-container-color: transparent;
  --md-menu-item-disabled-label-text-color: var(--aoi-player-text-muted);
  --md-menu-item-disabled-leading-icon-color: var(--aoi-player-text-muted);
  --md-menu-item-focus-state-layer-color: transparent;
  --md-menu-item-hover-state-layer-color: color-mix(in srgb, var(--aoi-player-text) 8%, transparent);
  --md-menu-item-label-text-color: var(--aoi-player-text);
  --md-menu-item-leading-icon-color: var(--aoi-player-text-muted);
  --md-menu-item-pressed-state-layer-color: transparent;
  --md-menu-item-selected-container-color: transparent;
  --md-menu-item-selected-label-text-color: var(--aoi-player-accent);
  --md-menu-item-selected-leading-icon-color: var(--aoi-player-accent);
}

.aoi-danmaku-video-player__panel-shell {
  position: absolute;
  top: 12px;
  right: 12px;
  bottom: 96px;
  z-index: 7;
  display: grid;
  width: min(360px, calc(100% - 24px));
  min-width: 0;
  pointer-events: none;
}

.aoi-danmaku-video-player__panel-shell :deep(*) {
  pointer-events: auto;
}

.aoi-danmaku-video-player__panel-shell :deep(.aoi-danmaku-video-player__panel) {
  min-height: 0;
  border-radius: 0;
  box-shadow: 0 14px 38px rgba(0, 0, 0, .24);
}

.aoi-danmaku-video-player :deep(.aoi-danmaku-video-player__panel) {
  border-inline: 1px solid var(--aoi-player-border);
  border-bottom: 1px solid var(--aoi-player-border);
}

.aoi-danmaku-video-player :deep(.aoi-danmaku-video-player__composer) {
  width: clamp(300px, 38cqw, 520px);
  max-width: 100%;
  justify-self: center;
  color: var(--aoi-player-text);
}

.aoi-danmaku-video-player:fullscreen {
  width: 100vw;
  height: 100vh;
  border: 0;
  border-radius: 0;
  background: #050608;
}

.aoi-danmaku-video-player:fullscreen .aoi-danmaku-video-player__screen,
.aoi-danmaku-video-player--web-fullscreen .aoi-danmaku-video-player__screen {
  aspect-ratio: auto;
  height: 100%;
  min-height: 0;
}

.aoi-danmaku-video-player:fullscreen .aoi-danmaku-video-player__controls {
  position: absolute;
}

.aoi-danmaku-video-player:fullscreen .aoi-danmaku-video-player__panel-shell,
.aoi-danmaku-video-player--web-fullscreen .aoi-danmaku-video-player__panel-shell {
  bottom: 104px;
}

@container (max-width: 760px) {
  .aoi-danmaku-video-player__controls :deep(.aoi-danmaku-video-player__control-bar) {
    grid-template-columns: auto minmax(0, 1fr) auto;
    gap: 4px;
  }

  .aoi-danmaku-video-player :deep(.aoi-danmaku-video-player__composer) {
    width: 100%;
  }

  .aoi-danmaku-video-player__controls :deep(.aoi-danmaku-video-player__control--subtitle),
  .aoi-danmaku-video-player__controls :deep(.aoi-danmaku-video-player__control--settings),
  .aoi-danmaku-video-player__controls :deep(.aoi-danmaku-video-player__control--panel),
  .aoi-danmaku-video-player__controls :deep(.aoi-danmaku-video-player__control--theater) {
    display: none;
  }

  .aoi-danmaku-video-player__controls :deep(.aoi-danmaku-video-player__control-group--right) {
    gap: 2px;
  }

  .aoi-danmaku-video-player__controls :deep(.aoi-danmaku-video-player__menu-button) {
    max-width: 96px;
  }

}

@container (min-width: 761px) and (max-width: 960px) {
  .aoi-danmaku-video-player :deep(.aoi-danmaku-video-player__composer) {
    width: clamp(300px, 36cqw, 360px);
  }

  .aoi-danmaku-video-player__controls :deep(.aoi-danmaku-video-player__control-group--right) {
    gap: 2px;
  }

  .aoi-danmaku-video-player__controls :deep(.aoi-danmaku-video-player__control-group--right .aoi-icon-button) {
    --aoi-icon-action-size: 28px;
    width: 28px;
    height: 32px;
  }

  .aoi-danmaku-video-player__controls :deep(.aoi-danmaku-video-player__anchor--rate) {
    width: 50px;
  }

  .aoi-danmaku-video-player__controls :deep(.aoi-danmaku-video-player__rate-button) {
    width: 50px;
    min-width: 50px;
    max-width: 50px;
    --md-filled-tonal-button-leading-space: 8px;
    --md-filled-tonal-button-trailing-space: 8px;
    --md-filled-tonal-button-with-leading-icon-leading-space: 8px;
    --md-filled-tonal-button-with-leading-icon-trailing-space: 8px;
  }

  .aoi-danmaku-video-player__controls :deep(.aoi-danmaku-video-player__rate-button .aoi-icon) {
    display: none;
  }

  .aoi-danmaku-video-player__controls :deep(.aoi-danmaku-video-player__control--subtitle) {
    width: 38px;
  }

  .aoi-danmaku-video-player__controls :deep(.aoi-danmaku-video-player__subtitle-button) {
    width: 38px;
    min-width: 38px;
    max-width: 38px;
    font-size: 0;
    --md-filled-tonal-button-leading-space: 8px;
    --md-filled-tonal-button-trailing-space: 8px;
    --md-filled-tonal-button-with-leading-icon-leading-space: 8px;
    --md-filled-tonal-button-with-leading-icon-trailing-space: 8px;
  }

  .aoi-danmaku-video-player__controls :deep(.aoi-danmaku-video-player__subtitle-button .aoi-icon) {
    font-size: 15px !important;
  }
}

@media (max-width: 639px) {
  .aoi-danmaku-video-player__screen {
    min-height: 0;
  }

  .aoi-danmaku-video-player__controls {
    gap: 5px;
    opacity: 1;
    padding: 30px 6px 8px;
    pointer-events: auto;
    transform: none;
  }

  .aoi-danmaku-video-player__controls :deep(.aoi-danmaku-video-player__control-bar) {
    gap: 3px;
    grid-template-columns: auto minmax(0, 1fr) auto;
  }

  .aoi-danmaku-video-player :deep(.aoi-danmaku-video-player__composer) {
    width: 100%;
  }

  .aoi-danmaku-video-player__controls :deep(.aoi-danmaku-video-player__control-bar .aoi-icon-button) {
    --aoi-icon-action-size: 32px;
    width: 32px;
    height: 34px;
  }

  .aoi-danmaku-video-player__controls :deep(.aoi-danmaku-video-player__volume-control) {
    display: none;
  }

  .aoi-danmaku-video-player__controls :deep(.aoi-danmaku-video-player__spacer) {
    display: none;
  }

  .aoi-danmaku-video-player__controls :deep(.aoi-danmaku-video-player__control--web-fullscreen) {
    display: none;
  }

  .aoi-danmaku-video-player__controls :deep(.aoi-danmaku-video-player__anchor--rate) {
    width: 44px;
  }

  .aoi-danmaku-video-player__controls :deep(.aoi-danmaku-video-player__rate-button) {
    width: 44px;
    min-width: 44px;
    max-width: 44px;
    --md-filled-tonal-button-leading-space: 8px;
    --md-filled-tonal-button-trailing-space: 8px;
    --md-filled-tonal-button-with-leading-icon-leading-space: 8px;
    --md-filled-tonal-button-with-leading-icon-trailing-space: 8px;
  }

  .aoi-danmaku-video-player__controls :deep(.aoi-danmaku-video-player__rate-button .aoi-icon) {
    display: none;
  }

  .aoi-danmaku-video-player__panel-shell {
    inset: 8px 8px 92px;
    width: auto;
  }
}

@media (prefers-reduced-motion: reduce) {
  .aoi-danmaku-video-player__controls {
    transition: none;
    transform: none;
  }
}
</style>
