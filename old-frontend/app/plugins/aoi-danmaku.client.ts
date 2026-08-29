import type { Directive } from "vue"
import type { AoiDanmakuDirectiveValue } from "~/utils/aoiDanmaku"
import { createAoiDanmakuRenderItems, normalizeAoiDanmakuSettings } from "~/utils/aoiDanmaku"

export default defineNuxtPlugin((nuxtApp) => {
  const layers = new WeakMap<HTMLElement, HTMLElement>()

  function ensureLayer(element: HTMLElement) {
    let layer = layers.get(element)

    if (layer) {
      return layer
    }

    element.classList.add("aoi-danmaku-host")
    layer = document.createElement("div")
    layer.className = "aoi-danmaku-directive-layer"
    layer.setAttribute("aria-hidden", "true")
    element.appendChild(layer)
    layers.set(element, layer)

    return layer
  }

  function render(element: HTMLElement, value?: AoiDanmakuDirectiveValue) {
    const layer = ensureLayer(element)

    layer.replaceChildren()

    if (!value) {
      return
    }

    const settings = normalizeAoiDanmakuSettings(value.settings)
    const renderItems = createAoiDanmakuRenderItems(value.items, value.currentTime, settings)

    layer.dataset.aoiDanmakuPlaying = value.playing ? "true" : "false"
    layer.style.setProperty("--aoi-danmaku-font-scale", String(settings.fontScale))
    layer.style.setProperty("--aoi-danmaku-opacity", String(settings.opacity))
    layer.style.setProperty("--aoi-danmaku-visible-area", `${settings.visibleArea}%`)

    for (const renderItem of renderItems) {
      const item = document.createElement("span")

      item.className = `aoi-danmaku-directive-item aoi-danmaku-directive-item--${renderItem.mode}`
      Object.entries(renderItem.style).forEach(([name, nextValue]) => {
        item.style.setProperty(name, nextValue)
      })
      item.textContent = renderItem.item.body
      layer.appendChild(item)
    }
  }

  const directive: Directive<HTMLElement, AoiDanmakuDirectiveValue> = {
    beforeUnmount(element) {
      layers.get(element)?.remove()
      layers.delete(element)
      element.classList.remove("aoi-danmaku-host")
    },
    mounted(element, binding) {
      render(element, binding.value)
    },
    updated(element, binding) {
      render(element, binding.value)
    }
  }

  nuxtApp.vueApp.directive("aoi-danmaku", directive)
})
