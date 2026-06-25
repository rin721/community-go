<script setup lang="ts">
import type { AoiFieldAppearance } from "~/types/ui"

const props = withDefaults(defineProps<{
  modelValue?: string
  appearance?: AoiFieldAppearance
  label?: string
  placeholder?: string
  supportingText?: string
  errorText?: string
  icon?: string
  type?: string
  disabled?: boolean
  maxLength?: number
  min?: string
  max?: string
  step?: string | number
  multiline?: boolean
  rows?: number
}>(), {
  modelValue: "",
  appearance: "filled",
  label: undefined,
  placeholder: undefined,
  supportingText: undefined,
  errorText: undefined,
  icon: undefined,
  type: "text",
  disabled: false,
  max: undefined,
  maxLength: undefined,
  min: undefined,
  multiline: false,
  rows: undefined,
  step: undefined
})

const emit = defineEmits<{
  enter: [event: KeyboardEvent]
  keydown: [event: KeyboardEvent]
  "update:modelValue": [value: string]
}>()

const tagName = computed(() => props.appearance === "outlined" ? "md-outlined-text-field" : "md-filled-text-field")
const fieldRef = ref<(HTMLElement & { focus?: () => void, showPicker?: () => void, value?: string }) | null>(null)
let cleanupInternalControl: (() => void) | undefined

function onInput(event: Event) {
  const field = event.currentTarget as HTMLElement & { value?: string }
  const target = event.target as HTMLInputElement & { value?: string }

  emit("update:modelValue", readFieldValue(field, target))
}

function onKeydown(event: KeyboardEvent) {
  emit("keydown", event)

  if (event.key === "Enter") {
    emit("enter", event)
  }

  requestAnimationFrame(() => {
    emit("update:modelValue", readFieldValue())
  })
}

function readFieldValue(
  field: (HTMLElement & { value?: string }) | null = fieldRef.value,
  target?: HTMLInputElement & { value?: string }
) {
  const internalControl = field?.shadowRoot?.querySelector<HTMLInputElement | HTMLTextAreaElement>("input, textarea")

  return internalControl?.value ?? field?.value ?? target?.value ?? ""
}

function emitInternalValue() {
  emit("update:modelValue", readFieldValue())
}

function attachInternalControl() {
  cleanupInternalControl?.()

  const internalControl = fieldRef.value?.shadowRoot?.querySelector<HTMLInputElement | HTMLTextAreaElement>("input, textarea")

  if (!internalControl) {
    cleanupInternalControl = undefined
    return
  }

  internalControl.addEventListener("change", emitInternalValue)
  internalControl.addEventListener("input", emitInternalValue)
  internalControl.addEventListener("keyup", emitInternalValue)

  cleanupInternalControl = () => {
    internalControl.removeEventListener("change", emitInternalValue)
    internalControl.removeEventListener("input", emitInternalValue)
    internalControl.removeEventListener("keyup", emitInternalValue)
  }
}

onMounted(() => {
  nextTick(() => {
    attachInternalControl()
    window.setTimeout(attachInternalControl)
  })
})

onBeforeUnmount(() => {
  cleanupInternalControl?.()
})

function focus() {
  fieldRef.value?.focus?.()
}

function showPicker() {
  fieldRef.value?.showPicker?.()
}

defineExpose({
  focus,
  showPicker
})
</script>

<template>
  <component
    ref="fieldRef"
    :is="tagName"
    class="aoi-text-field"
    :value="modelValue"
    :label="label"
    :placeholder="placeholder"
    :supporting-text="supportingText"
    :error-text="errorText"
    :error="Boolean(errorText) || undefined"
    :type="multiline ? 'textarea' : type"
    :maxlength="maxLength"
    :max="max"
    :min="min"
    :rows="rows"
    :step="step"
    :disabled="disabled || undefined"
    @input="onInput"
    @change="onInput"
    @keydown="onKeydown"
  >
    <AoiIcon
      v-if="icon"
      slot="leading-icon"
      :name="icon"
      decorative
    />
  </component>
</template>
