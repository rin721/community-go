import type { Directive } from "vue"
import type { AoiImageClipboardDirectiveValue } from "~/utils/aoiImageClipboard"
import { collectImageFiles, collectImageFilesFromDataTransfer } from "~/utils/aoiImageClipboard"

interface AoiImageClipboardBindingState {
  input: HTMLInputElement
  options: ReturnType<typeof normalizeValue>
  cleanup: () => void
}

const states = new WeakMap<HTMLElement, AoiImageClipboardBindingState>()

function normalizeValue(value?: AoiImageClipboardDirectiveValue) {
  if (typeof value === "function") {
    return {
      accept: "image/*",
      disabled: false,
      multiple: true,
      onFiles: value,
      selectOnClick: true
    }
  }

  return {
    accept: value?.accept || "image/*",
    disabled: Boolean(value?.disabled),
    multiple: value?.multiple ?? true,
    onFiles: value?.onFiles,
    selectOnClick: value?.selectOnClick ?? true
  }
}

function updateInput(input: HTMLInputElement, options: ReturnType<typeof normalizeValue>) {
  input.accept = options.accept
  input.multiple = options.multiple
  input.disabled = options.disabled
}

function isInteractiveTarget(target: EventTarget | null) {
  return target instanceof Element && Boolean(target.closest([
    "a",
    "button",
    "input",
    "label",
    "md-elevated-button",
    "md-filled-button",
    "md-filled-icon-button",
    "md-filled-tonal-button",
    "md-filled-tonal-icon-button",
    "md-icon-button",
    "md-outlined-button",
    "md-outlined-icon-button",
    "md-outlined-segmented-button",
    "md-text-button",
    "select",
    "textarea"
  ].join(",")))
}

function setupDirective(element: HTMLElement, value?: AoiImageClipboardDirectiveValue) {
  states.get(element)?.cleanup()

  const input = document.createElement("input")
  let active = false
  const state: AoiImageClipboardBindingState = {
    input,
    options: normalizeValue(value),
    cleanup: () => undefined
  }

  updateInput(input, state.options)
  input.type = "file"
  input.tabIndex = -1
  input.style.position = "fixed"
  input.style.width = "1px"
  input.style.height = "1px"
  input.style.opacity = "0"
  input.style.pointerEvents = "none"
  input.style.inset = "0 auto auto 0"
  element.appendChild(input)
  element.classList.add("aoi-image-clipboard-host")

  const emitFiles = (
    files: File[],
    event: ClipboardEvent | DragEvent | Event,
    source: "drop" | "paste" | "select"
  ) => {
    if (!files.length || state.options.disabled || !state.options.onFiles) {
      return
    }

    state.options.onFiles({ event, files, source })
  }

  const onPaste = (event: ClipboardEvent) => {
    const files = collectImageFilesFromDataTransfer(event.clipboardData, state.options.accept, state.options.multiple)

    if (!files.length) {
      return
    }

    event.preventDefault()
    emitFiles(files, event, "paste")
  }

  const onDrop = (event: DragEvent) => {
    const files = collectImageFilesFromDataTransfer(event.dataTransfer, state.options.accept, state.options.multiple)

    if (!files.length) {
      return
    }

    event.preventDefault()
    emitFiles(files, event, "drop")
  }

  const onDragOver = (event: DragEvent) => {
    if (state.options.disabled) {
      return
    }

    if (collectImageFilesFromDataTransfer(event.dataTransfer, state.options.accept, state.options.multiple).length) {
      event.preventDefault()
    }
  }

  const onClick = (event: MouseEvent) => {
    if (!state.options.selectOnClick || state.options.disabled || isInteractiveTarget(event.target)) {
      return
    }

    input.click()
  }

  const onInput = (event: Event) => {
    emitFiles(collectImageFiles(input.files, state.options.accept, state.options.multiple), event, "select")
    input.value = ""
  }

  const activate = () => {
    if (!state.options.disabled) {
      active = true
      element.classList.add("aoi-image-clipboard-host--active")
    }
  }

  const deactivateIfOutsideFocus = () => {
    window.setTimeout(() => {
      if (!element.contains(document.activeElement)) {
        active = false
        element.classList.remove("aoi-image-clipboard-host--active")
      }
    })
  }

  const deactivate = () => {
    if (!element.contains(document.activeElement)) {
      active = false
      element.classList.remove("aoi-image-clipboard-host--active")
    }
  }

  const shouldHandleDocumentEvent = (event: Event) => {
    if (!active || state.options.disabled) {
      return false
    }

    return !(event.target instanceof Node && element.contains(event.target))
  }

  const onDocumentPaste = (event: ClipboardEvent) => {
    if (shouldHandleDocumentEvent(event)) {
      onPaste(event)
    }
  }

  const onDocumentDrop = (event: DragEvent) => {
    if (shouldHandleDocumentEvent(event)) {
      onDrop(event)
    }
  }

  const onDocumentDragOver = (event: DragEvent) => {
    if (shouldHandleDocumentEvent(event)) {
      onDragOver(event)
    }
  }

  element.addEventListener("paste", onPaste)
  element.addEventListener("drop", onDrop)
  element.addEventListener("dragover", onDragOver)
  element.addEventListener("click", onClick)
  element.addEventListener("mouseenter", activate)
  element.addEventListener("mouseleave", deactivate)
  element.addEventListener("focusin", activate)
  element.addEventListener("focusout", deactivateIfOutsideFocus)
  input.addEventListener("change", onInput)
  document.addEventListener("paste", onDocumentPaste)
  document.addEventListener("drop", onDocumentDrop)
  document.addEventListener("dragover", onDocumentDragOver)

  state.cleanup = () => {
    element.removeEventListener("paste", onPaste)
    element.removeEventListener("drop", onDrop)
    element.removeEventListener("dragover", onDragOver)
    element.removeEventListener("click", onClick)
    element.removeEventListener("mouseenter", activate)
    element.removeEventListener("mouseleave", deactivate)
    element.removeEventListener("focusin", activate)
    element.removeEventListener("focusout", deactivateIfOutsideFocus)
    input.removeEventListener("change", onInput)
    document.removeEventListener("paste", onDocumentPaste)
    document.removeEventListener("drop", onDocumentDrop)
    document.removeEventListener("dragover", onDocumentDragOver)
    input.remove()
    element.classList.remove("aoi-image-clipboard-host")
    element.classList.remove("aoi-image-clipboard-host--active")
  }
  states.set(element, state)
}

const directive: Directive<HTMLElement, AoiImageClipboardDirectiveValue> = {
  beforeUnmount(element) {
    states.get(element)?.cleanup()
    states.delete(element)
  },
  mounted(element, binding) {
    setupDirective(element, binding.value)
  },
  updated(element, binding) {
    const state = states.get(element)

    if (state) {
      state.options = normalizeValue(binding.value)
      updateInput(state.input, state.options)
    } else {
      setupDirective(element, binding.value)
    }
  }
}

export default defineNuxtPlugin((nuxtApp) => {
  nuxtApp.vueApp.directive("aoi-image-clipboard", directive)
})
