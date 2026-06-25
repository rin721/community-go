<script setup lang="ts" generic="T">
import { useId } from "vue"
import type { AoiDanmakuMapper, AoiDanmakuMode } from "~/types/danmaku"
import type { PlayerPlaybackRate } from "~/types/player"
import type { VideoSourceKind, VideoSourceOption } from "~/types/api"
import type { AoiDanmakuRuntimeSettings } from "~/utils/aoiDanmaku"

type AoiVideoPlayerSurfaceMode = "solid" | "translucent"
type PlayerHoverMenu = "rate" | "subtitle" | "settings"

type DanmakuComposerExpose = {
  focus: () => void
  toggleSettings: () => void
}

type AoiDanmakuVideoPlayerExpose = {
  exitFullscreen: () => Promise<void> | void
  pause: () => void
  play: () => Promise<void> | void
  reload: () => Promise<boolean> | void
  requestFullscreen: () => Promise<void> | void
  seekBy: (delta: number) => void
  seekTo: (seconds: number) => void
  setWebFullscreen: (value: boolean) => Promise<void> | void
  selectSource: (id: string) => void
  toggleFullscreen: () => Promise<void> | void
  togglePlay: () => Promise<void> | void
  toggleWebFullscreen: () => Promise<void> | void
}

type PlayerContextMenuItem = {
  value: string
  label: string
  icon?: string
  shortcut?: string
  disabled?: boolean
  checked?: boolean
  children?: PlayerContextMenuItem[]
}

type PlayerContextMenuGroup = {
  label: string
  items: PlayerContextMenuItem[]
}

type PlayerContextMenuContext = {
  controls: {
    selectSource: (id: string) => void
    setDanmakuEnabled: (value: boolean) => void
    setMuted: (value: boolean) => void
    setTheaterMode: (value: boolean) => void
    toggleFullscreen: () => Promise<void> | void
    togglePlay: () => Promise<void> | void
    toggleWebFullscreen: () => Promise<void> | void
  }
  selectedSource: VideoSourceOption | null
  sources: VideoSourceOption[]
  state: {
    currentTime: number
    danmakuEnabled: boolean
    isFullscreen: boolean
    isPlaying: boolean
    isWebFullscreen: boolean
    muted: boolean
    playbackRate: number
    theaterMode: boolean
  }
}

defineOptions({
  inheritAttrs: false
})

const props = withDefaults(defineProps<{
  ariaLabel?: string
  danmakuDisabled?: boolean
  danmakuEnabled?: boolean
  danmakuItems?: T[]
  danmakuMapper?: AoiDanmakuMapper<T>
  danmakuPanelOpen?: boolean
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
  surfaceMode?: AoiVideoPlayerSurfaceMode
  theaterMode?: boolean
  title?: string
  volume?: number
}>(), {
  ariaLabel: undefined,
  danmakuDisabled: false,
  danmakuEnabled: undefined,
  danmakuItems: () => [],
  danmakuMapper: undefined,
  danmakuPanelOpen: undefined,
  danmakuSettings: () => ({}),
  durationSeconds: 0,
  initialProgressSeconds: undefined,
  initialTimeSeconds: 0,
  keyboardShortcuts: true,
  muted: undefined,
  poster: undefined,
  preloadMargin: "200px 0px",
  sources: () => [],
  src: undefined,
  surfaceMode: "solid",
  theaterMode: undefined,
  title: undefined
})

const emit = defineEmits<{
  ended: []
  error: [error: unknown]
  "compose-request": []
  "duration-change": [seconds: number]
  progress: [seconds: number]
  "play-state-change": [playing: boolean]
  "send-danmaku": [payload: { body: string, color: string, mode: AoiDanmakuMode, timeSeconds: number }]
  "source-change": [source: VideoSourceOption]
  "time-change": [seconds: number]
  "update:danmakuEnabled": [value: boolean]
  "update:danmakuPanelOpen": [value: boolean]
  "update:muted": [value: boolean]
  "update:playbackRate": [value: number]
  "update:selectedSourceId": [value: string]
  "update:theaterMode": [value: boolean]
  "update:volume": [value: number]
}>()

const { t } = useI18n()
const playerSettings = usePlayerSettingsStore()
const playerRef = ref<AoiDanmakuVideoPlayerExpose | null>(null)
const composerRef = ref<DanmakuComposerExpose | null>(null)
const localDanmakuEnabled = ref(true)
const localMuted = ref(false)
const localPanelOpen = ref(false)
const localPlaybackRate = ref<PlayerPlaybackRate | number>(1)
const localSelectedSourceId = ref("")
const localTheaterMode = ref(false)
const localVolume = ref(0.8)
const rateMenuOpen = ref(false)
const settingsMenuOpen = ref(false)
const subtitleMenuOpen = ref(false)
const isFineHoverPointer = ref(false)
const playerContextMenuOpen = ref(false)
const playerContextMenuX = ref(0)
const playerContextMenuY = ref(0)
const playerContextMenuContext = shallowRef<PlayerContextMenuContext | null>(null)
const rateMenuAnchor = `${useId()}-rate`
const subtitleMenuAnchor = `${useId()}-subtitle`
const settingsMenuAnchor = `${useId()}-settings`
const hoverMenuCloseTimers = new Map<PlayerHoverMenu, ReturnType<typeof setTimeout>>()
let hoverPointerQuery: MediaQueryList | null = null

const aoiDanmakuSettings = useAoiDanmakuSettings(computed(() => props.danmakuSettings))
const resolvedDanmakuEnabled = computed(() => props.danmakuEnabled ?? localDanmakuEnabled.value)
const resolvedMuted = computed(() => props.muted ?? localMuted.value)
const resolvedPanelOpen = computed(() => props.danmakuPanelOpen ?? localPanelOpen.value)
const resolvedPlaybackRate = computed(() => props.playbackRate ?? localPlaybackRate.value)
const resolvedSelectedSourceId = computed(() => props.selectedSourceId ?? localSelectedSourceId.value)
const resolvedTheaterMode = computed(() => props.theaterMode ?? localTheaterMode.value)
const resolvedVolume = computed(() => props.volume ?? localVolume.value)
const danmakuAvailable = computed(() => aoiDanmakuSettings.value.enabled && !props.danmakuDisabled)
const effectiveDanmakuEnabled = computed(() => danmakuAvailable.value && resolvedDanmakuEnabled.value)
const effectiveDanmakuSettings = computed<AoiDanmakuRuntimeSettings>(() => ({
  ...aoiDanmakuSettings.value,
  enabled: effectiveDanmakuEnabled.value
}))
const rootClasses = computed(() => [
  "aoi-video-player",
  `aoi-video-player--surface-${props.surfaceMode}`
])
const rateMenuItems = computed(() => playerSettings.playbackRates.map((rate) => ({
  icon: Number(resolvedPlaybackRate.value) === rate ? "check" : "gauge",
  label: `${rate}x`,
  value: String(rate)
})))
const subtitleMenuItems = computed(() => [{
  disabled: true,
  icon: "captions-off",
  label: t("player.subtitleUnavailable"),
  value: "none"
}])
const playerSettingsMenuItems = computed(() => [{
  disabled: true,
  icon: "settings",
  label: t("player.playerSettingsUnavailable"),
  value: "none"
}])
const playerContextMenuGroups = computed<PlayerContextMenuGroup[]>(() => {
  const context = playerContextMenuContext.value

  if (!context) {
    return []
  }

  return [
    {
      label: t("player.contextPlayback"),
      items: [
        {
          icon: context.state.isPlaying ? "pause" : "play",
          label: context.state.isPlaying ? t("player.pause") : t("player.play"),
          shortcut: "Space",
          value: "toggle-play"
        },
        {
          icon: context.state.muted ? "volume-x" : "volume-2",
          label: context.state.muted ? t("player.unmute") : t("player.mute"),
          shortcut: "M",
          value: "toggle-mute"
        },
        {
          icon: "copy",
          label: t("player.copyCurrentTime"),
          value: "copy-time"
        }
      ]
    },
    {
      label: t("player.contextDanmaku"),
      items: [
        {
          checked: context.state.danmakuEnabled,
          disabled: !danmakuAvailable.value,
          icon: "message-square-text",
          label: context.state.danmakuEnabled ? t("player.hideDanmaku") : t("player.showDanmaku"),
          shortcut: "D",
          value: "toggle-danmaku"
        },
        {
          disabled: !danmakuAvailable.value,
          icon: "sliders-horizontal",
          label: t("player.danmakuSettings"),
          value: "danmaku-settings"
        },
        {
          checked: resolvedPanelOpen.value,
          icon: "panel-right-open",
          label: resolvedPanelOpen.value ? t("player.hidePanel") : t("player.showPanel"),
          value: "toggle-panel"
        }
      ]
    },
    {
      label: t("player.contextMedia"),
      items: [
        {
          children: context.sources.length ? context.sources.map((source) => ({
            checked: context.selectedSource?.id === source.id,
            icon: sourceIcon(source.kind),
            label: sourceDisplayLabel(source),
            value: `source:${source.id}`
          })) : [{
            disabled: true,
            icon: "video-off",
            label: t("player.sourceUnavailable"),
            value: "source:none"
          }],
          icon: "sliders-horizontal",
          label: t("player.source"),
          value: "source"
        },
        {
          children: playerSettings.playbackRates.map((rate) => ({
            checked: Number(context.state.playbackRate) === rate,
            icon: "gauge",
            label: `${rate}x`,
            value: `rate:${rate}`
          })),
          icon: "gauge",
          label: t("player.rate"),
          value: "rate"
        },
        {
          children: [{
            disabled: true,
            icon: "captions-off",
            label: t("player.subtitleUnavailable"),
            value: "subtitle:none"
          }],
          icon: "captions",
          label: t("player.subtitle"),
          value: "subtitle"
        }
      ]
    },
    {
      label: t("player.contextDisplay"),
      items: [
        {
          checked: context.state.theaterMode,
          icon: "panel-top",
          label: t("player.theater"),
          shortcut: "T",
          value: "toggle-theater"
        },
        {
          checked: context.state.isWebFullscreen,
          icon: context.state.isWebFullscreen ? "minimize-2" : "monitor",
          label: context.state.isWebFullscreen ? t("player.exitWebFullscreen") : t("player.webFullscreen"),
          shortcut: "W",
          value: "toggle-web-fullscreen"
        },
        {
          checked: context.state.isFullscreen,
          icon: context.state.isFullscreen ? "minimize" : "maximize",
          label: context.state.isFullscreen ? t("player.exitFullscreen") : t("player.fullscreen"),
          shortcut: "F",
          value: "toggle-fullscreen"
        }
      ]
    },
    {
      label: t("player.contextHelp"),
      items: [
        {
          children: [
            { disabled: true, label: t("player.shortcutPlayPause"), shortcut: "Space", value: "shortcut:play" },
            { disabled: true, label: t("player.shortcutSeek"), shortcut: "Left/Right", value: "shortcut:seek" },
            { disabled: true, label: t("player.shortcutDanmaku"), shortcut: "D", value: "shortcut:danmaku" },
            { disabled: true, label: t("player.shortcutCompose"), shortcut: "Enter", value: "shortcut:compose" },
            { disabled: true, label: t("player.shortcutFullscreen"), shortcut: "F", value: "shortcut:fullscreen" },
            { disabled: true, label: t("player.shortcutWebFullscreen"), shortcut: "W", value: "shortcut:web-fullscreen" }
          ],
          icon: "keyboard",
          label: t("player.keyboardShortcuts"),
          value: "keyboard-shortcuts"
        }
      ]
    }
  ]
})

function sourceIcon(kind: VideoSourceKind) {
  if (kind === "hls") {
    return "radio-tower"
  }

  if (kind === "dash") {
    return "network"
  }

  return "film"
}

function sourceDisplayLabel(source: VideoSourceOption | null) {
  if (!source) {
    return t("player.sourceUnavailable")
  }

  const primary = source.qualityLabel || (source.label === "Auto" ? t("player.sourceDefault") : source.label)
  const bits = [
    primary,
    source.bitrateKbps ? `${source.bitrateKbps} kbps` : ""
  ].filter(Boolean)

  return bits.join(" / ")
}

function playerErrorText(code: string | null | undefined) {
  const map: Record<string, string> = {
    dash: "player.errors.dash",
    hls: "player.errors.hls",
    load: "player.errors.load",
    noSource: "player.errors.noSource",
    play: "player.errors.load",
    sourceInit: "player.errors.sourceInit",
    unsupportedFormat: "player.errors.unsupportedFormat",
    unsupportedHls: "player.errors.unsupportedHls"
  }

  return t(map[code || ""] || "player.errors.load")
}

function setDanmakuEnabled(value: boolean) {
  if (!danmakuAvailable.value) {
    return
  }

  localDanmakuEnabled.value = value
  emit("update:danmakuEnabled", value)
}

function setPanelOpen(value: boolean) {
  localPanelOpen.value = value
  emit("update:danmakuPanelOpen", value)
}

function toggleDanmakuPanel() {
  setPanelOpen(!resolvedPanelOpen.value)
}

function setMuted(value: boolean) {
  localMuted.value = value
  emit("update:muted", value)
}

function setPlaybackRate(value: number) {
  const nextRate = playerSettings.playbackRates.includes(value as PlayerPlaybackRate) ? value : 1

  localPlaybackRate.value = nextRate
  emit("update:playbackRate", nextRate)
}

function setSelectedSourceId(value: string) {
  localSelectedSourceId.value = value
  emit("update:selectedSourceId", value)
}

function setTheaterMode(value: boolean) {
  localTheaterMode.value = value
  emit("update:theaterMode", value)
}

function setVolume(value: number) {
  const nextVolume = Math.min(1, Math.max(0, Number.isFinite(value) ? value : 0.8))

  localVolume.value = nextVolume
  emit("update:volume", nextVolume)
}

function selectPlaybackRate(value: string) {
  setPlaybackRate(Number(value))
  rateMenuOpen.value = false
}

function setPlayerHoverMenuOpen(menu: PlayerHoverMenu, value: boolean) {
  if (menu === "rate") {
    rateMenuOpen.value = value
  } else if (menu === "subtitle") {
    subtitleMenuOpen.value = value
  } else {
    settingsMenuOpen.value = value
  }
}

function isPlayerHoverMenuOpen(menu: PlayerHoverMenu) {
  if (menu === "rate") {
    return rateMenuOpen.value
  }

  if (menu === "subtitle") {
    return subtitleMenuOpen.value
  }

  return settingsMenuOpen.value
}

function clearPlayerHoverMenuTimer(menu: PlayerHoverMenu) {
  const timer = hoverMenuCloseTimers.get(menu)

  if (timer) {
    clearTimeout(timer)
    hoverMenuCloseTimers.delete(menu)
  }
}

function openPlayerHoverMenu(menu: PlayerHoverMenu) {
  clearPlayerHoverMenuTimer(menu)
  setPlayerHoverMenuOpen(menu, true)
}

function scheduleClosePlayerHoverMenu(menu: PlayerHoverMenu) {
  clearPlayerHoverMenuTimer(menu)

  if (!isFineHoverPointer.value) {
    return
  }

  hoverMenuCloseTimers.set(menu, setTimeout(() => {
    setPlayerHoverMenuOpen(menu, false)
    hoverMenuCloseTimers.delete(menu)
  }, 180))
}

function togglePlayerHoverMenu(menu: PlayerHoverMenu) {
  if (isFineHoverPointer.value) {
    openPlayerHoverMenu(menu)
    return
  }

  setPlayerHoverMenuOpen(menu, !isPlayerHoverMenuOpen(menu))
}

function closePlayerHoverMenus() {
  const menus: PlayerHoverMenu[] = ["rate", "subtitle", "settings"]

  for (const menu of menus) {
    clearPlayerHoverMenuTimer(menu)
    setPlayerHoverMenuOpen(menu, false)
  }
}

function updateFineHoverPointer() {
  isFineHoverPointer.value = Boolean(hoverPointerQuery?.matches)
}

function setVolumePercent(value: number) {
  setVolume(value / 100)
}

function setVolumeFromInput(event: Event) {
  const target = event.target

  if (!(target instanceof HTMLInputElement)) {
    return
  }

  const value = Number(target.value)

  if (Number.isFinite(value)) {
    setVolumePercent(value)
  }
}

function focusDanmakuComposer() {
  composerRef.value?.focus()
  emit("compose-request")
}

function formatPlayerClock(seconds: number) {
  const safeSeconds = Math.max(0, Math.floor(seconds))
  const hours = Math.floor(safeSeconds / 3600)
  const minutes = Math.floor(safeSeconds % 3600 / 60)
  const rest = safeSeconds % 60
  const padded = `${minutes}:${String(rest).padStart(2, "0")}`

  return hours > 0 ? `${hours}:${String(minutes).padStart(2, "0")}:${String(rest).padStart(2, "0")}` : padded
}

async function writeTextToClipboard(value: string) {
  if (!import.meta.client) {
    return
  }

  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value)
    return
  }

  const textarea = document.createElement("textarea")
  textarea.value = value
  textarea.setAttribute("readonly", "true")
  textarea.style.position = "fixed"
  textarea.style.opacity = "0"
  document.body.append(textarea)
  textarea.select()
  document.execCommand("copy")
  textarea.remove()
}

async function copyCurrentPlayerTime(seconds: number) {
  await writeTextToClipboard(formatPlayerClock(seconds))
}

function openPlayerContextMenu(event: MouseEvent, context: PlayerContextMenuContext) {
  closePlayerHoverMenus()
  playerContextMenuContext.value = context
  playerContextMenuX.value = event.clientX
  playerContextMenuY.value = event.clientY
  playerContextMenuOpen.value = true
}

function selectPlayerContextMenuAction(value: string) {
  const context = playerContextMenuContext.value

  if (!context) {
    return
  }

  if (value.startsWith("source:")) {
    const sourceId = value.slice("source:".length)

    if (sourceId !== "none") {
      context.controls.selectSource(sourceId)
    }
    return
  }

  if (value.startsWith("rate:")) {
    setPlaybackRate(Number(value.slice("rate:".length)))
    return
  }

  if (value === "toggle-play") {
    void context.controls.togglePlay()
  } else if (value === "toggle-mute") {
    setMuted(!context.state.muted)
  } else if (value === "copy-time") {
    void copyCurrentPlayerTime(context.state.currentTime)
  } else if (value === "toggle-danmaku") {
    setDanmakuEnabled(!context.state.danmakuEnabled)
  } else if (value === "danmaku-settings") {
    composerRef.value?.toggleSettings()
  } else if (value === "toggle-panel") {
    toggleDanmakuPanel()
  } else if (value === "toggle-theater") {
    setTheaterMode(!context.state.theaterMode)
  } else if (value === "toggle-web-fullscreen") {
    void context.controls.toggleWebFullscreen()
  } else if (value === "toggle-fullscreen") {
    void context.controls.toggleFullscreen()
  }
}

function onPlayerKeydown(event: KeyboardEvent) {
  if (event.key !== "Escape") {
    return
  }

  if (playerContextMenuOpen.value) {
    playerContextMenuOpen.value = false
  }

  closePlayerHoverMenus()
}

function forwardPlayState(value: boolean) {
  emit("play-state-change", value)
}

onMounted(() => {
  hoverPointerQuery = window.matchMedia("(hover: hover) and (pointer: fine)")
  updateFineHoverPointer()
  hoverPointerQuery.addEventListener("change", updateFineHoverPointer)
  document.addEventListener("keydown", onPlayerKeydown, true)
})

onBeforeUnmount(() => {
  hoverPointerQuery?.removeEventListener("change", updateFineHoverPointer)
  document.removeEventListener("keydown", onPlayerKeydown, true)
  closePlayerHoverMenus()
})

defineExpose({
  exitFullscreen: () => playerRef.value?.exitFullscreen(),
  focusDanmakuComposer,
  pause: () => playerRef.value?.pause(),
  play: () => playerRef.value?.play(),
  reload: () => playerRef.value?.reload(),
  requestFullscreen: () => playerRef.value?.requestFullscreen(),
  seekBy: (delta: number) => playerRef.value?.seekBy(delta),
  seekTo: (seconds: number) => playerRef.value?.seekTo(seconds),
  setWebFullscreen: (value: boolean) => playerRef.value?.setWebFullscreen(value),
  selectSource: (id: string) => playerRef.value?.selectSource(id),
  toggleDanmakuPanel,
  toggleFullscreen: () => playerRef.value?.toggleFullscreen(),
  togglePlay: () => playerRef.value?.togglePlay(),
  toggleWebFullscreen: () => playerRef.value?.toggleWebFullscreen()
})
</script>

<template>
  <AoiDanmakuVideoPlayer
    ref="playerRef"
    v-bind="$attrs"
    :class="rootClasses"
    :aria-label="ariaLabel"
    :src="src"
    :sources="sources"
    :poster="poster"
    :title="title"
    :duration-seconds="durationSeconds"
    :initial-progress-seconds="initialProgressSeconds"
    :initial-time-seconds="initialTimeSeconds"
    :selected-source-id="resolvedSelectedSourceId"
    :preload-margin="preloadMargin"
    :muted="resolvedMuted"
    :volume="resolvedVolume"
    :playback-rate="resolvedPlaybackRate"
    :theater-mode="resolvedTheaterMode"
    :danmaku-items="danmakuItems"
    :danmaku-mapper="danmakuMapper"
    :danmaku-enabled="effectiveDanmakuEnabled"
    :danmaku-settings="effectiveDanmakuSettings"
    :keyboard-shortcuts="keyboardShortcuts"
    @compose-request="focusDanmakuComposer"
    @context-menu="openPlayerContextMenu"
    @duration-change="emit('duration-change', $event)"
    @ended="emit('ended')"
    @error="emit('error', $event)"
    @progress="emit('progress', $event)"
    @play-state-change="forwardPlayState"
    @send-danmaku="emit('send-danmaku', $event)"
    @source-change="emit('source-change', $event)"
    @time-change="emit('time-change', $event)"
    @update:danmaku-enabled="setDanmakuEnabled"
    @update:muted="setMuted"
    @update:playback-rate="setPlaybackRate"
    @update:selected-source-id="setSelectedSourceId"
    @update:theater-mode="setTheaterMode"
    @update:volume="setVolume"
  >
    <template #overlay="{ state, selectedSource, controls }">
      <div v-if="(state.isLoading || state.engineAttaching) && !state.hasError" class="aoi-danmaku-video-player__overlay" @click.stop>
        <AoiProgress indeterminate />
        <span>{{ t("player.loading") }}</span>
      </div>

      <div v-else-if="state.hasError || !selectedSource" class="aoi-danmaku-video-player__overlay" @click.stop>
        <AoiIcon name="video-off" :size="32" decorative />
        <span>{{ playerErrorText(state.errorCode) }}</span>
        <AoiButton tone="accent" variant="tonal" size="sm" icon="refresh-cw" @click="controls.reload">
          {{ t("player.retry") }}
        </AoiButton>
      </div>

      <AoiMediaOverlayButton
        v-else-if="!state.isPlaying"
        :icon="state.isPlaying ? 'pause' : 'play'"
        :label="state.isPlaying ? t('player.pause') : t('player.play')"
        @click.stop="controls.togglePlay"
        @dblclick.stop="controls.toggleFullscreen"
      />
    </template>

    <template #controls="{ state, controls }">
      <AoiVideoTimeline
        class="aoi-danmaku-video-player__timeline"
        :current-time="state.currentTime"
        :duration="state.duration"
        :aria-label="t('player.controls')"
        @seek="controls.seekTo"
      />

      <div class="aoi-danmaku-video-player__control-bar" role="toolbar" :aria-label="t('player.controls')">
        <div class="aoi-danmaku-video-player__control-group aoi-danmaku-video-player__control-group--left">
          <AoiIconButton
            class="aoi-danmaku-video-player__control--play"
            :icon="state.isPlaying ? 'pause' : 'play'"
            :label="state.isPlaying ? t('player.pause') : t('player.play')"
            size="sm"
            @click="controls.togglePlay"
          />

          <div class="aoi-danmaku-video-player__volume-control">
            <AoiIconButton
              :class="[
                'aoi-danmaku-video-player__control--mute',
                { 'aoi-danmaku-video-player__control--state-on': state.muted }
              ]"
              :icon="state.muted || Math.round(state.volume * 100) === 0 ? 'volume-x' : 'volume-2'"
              :label="state.muted ? t('player.unmute') : t('player.mute')"
              size="sm"
              @click="controls.setMuted(!state.muted)"
            />

            <div
              class="aoi-danmaku-video-player__volume-popover"
              :style="{ '--aoi-player-volume-percent': `${Math.round(state.volume * 100)}%` }"
            >
              <div class="aoi-danmaku-video-player__volume-track" aria-hidden="true">
                <span class="aoi-danmaku-video-player__volume-fill">
                  <span class="aoi-danmaku-video-player__volume-value">
                    {{ Math.round(state.volume * 100) }}%
                  </span>
                </span>
              </div>
              <input
                class="aoi-danmaku-video-player__volume-range"
                type="range"
                :aria-label="t('player.volume')"
                :value="Math.round(state.volume * 100)"
                min="0"
                max="100"
                step="1"
                @input="setVolumeFromInput"
              >
            </div>
          </div>
        </div>

        <AoiDanmakuComposer
          ref="composerRef"
          class="aoi-danmaku-video-player__composer"
          :count="danmakuItems.length"
          :disabled="!danmakuAvailable"
          :enabled="state.danmakuEnabled"
          overlay
          :playing="state.isPlaying"
          @submit="controls.sendDanmaku"
          @toggle-enabled="setDanmakuEnabled(!state.danmakuEnabled)"
        />

        <div class="aoi-danmaku-video-player__control-group aoi-danmaku-video-player__control-group--right">
          <span
            :id="rateMenuAnchor"
            class="aoi-danmaku-video-player__anchor aoi-danmaku-video-player__anchor--rate"
            @focusin="openPlayerHoverMenu('rate')"
            @focusout="scheduleClosePlayerHoverMenu('rate')"
            @mouseenter="openPlayerHoverMenu('rate')"
            @mouseleave="scheduleClosePlayerHoverMenu('rate')"
            @click.stop="togglePlayerHoverMenu('rate')"
          >
            <AoiButton tone="accent"
              class="aoi-danmaku-video-player__menu-button aoi-danmaku-video-player__rate-button"
              variant="tonal"
              size="sm"
              icon="gauge"
              :aria-label="t('player.rate')"
            >
              {{ state.playbackRate }}x
            </AoiButton>
          </span>

          <span
            :id="subtitleMenuAnchor"
            class="aoi-danmaku-video-player__anchor aoi-danmaku-video-player__control--subtitle"
            @focusin="openPlayerHoverMenu('subtitle')"
            @focusout="scheduleClosePlayerHoverMenu('subtitle')"
            @mouseenter="openPlayerHoverMenu('subtitle')"
            @mouseleave="scheduleClosePlayerHoverMenu('subtitle')"
            @click.stop="togglePlayerHoverMenu('subtitle')"
          >
            <AoiButton tone="accent"
              class="aoi-danmaku-video-player__menu-button aoi-danmaku-video-player__subtitle-button"
              variant="tonal"
              size="sm"
              icon="captions"
              :aria-label="t('player.subtitle')"
            >
              {{ t("player.subtitle") }}
            </AoiButton>
          </span>

          <span
            :id="settingsMenuAnchor"
            class="aoi-danmaku-video-player__anchor aoi-danmaku-video-player__control--settings"
            @focusin="openPlayerHoverMenu('settings')"
            @focusout="scheduleClosePlayerHoverMenu('settings')"
            @mouseenter="openPlayerHoverMenu('settings')"
            @mouseleave="scheduleClosePlayerHoverMenu('settings')"
            @click.stop="togglePlayerHoverMenu('settings')"
          >
            <AoiIconButton
              icon="settings"
              :label="t('player.playerSettings')"
              size="sm"
            />
          </span>

          <AoiIconButton
            :class="[
              'aoi-danmaku-video-player__control--panel',
              { 'aoi-danmaku-video-player__control--state-on': resolvedPanelOpen }
            ]"
            :icon="resolvedPanelOpen ? 'panel-right-close' : 'panel-right-open'"
            :label="resolvedPanelOpen ? t('player.hidePanel') : t('player.showPanel')"
            size="sm"
            @click="toggleDanmakuPanel"
          />

          <AoiIconButton
            :class="[
              'aoi-danmaku-video-player__control--theater',
              { 'aoi-danmaku-video-player__control--state-on': state.theaterMode }
            ]"
            icon="panel-top"
            :label="t('player.theater')"
            size="sm"
            @click="controls.setTheaterMode(!state.theaterMode)"
          />

          <AoiIconButton
            :class="[
              'aoi-danmaku-video-player__control--web-fullscreen',
              { 'aoi-danmaku-video-player__control--state-on': state.isWebFullscreen }
            ]"
            :icon="state.isWebFullscreen ? 'minimize-2' : 'monitor'"
            :label="state.isWebFullscreen ? t('player.exitWebFullscreen') : t('player.webFullscreen')"
            size="sm"
            @click="controls.toggleWebFullscreen"
          />

          <AoiIconButton
            class="aoi-danmaku-video-player__control--fullscreen"
            :icon="state.isFullscreen ? 'minimize' : 'maximize'"
            :label="state.isFullscreen ? t('player.exitFullscreen') : t('player.fullscreen')"
            size="sm"
            @click="controls.toggleFullscreen"
          />
        </div>
      </div>

      <AoiMenu
        v-model:open="rateMenuOpen"
        class="aoi-danmaku-video-player__floating-menu"
        :anchor="rateMenuAnchor"
        :items="rateMenuItems"
        positioning="popover"
        @focusin="openPlayerHoverMenu('rate')"
        @focusout="scheduleClosePlayerHoverMenu('rate')"
        @mouseenter="openPlayerHoverMenu('rate')"
        @mouseleave="scheduleClosePlayerHoverMenu('rate')"
        @select="selectPlaybackRate"
      />

      <AoiMenu
        v-model:open="subtitleMenuOpen"
        class="aoi-danmaku-video-player__floating-menu"
        :anchor="subtitleMenuAnchor"
        :items="subtitleMenuItems"
        positioning="popover"
        @focusin="openPlayerHoverMenu('subtitle')"
        @focusout="scheduleClosePlayerHoverMenu('subtitle')"
        @mouseenter="openPlayerHoverMenu('subtitle')"
        @mouseleave="scheduleClosePlayerHoverMenu('subtitle')"
      />

      <AoiMenu
        v-model:open="settingsMenuOpen"
        class="aoi-danmaku-video-player__floating-menu"
        :anchor="settingsMenuAnchor"
        :items="playerSettingsMenuItems"
        positioning="popover"
        @focusin="openPlayerHoverMenu('settings')"
        @focusout="scheduleClosePlayerHoverMenu('settings')"
        @mouseenter="openPlayerHoverMenu('settings')"
        @mouseleave="scheduleClosePlayerHoverMenu('settings')"
      />
    </template>

    <template #panel="{ state, controls, danmakuItems: normalizedDanmakuItems }">
      <AoiDanmakuPanel
        v-if="resolvedPanelOpen"
        class="aoi-danmaku-video-player__panel"
        :current-time="state.currentTime"
        :items="normalizedDanmakuItems"
        :settings="effectiveDanmakuSettings"
        @seek="controls.seekTo"
      />
    </template>
  </AoiDanmakuVideoPlayer>

  <AoiPlayerContextMenu
    v-model:open="playerContextMenuOpen"
    :x="playerContextMenuX"
    :y="playerContextMenuY"
    :groups="playerContextMenuGroups"
    @select="selectPlayerContextMenuAction"
  />
</template>

<style scoped>
.aoi-video-player--surface-translucent {
  --aoi-player-surface: color-mix(in srgb, var(--aoi-surface-solid) 84%, transparent);
  --aoi-player-surface-muted: color-mix(in srgb, var(--aoi-surface-muted) 72%, transparent);
  --aoi-player-border: color-mix(in srgb, var(--aoi-border) 78%, transparent);
}

:global(:root.dark) .aoi-video-player--surface-translucent {
  --aoi-player-surface: color-mix(in srgb, var(--aoi-surface-solid) 88%, transparent);
  --aoi-player-surface-muted: color-mix(in srgb, var(--aoi-surface-muted) 78%, transparent);
}
</style>
