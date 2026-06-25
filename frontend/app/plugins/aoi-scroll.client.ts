import Lenis, { type ScrollToOptions } from "lenis"
import type { AoiScrollRuntime, AoiScrollTarget } from "~/utils/aoiScroll"
import {
  shouldAllowAoiNativeWheelScroll,
  shouldSkipAoiPageScrollEnhancement,
  toAoiRubberBandRatio,
  toAoiScrollDurationSeconds
} from "~/utils/aoiScroll"

declare module "#app" {
  interface NuxtApp {
    $aoiScroll: AoiScrollRuntime
  }
}

declare module "vue" {
  interface ComponentCustomProperties {
    $aoiScroll: AoiScrollRuntime
  }
}

export default defineNuxtPlugin((nuxtApp) => {
  const settings = useAppSettingsStore()
  const reducedMotionMedia = window.matchMedia("(prefers-reduced-motion: reduce)")
  const isReducedMotion = ref(reducedMotionMedia.matches)
  const isSmoothEnabled = ref(false)
  let lenis: Lenis | null = null
  let lenisKey = ""
  let rubberBandOffset = 0
  let rubberBandReleaseFrame = 0

  function shouldUseLenis() {
    return settings.hydrated && settings.smoothScrollEnabled && !isReducedMotion.value
  }

  function stopRubberBandRelease() {
    if (rubberBandReleaseFrame) {
      window.cancelAnimationFrame(rubberBandReleaseFrame)
      rubberBandReleaseFrame = 0
    }
  }

  function applyRubberBandOffset(offset: number, edge: "top" | "bottom" | "none") {
    const root = document.documentElement

    root.style.setProperty("--aoi-page-rubber-band-offset", `${offset.toFixed(2)}px`)
    root.dataset.aoiRubberBand = Math.abs(offset) > 0.1 ? "active" : "idle"
    root.dataset.aoiRubberBandEdge = edge
  }

  function resetRubberBand() {
    stopRubberBandRelease()
    rubberBandOffset = 0
    applyRubberBandOffset(0, "none")
  }

  function releaseRubberBand() {
    stopRubberBandRelease()

    const tick = () => {
      rubberBandOffset *= 0.78

      if (Math.abs(rubberBandOffset) < 0.24) {
        rubberBandOffset = 0
        applyRubberBandOffset(0, "none")
        rubberBandReleaseFrame = 0
        return
      }

      applyRubberBandOffset(
        rubberBandOffset,
        rubberBandOffset > 0 ? "top" : "bottom"
      )
      rubberBandReleaseFrame = window.requestAnimationFrame(tick)
    }

    rubberBandReleaseFrame = window.requestAnimationFrame(tick)
  }

  function onRubberBandWheel(event: WheelEvent) {
    if (
      !settings.hydrated
      || !settings.rubberBandEnabled
      || isReducedMotion.value
      || event.defaultPrevented
      || shouldAllowAoiNativeWheelScroll(event)
      || Math.abs(event.deltaY) <= Math.abs(event.deltaX)
      || shouldSkipAoiPageScrollEnhancement(event.target)
    ) {
      return
    }

    const scrollingElement = document.scrollingElement || document.documentElement
    const atTop = scrollingElement.scrollTop <= 0 && event.deltaY < 0
    const atBottom = scrollingElement.scrollTop + scrollingElement.clientHeight >= scrollingElement.scrollHeight - 1 && event.deltaY > 0

    if (!atTop && !atBottom) {
      return
    }

    const ratio = toAoiRubberBandRatio(settings.effectiveScrollSettings.rubberBand.strength)
    const maxOffset = settings.effectiveScrollSettings.rubberBand.maxOffsetPx

    stopRubberBandRelease()
    rubberBandOffset = Math.min(
      maxOffset,
      Math.max(-maxOffset, rubberBandOffset - (event.deltaY * ratio * 0.12))
    )
    applyRubberBandOffset(rubberBandOffset, atTop ? "top" : "bottom")
    releaseRubberBand()
  }

  function destroyLenis() {
    lenis?.destroy()
    lenis = null
    lenisKey = ""
    isSmoothEnabled.value = false
  }

  function createLenis() {
    if (!shouldUseLenis()) {
      destroyLenis()
      return
    }

    const duration = toAoiScrollDurationSeconds(settings.effectiveScrollSettings.smooth.durationMs)
    const nextKey = JSON.stringify({
      damping: settings.effectiveScrollSettings.smooth.damping,
      duration,
      enabled: settings.smoothScrollEnabled
    })

    if (lenis && lenisKey === nextKey) {
      return
    }

    destroyLenis()

    lenis = new Lenis({
      anchors: {
        duration
      },
      autoRaf: true,
      duration,
      lerp: settings.effectiveScrollSettings.smooth.damping,
      overscroll: false,
      prevent: (node) => shouldSkipAoiPageScrollEnhancement(node),
      smoothWheel: true,
      stopInertiaOnNavigate: true,
      syncTouch: false,
      virtualScroll: ({ deltaX, deltaY, event }) => {
        if (!(event instanceof WheelEvent)) {
          return true
        }

        return !shouldAllowAoiNativeWheelScroll({
          deltaX,
          deltaY,
          shiftKey: event.shiftKey,
          target: event.target
        })
      }
    })
    lenisKey = nextKey
    isSmoothEnabled.value = true
  }

  function refresh() {
    lenis?.resize()
  }

  function start() {
    lenis?.start()
  }

  function stop() {
    lenis?.stop()
  }

  function nativeScrollTo(target: AoiScrollTarget, options: ScrollToOptions = {}) {
    const behavior: ScrollBehavior = options.immediate || isReducedMotion.value ? "auto" : "smooth"
    const offset = options.offset || 0

    if (typeof target === "number") {
      window.scrollTo({ behavior, top: target + offset })
      return
    }

    if (typeof target === "string") {
      if (target === "top" || target === "start") {
        window.scrollTo({ behavior, top: 0 })
        return
      }

      if (target === "bottom" || target === "end") {
        const scrollingElement = document.scrollingElement || document.documentElement
        window.scrollTo({ behavior, top: scrollingElement.scrollHeight })
        return
      }

      const element = document.querySelector<HTMLElement>(target)

      if (element) {
        nativeScrollTo(element, options)
      }
      return
    }

    const top = target.getBoundingClientRect().top + window.scrollY + offset
    window.scrollTo({ behavior, top })
  }

  function scrollTo(target: AoiScrollTarget, options: ScrollToOptions = {}) {
    if (!lenis || !isSmoothEnabled.value) {
      nativeScrollTo(target, options)
      return
    }

    lenis.scrollTo(target, options)
  }

  function syncRuntime() {
    if (shouldUseLenis()) {
      createLenis()
    } else {
      destroyLenis()
    }

    if (!settings.rubberBandEnabled || isReducedMotion.value) {
      resetRubberBand()
    }
  }

  function onReducedMotionChange(event: MediaQueryListEvent) {
    isReducedMotion.value = event.matches
    syncRuntime()
  }

  const runtime: AoiScrollRuntime = {
    getLenis: () => lenis,
    isReducedMotion,
    isSmoothEnabled,
    refresh,
    scrollTo,
    start,
    stop
  }

  reducedMotionMedia.addEventListener("change", onReducedMotionChange)
  window.addEventListener("wheel", onRubberBandWheel, { passive: true })

  onNuxtReady(() => {
    syncRuntime()
    watch(() => [
      settings.hydrated,
      settings.smoothScrollEnabled,
      settings.smoothScrollDurationMs,
      settings.smoothScrollDamping,
      settings.rubberBandEnabled,
      settings.rubberBandStrength,
      settings.rubberBandMaxOffsetPx,
      settings.settingDerivationStrengths.smoothScroll,
      settings.settingDerivationStrengths.rubberBand
    ], syncRuntime)
  })

  nuxtApp.hook("page:finish", () => {
    window.requestAnimationFrame(refresh)
  })

  return {
    provide: {
      aoiScroll: runtime
    }
  }
})
