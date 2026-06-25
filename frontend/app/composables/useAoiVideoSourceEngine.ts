import type { Ref } from "vue"
import type { VideoSourceKind, VideoSourceOption } from "~/types/api"

type AoiVideoEngineKind = "idle" | "native" | "hls-native" | "hls-js" | "dash"

type DashMediaPlayer = {
  initialize: (element: HTMLVideoElement, source: string, autoplay?: boolean) => void
  reset: () => void
  on?: (eventName: string, listener: (event: unknown) => void) => void
}

export interface AoiVideoSourceEngineError {
  source: VideoSourceOption
  message: string
  fatal?: boolean
  detail?: string
  cause?: unknown
}

export interface AoiVideoSourceAttachOptions {
  autoplay?: boolean
  currentTime?: number
  onError?: (error: AoiVideoSourceEngineError) => void
}

export function inferAoiVideoSourceKind(src: string, mimeType = ""): VideoSourceKind {
  const normalizedMime = mimeType.toLowerCase()
  const cleanSrc = src.split("?")[0]?.split("#")[0]?.toLowerCase() || ""

  if (normalizedMime.includes("mpegurl") || cleanSrc.endsWith(".m3u8")) {
    return "hls"
  }

  if (normalizedMime.includes("dash+xml") || cleanSrc.endsWith(".mpd")) {
    return "dash"
  }

  return "native"
}

function canPlayNativeHls(video: HTMLVideoElement) {
  return Boolean(
    video.canPlayType("application/vnd.apple.mpegurl")
      || video.canPlayType("application/x-mpegURL")
  )
}

function canPlayNativeSource(video: HTMLVideoElement, source: VideoSourceOption) {
  if (!source.mimeType) {
    return true
  }

  return Boolean(video.canPlayType(source.mimeType))
}

export function useAoiVideoSourceEngine(videoRef: Ref<HTMLVideoElement | null>) {
  const engineKind = ref<AoiVideoEngineKind>("idle")
  const attachedSource = shallowRef<VideoSourceOption | null>(null)
  const engineError = shallowRef<AoiVideoSourceEngineError | null>(null)
  const attaching = ref(false)

  let hlsInstance: InstanceType<typeof import("hls.js").default> | null = null
  let dashPlayer: DashMediaPlayer | null = null

  function reportError(
    source: VideoSourceOption,
    message: string,
    options: AoiVideoSourceAttachOptions,
    detail?: string,
    cause?: unknown,
    fatal?: boolean
  ) {
    const error = {
      cause,
      detail,
      fatal,
      message,
      source
    } satisfies AoiVideoSourceEngineError

    engineError.value = error
    options.onError?.(error)
  }

  function destroy() {
    hlsInstance?.destroy()
    hlsInstance = null

    dashPlayer?.reset()
    dashPlayer = null

    const video = videoRef.value

    if (video) {
      video.removeAttribute("src")
      video.load()
    }

    engineKind.value = "idle"
    attachedSource.value = null
  }

  function loadNativeSource(video: HTMLVideoElement, source: VideoSourceOption, kind: AoiVideoEngineKind) {
    video.src = source.src
    video.load()
    engineKind.value = kind
    attachedSource.value = source
  }

  async function attachNative(video: HTMLVideoElement, source: VideoSourceOption, options: AoiVideoSourceAttachOptions) {
    if (!canPlayNativeSource(video, source)) {
      reportError(source, "AOI_VIDEO_UNSUPPORTED_FORMAT", options, source.mimeType)
      return false
    }

    loadNativeSource(video, source, "native")
    return true
  }

  async function attachHls(video: HTMLVideoElement, source: VideoSourceOption, options: AoiVideoSourceAttachOptions) {
    if (canPlayNativeHls(video)) {
      loadNativeSource(video, source, "hls-native")
      return true
    }

    const hlsModule = await import("hls.js")
    const Hls = hlsModule.default

    if (!Hls.isSupported()) {
      reportError(source, "AOI_VIDEO_UNSUPPORTED_HLS", options)
      return false
    }

    const hls = new Hls({
      enableWorker: true
    })

    hls.on(Hls.Events.ERROR, (_, data) => {
      if (data.fatal) {
        reportError(source, "AOI_VIDEO_HLS_ERROR", options, data.details, data, true)
      }
    })

    hls.loadSource(source.src)
    hls.attachMedia(video)
    hlsInstance = hls
    engineKind.value = "hls-js"
    attachedSource.value = source

    return true
  }

  async function attachDash(video: HTMLVideoElement, source: VideoSourceOption, options: AoiVideoSourceAttachOptions) {
    const dashModule = await import("dashjs")
    const player = dashModule.MediaPlayer().create() as DashMediaPlayer

    player.on?.("error", (event) => {
      reportError(source, "AOI_VIDEO_DASH_ERROR", options, undefined, event, true)
    })
    player.initialize(video, source.src, false)
    dashPlayer = player
    engineKind.value = "dash"
    attachedSource.value = source

    return true
  }

  async function attachSource(source: VideoSourceOption, options: AoiVideoSourceAttachOptions = {}) {
    const video = videoRef.value

    if (!video || !import.meta.client) {
      return false
    }

    attaching.value = true
    engineError.value = null
    destroy()

    try {
      const attached = source.kind === "hls"
        ? await attachHls(video, source, options)
        : source.kind === "dash"
          ? await attachDash(video, source, options)
          : await attachNative(video, source, options)

      if (!attached) {
        return false
      }

      const resumeAt = Math.max(0, options.currentTime || 0)

      if (resumeAt > 0) {
        video.currentTime = resumeAt
      }

      if (options.autoplay) {
        await video.play()
      }

      return true
    } catch (cause) {
      reportError(source, "AOI_VIDEO_SOURCE_INIT_ERROR", options, undefined, cause, true)
      return false
    } finally {
      attaching.value = false
    }
  }

  onBeforeUnmount(destroy)

  return {
    attachedSource,
    attachSource,
    attaching,
    destroy,
    engineError,
    engineKind
  }
}
