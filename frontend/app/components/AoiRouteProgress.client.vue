<script setup lang="ts">
import NProgress from "nprogress"

const settings = useAppSettingsStore()
const nuxtApp = useNuxtApp()
const router = useRouter()

const nativeDuration = computed(() => Math.max(800, settings.effectiveRouteProgressSettings.speedMs * 8))

let startTimeout: number | undefined
let finishTimeout: number | undefined
let stateTimeout: number | undefined
let startedAt = 0

function clearStartTimeout() {
  if (startTimeout !== undefined) {
    window.clearTimeout(startTimeout)
    startTimeout = undefined
  }
}

function clearStateTimeout() {
  if (stateTimeout !== undefined) {
    window.clearTimeout(stateTimeout)
    stateTimeout = undefined
  }
}

function clearFinishTimeout() {
  if (finishTimeout !== undefined) {
    window.clearTimeout(finishTimeout)
    finishTimeout = undefined
  }
}

function setProgressState(state: "idle" | "loading" | "done" | "error" | "disabled") {
  document.documentElement.dataset.aoiRouteProgressState = state
}

function configureNProgress() {
  NProgress.configure({
    easing: settings.routeProgressEasing,
    minimum: settings.effectiveRouteProgressSettings.minimum,
    showSpinner: settings.routeProgressShowSpinner,
    speed: settings.effectiveRouteProgressSettings.speedMs,
    trickle: settings.routeProgressTrickle,
    trickleSpeed: settings.effectiveRouteProgressSettings.trickleSpeedMs
  })
}

function removeNProgress() {
  clearStartTimeout()
  clearFinishTimeout()
  clearStateTimeout()
  startedAt = 0
  NProgress.remove()
  setProgressState(settings.routeProgressEnabled ? "idle" : "disabled")
}

function startNProgress() {
  if (!settings.routeProgressEnabled) {
    removeNProgress()
    return
  }

  clearStateTimeout()
  clearFinishTimeout()
  configureNProgress()
  startedAt = Date.now()
  setProgressState("loading")
  NProgress.start()
}

function startRouteProgress() {
  clearStartTimeout()
  clearFinishTimeout()

  if (!settings.routeProgressEnabled) {
    removeNProgress()
    return
  }

  configureNProgress()

  if (settings.routeProgressDelayMs <= 0) {
    startNProgress()
    return
  }

  startTimeout = window.setTimeout(startNProgress, settings.routeProgressDelayMs)
}

function completeRouteProgress(error = false) {
  configureNProgress()
  setProgressState(error ? "error" : "done")

  if (NProgress.isStarted()) {
    NProgress.done()
  } else {
    NProgress.remove()
  }

  clearStateTimeout()
  stateTimeout = window.setTimeout(() => {
    if (document.documentElement.dataset.aoiRouteProgressState !== "loading") {
      setProgressState("idle")
    }
  }, settings.effectiveRouteProgressSettings.speedMs + 120)
}

function finishRouteProgress(error = false) {
  clearStartTimeout()

  if (!settings.routeProgressEnabled) {
    removeNProgress()
    return
  }

  const minimumVisibleMs = Math.min(360, Math.max(120, settings.effectiveRouteProgressSettings.speedMs))
  const elapsedMs = startedAt ? Date.now() - startedAt : minimumVisibleMs
  const remainingMs = NProgress.isStarted() ? minimumVisibleMs - elapsedMs : 0

  if (remainingMs > 0) {
    clearFinishTimeout()
    finishTimeout = window.setTimeout(() => {
      finishTimeout = undefined
      completeRouteProgress(error)
    }, remainingMs)
    return
  }

  completeRouteProgress(error)
}

const unhookLoadingStart = nuxtApp.hook("page:loading:start", startRouteProgress)
const unhookLoadingEnd = nuxtApp.hook("page:loading:end", () => finishRouteProgress())
const unhookVueError = nuxtApp.hook("vue:error", () => finishRouteProgress(true))
const unhookRouteStart = router.beforeEach(() => {
  startRouteProgress()
})
const unhookRouteEnd = router.afterEach((_to, _from, failure) => {
  finishRouteProgress(Boolean(failure))
})
const unhookRouteError = router.onError(() => {
  finishRouteProgress(true)
})

watch(() => [
  settings.routeProgressDelayMs,
  settings.routeProgressEasing,
  settings.routeProgressEnabled,
  settings.routeProgressMinimum,
  settings.routeProgressShowSpinner,
  settings.routeProgressSpeedMs,
  settings.routeProgressTrickle,
  settings.routeProgressTrickleSpeedMs,
  settings.settingDerivationStrengths.routeProgress
], () => {
  configureNProgress()

  if (!settings.routeProgressEnabled) {
    removeNProgress()
  } else if (!NProgress.isStarted()) {
    setProgressState("idle")
  }
}, { immediate: true })

onBeforeUnmount(() => {
  unhookLoadingStart()
  unhookLoadingEnd()
  unhookVueError()
  unhookRouteStart()
  unhookRouteEnd()
  unhookRouteError()
  removeNProgress()
})
</script>

<template>
  <NuxtLoadingIndicator
    class="aoi-route-progress-native"
    :color="false"
    :height="0"
    :throttle="settings.routeProgressDelayMs"
    :duration="nativeDuration"
    :hide-delay="0"
    :reset-delay="0"
  />
</template>
