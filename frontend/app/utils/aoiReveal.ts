export type AoiRevealVariant = "pop" | "rise" | "fade" | "slide-left" | "slide-right"
export type AoiRevealMotionEffect = "contextual" | AoiRevealVariant
export type AoiRevealMotionReplay = "repeat" | "once"

export interface AoiRevealRuntimeOptions {
  durationMs: number
  distancePx: number
  effect: AoiRevealMotionEffect
  enabled: boolean
  maxDelayMs: number
  replay: AoiRevealMotionReplay
  staggerMs: number
}

export interface AoiRevealOptions {
  delay?: number | string
  disabled?: boolean
  distance?: number | string
  duration?: number | string
  index?: number
  maxDelay?: number
  once?: boolean
  rootMargin?: string
  stagger?: number
  threshold?: number | number[]
  variant?: AoiRevealVariant
}

export type AoiRevealDirectiveValue = AoiRevealVariant | AoiRevealOptions | false | null | undefined

export interface AoiRevealNormalizedOptions {
  delay: string
  disabled: boolean
  distance: string
  duration: string
  once: boolean
  rootMargin: string
  threshold: number | number[]
  variant: AoiRevealVariant
}

export interface AoiRevealController {
  stop: () => void
  update: (value?: AoiRevealDirectiveValue, runtime?: Partial<AoiRevealRuntimeOptions>) => void
}

export const AOI_REVEAL_DEFAULTS: AoiRevealRuntimeOptions = {
  durationMs: 360,
  distancePx: 18,
  effect: "contextual",
  enabled: true,
  maxDelayMs: 280,
  replay: "repeat",
  staggerMs: 35
}

const variants = new Set<AoiRevealVariant>(["pop", "rise", "fade", "slide-left", "slide-right"])
const effects = new Set<AoiRevealMotionEffect>(["contextual", ...variants])

function isRevealVariant(value: unknown): value is AoiRevealVariant {
  return typeof value === "string" && variants.has(value as AoiRevealVariant)
}

export function isAoiRevealMotionEffect(value: unknown): value is AoiRevealMotionEffect {
  return typeof value === "string" && effects.has(value as AoiRevealMotionEffect)
}

export function isAoiRevealMotionReplay(value: unknown): value is AoiRevealMotionReplay {
  return value === "repeat" || value === "once"
}

function toNumber(value: unknown, fallback: number) {
  const next = Number(value)

  return Number.isFinite(next) ? next : fallback
}

export function clampAoiRevealSetting(value: unknown, min: number, max: number, fallback: number) {
  return Math.min(max, Math.max(min, toNumber(value, fallback)))
}

export function normalizeAoiRevealRuntimeOptions(
  value: Partial<AoiRevealRuntimeOptions> = {}
): AoiRevealRuntimeOptions {
  return {
    durationMs: clampAoiRevealSetting(value.durationMs, 120, 800, AOI_REVEAL_DEFAULTS.durationMs),
    distancePx: clampAoiRevealSetting(value.distancePx, 0, 48, AOI_REVEAL_DEFAULTS.distancePx),
    effect: isAoiRevealMotionEffect(value.effect) ? value.effect : AOI_REVEAL_DEFAULTS.effect,
    enabled: typeof value.enabled === "boolean" ? value.enabled : AOI_REVEAL_DEFAULTS.enabled,
    maxDelayMs: clampAoiRevealSetting(value.maxDelayMs, 0, 600, AOI_REVEAL_DEFAULTS.maxDelayMs),
    replay: isAoiRevealMotionReplay(value.replay) ? value.replay : AOI_REVEAL_DEFAULTS.replay,
    staggerMs: clampAoiRevealSetting(value.staggerMs, 0, 120, AOI_REVEAL_DEFAULTS.staggerMs)
  }
}

function toDuration(value: number | string | undefined, fallback: string) {
  if (typeof value === "number") {
    return `${Math.max(0, value)}ms`
  }

  return value || fallback
}

function toDistance(value: number | string | undefined) {
  if (typeof value === "number") {
    return `${value}px`
  }

  return value || "var(--aoi-reveal-distance-md)"
}

function toDelay(value: number | string | undefined, index: number, stagger: number, maxDelay: number) {
  const staggerDelay = Math.min(Math.max(0, index) * Math.max(0, stagger), Math.max(0, maxDelay))

  if (typeof value === "string") {
    return value
  }

  return `${Math.max(0, value || 0) + staggerDelay}ms`
}

export function normalizeAoiRevealOptions(
  value?: AoiRevealDirectiveValue,
  runtime?: Partial<AoiRevealRuntimeOptions>
): AoiRevealNormalizedOptions {
  const global = normalizeAoiRevealRuntimeOptions(runtime)

  if (value === false) {
    return {
      delay: "0ms",
      disabled: true,
      distance: "var(--aoi-reveal-distance-md)",
      duration: "var(--aoi-motion-slow)",
      once: false,
      rootMargin: "0px 0px -8% 0px",
      threshold: 0.08,
      variant: "pop"
    }
  }

  const input = isRevealVariant(value)
    ? { variant: value }
    : value || {}
  const localVariant = isRevealVariant(input.variant) ? input.variant : "pop"
  const variant = global.effect === "contextual" ? localVariant : global.effect
  const index = toNumber(input.index, 0)
  const stagger = toNumber(input.stagger, global.staggerMs)
  const maxDelay = toNumber(input.maxDelay, global.maxDelayMs)

  return {
    delay: toDelay(input.delay, index, stagger, maxDelay),
    disabled: !global.enabled || Boolean(input.disabled),
    distance: toDistance(input.distance ?? global.distancePx),
    duration: toDuration(input.duration ?? global.durationMs, "var(--aoi-motion-slow)"),
    once: global.replay === "once" || Boolean(input.once),
    rootMargin: input.rootMargin || "0px 0px -8% 0px",
    threshold: input.threshold ?? 0.08,
    variant
  }
}

export function createAoiRevealStyle(options: AoiRevealNormalizedOptions) {
  return {
    "--aoi-reveal-delay": options.delay,
    "--aoi-reveal-distance": options.distance,
    "--aoi-reveal-duration": options.duration
  }
}

export function clearAoiRevealElement(element: HTMLElement) {
  element.classList.remove("aoi-reveal")
  element.removeAttribute("data-aoi-reveal")
  element.removeAttribute("data-aoi-reveal-ready")
  element.removeAttribute("data-aoi-reveal-state")
  element.removeAttribute("data-aoi-reveal-variant")
  element.style.removeProperty("--aoi-reveal-delay")
  element.style.removeProperty("--aoi-reveal-distance")
  element.style.removeProperty("--aoi-reveal-duration")
}

export function applyAoiRevealElement(
  element: HTMLElement,
  options: AoiRevealNormalizedOptions,
  state: "in" | "out"
) {
  element.classList.add("aoi-reveal")
  element.setAttribute("data-aoi-reveal", "true")
  element.setAttribute("data-aoi-reveal-ready", "true")
  element.setAttribute("data-aoi-reveal-state", state)
  element.setAttribute("data-aoi-reveal-variant", options.variant)

  const style = createAoiRevealStyle(options)
  element.style.setProperty("--aoi-reveal-delay", style["--aoi-reveal-delay"])
  element.style.setProperty("--aoi-reveal-distance", style["--aoi-reveal-distance"])
  element.style.setProperty("--aoi-reveal-duration", style["--aoi-reveal-duration"])
}

function createOptionsKey(options: AoiRevealNormalizedOptions) {
  return JSON.stringify(options)
}

export function createAoiRevealController(
  element: HTMLElement,
  initialValue?: AoiRevealDirectiveValue,
  initialRuntime?: Partial<AoiRevealRuntimeOptions>
): AoiRevealController {
  let hasIntersected = false
  let optionsKey = ""
  let observer: IntersectionObserver | undefined
  let options = normalizeAoiRevealOptions(initialValue, initialRuntime)

  function stopObserver() {
    observer?.disconnect()
    observer = undefined
  }

  function setState(state: "in" | "out") {
    applyAoiRevealElement(element, options, state)
  }

  function stop() {
    stopObserver()
    clearAoiRevealElement(element)
  }

  function update(value?: AoiRevealDirectiveValue, runtime?: Partial<AoiRevealRuntimeOptions>) {
    const nextOptions = normalizeAoiRevealOptions(value, runtime)
    const nextOptionsKey = createOptionsKey(nextOptions)

    if (nextOptionsKey === optionsKey) {
      return
    }

    options = nextOptions
    optionsKey = nextOptionsKey
    stopObserver()

    if (options.disabled) {
      clearAoiRevealElement(element)
      return
    }

    if (!("IntersectionObserver" in window)) {
      hasIntersected = true
      setState("in")
      return
    }

    setState(options.once && hasIntersected ? "in" : "out")

    observer = new IntersectionObserver(([entry]) => {
      if (!entry) {
        return
      }

      if (entry.isIntersecting) {
        hasIntersected = true
        setState("in")

        if (options.once) {
          stopObserver()
        }

        return
      }

      if (!options.once || !hasIntersected) {
        setState("out")
      }
    }, {
      root: null,
      rootMargin: options.rootMargin,
      threshold: options.threshold
    })

    observer.observe(element)
  }

  update(initialValue, initialRuntime)

  return {
    stop,
    update
  }
}
