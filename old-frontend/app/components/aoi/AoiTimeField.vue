<script setup lang="ts">
import type { AoiFieldAppearance } from "~/types/ui"

const props = withDefaults(defineProps<{
  modelValue?: string
  appearance?: AoiFieldAppearance
  label?: string
  supportingText?: string
  errorText?: string
  icon?: string
  disabled?: boolean
  min?: string
  max?: string
  step?: string | number
}>(), {
  disabled: false,
  errorText: undefined,
  icon: "clock",
  label: undefined,
  max: undefined,
  min: undefined,
  modelValue: "",
  step: undefined,
  supportingText: undefined,
  appearance: "filled"
})

const emit = defineEmits<{
  change: [value: string]
  "update:modelValue": [value: string]
}>()

const fieldRef = ref<{ focus?: () => void, showPicker?: () => void } | null>(null)

function update(value: string) {
  emit("update:modelValue", value)
  emit("change", value)
}

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
  <AoiTextField
    ref="fieldRef"
    :disabled="props.disabled"
    :error-text="props.errorText"
    :icon="props.icon"
    :label="props.label"
    :max="props.max"
    :min="props.min"
    :model-value="props.modelValue"
    :step="props.step"
    :supporting-text="props.supportingText"
    type="time"
    :appearance="props.appearance"
    @update:model-value="update"
  />
</template>
