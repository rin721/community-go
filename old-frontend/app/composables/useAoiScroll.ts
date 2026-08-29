import type {
  AoiScrollRuntime,
  AoiScrollTarget,
  AoiScrollToOptions
} from "~/utils/aoiScroll"

const noopRuntime: AoiScrollRuntime = {
  getLenis: () => null,
  isReducedMotion: readonly(ref(false)),
  isSmoothEnabled: readonly(ref(false)),
  refresh: () => {},
  scrollTo: (target: AoiScrollTarget, options: AoiScrollToOptions = {}) => {
    if (!import.meta.client) {
      return
    }

    const behavior: ScrollBehavior = options.immediate ? "auto" : "smooth"

    if (typeof target === "number") {
      window.scrollTo({ behavior, top: target + (options.offset || 0) })
      return
    }

    if (typeof target === "string") {
      const element = document.querySelector<HTMLElement>(target)

      if (element) {
        element.scrollIntoView({ behavior, block: "start" })
      }
      return
    }

    target.scrollIntoView({ behavior, block: "start" })
  },
  start: () => {},
  stop: () => {}
}

export function useAoiScroll() {
  const nuxtApp = useNuxtApp()

  return (nuxtApp.$aoiScroll as AoiScrollRuntime | undefined) || noopRuntime
}
