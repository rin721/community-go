<script setup lang="ts">
import type { AoiFieldAppearance } from "~/types/ui"

export interface AoiSelectOption {
  value: string
  label: string
  disabled?: boolean
}

type AoiSelectMenuPositioning = "absolute" | "fixed" | "popover"

const props = withDefaults(defineProps<{
  modelValue?: string
  options?: AoiSelectOption[]
  label?: string
  appearance?: AoiFieldAppearance
  disabled?: boolean
  menuPositioning?: AoiSelectMenuPositioning
}>(), {
  modelValue: "",
  options: () => [],
  label: undefined,
  appearance: "filled",
  disabled: false,
  menuPositioning: "popover"
})

const emit = defineEmits<{
  "update:modelValue": [value: string]
}>()

const tagName = computed(() => props.appearance === "outlined" ? "md-outlined-select" : "md-filled-select")
const menuOpen = ref(false)
const layer = useAoiLayer("menu", menuOpen)

function onChange(event: Event) {
  emit("update:modelValue", (event.target as HTMLSelectElement).value)
}

function onOpening() {
  menuOpen.value = true
}

function onClosed() {
  menuOpen.value = false
}
</script>

<template>
  <component
    :is="tagName"
    class="aoi-text-field"
    :value="modelValue"
    :label="label"
    :disabled="disabled || undefined"
    :menu-positioning="menuPositioning"
    :style="layer.style.value"
    @change="onChange"
    @opening="onOpening"
    @opened="onOpening"
    @closed="onClosed"
    @closing="onClosed"
  >
    <md-select-option
      v-for="option in options"
      :key="option.value"
      :value="option.value"
      :disabled="option.disabled || undefined"
    >
      <div slot="headline">{{ option.label }}</div>
    </md-select-option>
  </component>
</template>
