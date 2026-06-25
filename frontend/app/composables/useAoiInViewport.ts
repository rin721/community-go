type AoiMaybeRef<T> = T | { value: T }

export interface AoiInViewportOptions {
  root?: AoiMaybeRef<Element | null | undefined>
  rootMargin?: string
  threshold?: number | number[]
  once?: AoiMaybeRef<boolean>
  disabled?: AoiMaybeRef<boolean>
}

export function useAoiInViewport(
  target: AoiMaybeRef<Element | null | undefined>,
  options: AoiInViewportOptions = {}
) {
  const isSupported = ref(false)
  const isIntersecting = ref(false)
  const hasIntersected = ref(false)
  const entry = shallowRef<IntersectionObserverEntry | null>(null)
  let observer: IntersectionObserver | undefined

  function readValue<T>(value: AoiMaybeRef<T> | undefined): T | undefined {
    if (value && typeof value === "object" && "value" in value) {
      return value.value
    }

    return value
  }

  function stop() {
    observer?.disconnect()
    observer = undefined
  }

  function markVisible() {
    isIntersecting.value = true
    hasIntersected.value = true
  }

  function observe() {
    stop()

    if (!import.meta.client) {
      markVisible()
      return
    }

    const disabled = Boolean(readValue(options.disabled))

    if (disabled) {
      markVisible()
      return
    }

    isSupported.value = "IntersectionObserver" in window

    if (!isSupported.value) {
      markVisible()
      return
    }

    const element = readValue(target)

    if (!element) {
      return
    }

    observer = new IntersectionObserver((entries) => {
      const nextEntry = entries[0]

      if (!nextEntry) {
        return
      }

      entry.value = nextEntry
      isIntersecting.value = nextEntry.isIntersecting

      if (nextEntry.isIntersecting) {
        hasIntersected.value = true

        if (readValue(options.once) !== false) {
          stop()
        }
      }
    }, {
      root: readValue(options.root) || null,
      rootMargin: options.rootMargin || "0px",
      threshold: options.threshold ?? 0
    })

    observer.observe(element)
  }

  watch(() => [
    readValue(target),
    readValue(options.root),
    readValue(options.disabled),
    options.rootMargin,
    JSON.stringify(options.threshold ?? 0),
    readValue(options.once)
  ], () => {
    void nextTick(observe)
  }, {
    immediate: true,
    flush: "post"
  })

  onBeforeUnmount(stop)

  return {
    entry,
    hasIntersected,
    isIntersecting,
    isSupported,
    stop
  }
}
