<script setup lang="ts">
const props = withDefaults(defineProps<{
  modelValue?: string
  label: string
  disabled?: boolean
}>(), {
  disabled: false,
  modelValue: "#000000"
})

const emit = defineEmits<{
  change: [value: string]
  "update:modelValue": [value: string]
}>()

function update(event: Event) {
  const value = (event.target as HTMLInputElement).value

  emit("update:modelValue", value)
  emit("change", value)
}
</script>

<template>
  <label class="aoi-color-input">
    <AoiRipple v-if="!disabled" />
    <span class="aoi-color-input__swatch" :style="{ backgroundColor: modelValue }" />
    <input
      class="aoi-color-input__control"
      :value="modelValue"
      :aria-label="label"
      :disabled="disabled || undefined"
      type="color"
      @input="update"
      @change="update"
    >
  </label>
</template>

<style scoped>
.aoi-color-input {
  position: relative;
  display: inline-grid;
  width: 56px;
  height: 56px;
  place-items: center;
  border: 1px solid var(--aoi-border);
  border-radius: var(--aoi-radius-round);
  background: var(--aoi-surface-solid);
  cursor: pointer;
  overflow: hidden;
}

.aoi-color-input__swatch {
  width: 42px;
  height: 42px;
  border-radius: inherit;
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, .48);
}

.aoi-color-input__control {
  position: absolute;
  width: 1px;
  height: 1px;
  opacity: 0;
  pointer-events: none;
}
</style>
