export type AoiLayerKind = "sticky" | "nav" | "floating" | "menu" | "dialog" | "loading" | "cursor"

type AoiMaybeRef<T> = T | { value: T }

export interface AoiLayerOptions {
  base?: number
  id?: string
  step?: number
}

const AOI_LAYER_BASE: Record<AoiLayerKind, number> = {
  sticky: 20,
  nav: 40,
  floating: 60,
  menu: 80,
  dialog: 100,
  loading: 120,
  cursor: 140
}

const aoiLayerStacks = reactive<Record<AoiLayerKind, string[]>>({
  sticky: [],
  nav: [],
  floating: [],
  menu: [],
  dialog: [],
  loading: [],
  cursor: []
})

let aoiLayerSerial = 0

export function useAoiLayer(
  kind: AoiMaybeRef<AoiLayerKind>,
  active: AoiMaybeRef<boolean> = true,
  options: AoiLayerOptions = {}
) {
  const id = options.id || `aoi-layer-${++aoiLayerSerial}`
  let registeredKind: AoiLayerKind | null = null

  function readValue<T>(value: AoiMaybeRef<T>): T {
    if (value && typeof value === "object" && "value" in value) {
      return value.value
    }

    return value
  }

  function unregister() {
    if (!registeredKind) {
      return
    }

    const stack = aoiLayerStacks[registeredKind]
    const index = stack.indexOf(id)

    if (index !== -1) {
      stack.splice(index, 1)
    }

    registeredKind = null
  }

  function register(nextKind: AoiLayerKind) {
    if (registeredKind && registeredKind !== nextKind) {
      unregister()
    }

    const stack = aoiLayerStacks[nextKind]

    if (!stack.includes(id)) {
      stack.push(id)
    }

    registeredKind = nextKind
  }

  watch(() => [readValue(kind), readValue(active)] as const, ([nextKind, isActive]) => {
    if (!import.meta.client) {
      return
    }

    if (!isActive) {
      unregister()
      return
    }

    register(nextKind)
  }, {
    immediate: true
  })

  onBeforeUnmount(unregister)

  const activeIndex = computed(() => {
    const stack = aoiLayerStacks[readValue(kind)]

    return stack.indexOf(id)
  })
  const zIndex = computed(() => {
    const base = options.base ?? AOI_LAYER_BASE[readValue(kind)]
    const step = options.step ?? 2
    const index = Math.max(0, activeIndex.value)

    return base + index * step
  })
  const isTopmost = computed(() => {
    const stack = aoiLayerStacks[readValue(kind)]

    return stack[stack.length - 1] === id
  })
  const style = computed(() => readValue(active)
    ? { zIndex: String(zIndex.value) }
    : undefined)

  return {
    activeIndex,
    id,
    isTopmost,
    stacks: aoiLayerStacks,
    style,
    zIndex
  }
}
