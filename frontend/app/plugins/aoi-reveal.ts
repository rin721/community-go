import type { Directive } from "vue"
import type { AoiRevealDirectiveValue, AoiRevealController, AoiRevealRuntimeOptions } from "~/utils/aoiReveal"
import { createAoiRevealController } from "~/utils/aoiReveal"

export default defineNuxtPlugin((nuxtApp) => {
  if (!import.meta.client) {
    nuxtApp.vueApp.directive("aoi-reveal", {})
    return
  }

  const controllers = new WeakMap<HTMLElement, AoiRevealController>()
  const bindingValues = new WeakMap<HTMLElement, AoiRevealDirectiveValue>()
  const activeElements = new Set<HTMLElement>()
  const settings = useAppSettingsStore()

  function runtimeOptions(): AoiRevealRuntimeOptions {
    return {
      durationMs: settings.effectiveRevealMotionSettings.durationMs,
      distancePx: settings.effectiveRevealMotionSettings.distancePx,
      effect: settings.revealMotionEffect,
      enabled: settings.revealMotionEnabled,
      maxDelayMs: settings.effectiveRevealMotionSettings.maxDelayMs,
      replay: settings.revealMotionReplay,
      staggerMs: settings.effectiveRevealMotionSettings.staggerMs
    }
  }

  function refreshControllers() {
    const runtime = runtimeOptions()

    for (const element of activeElements) {
      controllers.get(element)?.update(bindingValues.get(element), runtime)
    }
  }

  const directive: Directive<HTMLElement, AoiRevealDirectiveValue> = {
    beforeUnmount(element) {
      controllers.get(element)?.stop()
      controllers.delete(element)
      bindingValues.delete(element)
      activeElements.delete(element)
    },
    mounted(element, binding) {
      bindingValues.set(element, binding.value)
      activeElements.add(element)
      controllers.set(element, createAoiRevealController(element, binding.value, runtimeOptions()))
    },
    updated(element, binding) {
      bindingValues.set(element, binding.value)
      const controller = controllers.get(element)

      if (controller) {
        controller.update(binding.value, runtimeOptions())
        return
      }

      activeElements.add(element)
      controllers.set(element, createAoiRevealController(element, binding.value, runtimeOptions()))
    }
  }

  nuxtApp.vueApp.directive("aoi-reveal", directive)

  watch(() => [
    settings.revealMotionEnabled,
    settings.revealMotionEffect,
    settings.revealMotionReplay,
    settings.revealMotionDurationMs,
    settings.revealMotionDistancePx,
    settings.revealMotionStaggerMs,
    settings.revealMotionMaxDelayMs,
    settings.settingDerivationStrengths.revealMotion
  ], refreshControllers)
})
