import type { PlayerPlaybackRate } from "~/types/player"

const STORAGE_KEY = "aoi.player.v1"
const PLAYBACK_RATES: PlayerPlaybackRate[] = [0.75, 1, 1.25, 1.5, 2]

interface PersistedPlayerSettings {
  muted: boolean
  playbackRate: PlayerPlaybackRate
  theaterMode: boolean
  volume: number
}

function clampVolume(value: number) {
  if (!Number.isFinite(value)) {
    return 0.8
  }

  return Math.min(1, Math.max(0, value))
}

function normalizePlaybackRate(value: unknown): PlayerPlaybackRate {
  return PLAYBACK_RATES.includes(value as PlayerPlaybackRate) ? value as PlayerPlaybackRate : 1
}

function emptyState(): PersistedPlayerSettings {
  return {
    muted: false,
    playbackRate: 1,
    theaterMode: false,
    volume: 0.8
  }
}

function coercePersistedState(value: unknown): PersistedPlayerSettings {
  if (!value || typeof value !== "object") {
    return emptyState()
  }

  const candidate = value as Partial<PersistedPlayerSettings>

  return {
    muted: typeof candidate.muted === "boolean" ? candidate.muted : false,
    playbackRate: normalizePlaybackRate(candidate.playbackRate),
    theaterMode: typeof candidate.theaterMode === "boolean" ? candidate.theaterMode : false,
    volume: clampVolume(typeof candidate.volume === "number" ? candidate.volume : 0.8)
  }
}

export const usePlayerSettingsStore = defineStore("player-settings", () => {
  const hydrated = ref(false)
  const muted = ref(false)
  const playbackRate = ref<PlayerPlaybackRate>(1)
  const theaterMode = ref(false)
  const volume = ref(0.8)

  function assignState(state: PersistedPlayerSettings) {
    muted.value = state.muted
    playbackRate.value = state.playbackRate
    theaterMode.value = state.theaterMode
    volume.value = state.volume
  }

  function persist() {
    if (!import.meta.client || !hydrated.value) {
      return
    }

    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify({
        muted: muted.value,
        playbackRate: playbackRate.value,
        theaterMode: theaterMode.value,
        volume: volume.value
      } satisfies PersistedPlayerSettings))
    } catch {
      // Local persistence is optional in the frontend prototype.
    }
  }

  function restore() {
    if (!import.meta.client) {
      return
    }

    try {
      const raw = window.localStorage.getItem(STORAGE_KEY)
      assignState(raw ? coercePersistedState(JSON.parse(raw)) : emptyState())
    } catch {
      assignState(emptyState())
    } finally {
      hydrated.value = true
    }
  }

  function setMuted(value: boolean) {
    muted.value = value
  }

  function setPlaybackRate(value: PlayerPlaybackRate) {
    playbackRate.value = normalizePlaybackRate(value)
  }

  function setTheaterMode(value: boolean) {
    theaterMode.value = value
  }

  function setVolume(value: number) {
    volume.value = clampVolume(value)

    if (volume.value > 0 && muted.value) {
      muted.value = false
    }
  }

  function resetPlayerSettings() {
    assignState(emptyState())

    if (import.meta.client) {
      try {
        window.localStorage.removeItem(STORAGE_KEY)
      } catch {
        // Local persistence is optional in the frontend prototype.
      }
    }
  }

  if (import.meta.client) {
    watch([muted, playbackRate, theaterMode, volume], persist)
  }

  return {
    hydrated,
    muted,
    playbackRate,
    playbackRates: PLAYBACK_RATES,
    resetPlayerSettings,
    restore,
    setMuted,
    setPlaybackRate,
    setTheaterMode,
    setVolume,
    theaterMode,
    volume
  }
})
