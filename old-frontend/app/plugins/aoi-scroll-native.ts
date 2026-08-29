import type { Directive } from "vue"

const directive: Directive<HTMLElement, boolean | undefined> = {
  beforeMount(element, binding) {
    updateScrollNativeAttrs(element, binding.value)
  },
  updated(element, binding) {
    updateScrollNativeAttrs(element, binding.value)
  }
}

function updateScrollNativeAttrs(element: HTMLElement, value: boolean | undefined) {
  if (value === false) {
    element.removeAttribute("data-aoi-scroll-native")
    element.removeAttribute("data-lenis-prevent")
    return
  }

  element.setAttribute("data-aoi-scroll-native", "true")
  element.setAttribute("data-lenis-prevent", "")
}

export default defineNuxtPlugin((nuxtApp) => {
  nuxtApp.vueApp.directive("aoi-scroll-native", directive)
})
