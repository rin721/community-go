<script setup lang="ts">
const props = withDefaults(defineProps<{
  modelValue?: number
  ariaLabel?: string
  disabled?: boolean
  label?: string
  max?: number
  min?: number
  step?: number
  contrast?: "default" | "inverse"
  compact?: boolean
}>(), {
  ariaLabel: undefined,
  compact: false,
  disabled: false,
  label: undefined,
  max: 100,
  min: 0,
  modelValue: 0,
  step: 1,
  contrast: "default"
})

const emit = defineEmits<{
  change: [value: number]
  "update:modelValue": [value: number]
}>()

function parseSliderValue(value: unknown) {
  if (value === "" || value === null || value === undefined) {
    return undefined
  }

  const numberValue = Number(value)

  return Number.isFinite(numberValue) ? numberValue : undefined
}

function readValue(event: Event) {
  const path = typeof event.composedPath === "function" ? event.composedPath() : [event.target]

  for (const item of path) {
    if (!item || typeof item !== "object") {
      continue
    }

    if ("value" in item) {
      const value = parseSliderValue((item as { value?: number | string }).value)

      if (value !== undefined) {
        return value
      }
    }

    if (item instanceof HTMLElement) {
      const value = parseSliderValue(item.getAttribute("value"))

      if (value !== undefined) {
        return value
      }
    }
  }

  return props.modelValue
}

function onInput(event: Event) {
  emit("update:modelValue", readValue(event))
}

function onChange(event: Event) {
  const value = readValue(event)

  emit("update:modelValue", value)
  emit("change", value)
}
</script>

<template>
  <label
    class="aoi-slider-field"
    :class="[
      `aoi-slider-field--${contrast}`,
      { 'aoi-slider-field--compact': compact }
    ]"
  >
    <span v-if="label" class="aoi-slider-field__label">{{ label }}</span>
    <md-slider
      class="aoi-slider"
      :value="modelValue"
      :min="min"
      :max="max"
      :step="step"
      :aria-label="ariaLabel || label"
      :disabled="disabled || undefined"
      @input="onInput"
      @change="onChange"
    />
  </label>
</template>

<style scoped>
.aoi-slider-field {
  display: grid;
  gap: 8px;
  color: var(--aoi-text);
}

.aoi-slider-field__label {
  color: var(--aoi-text-muted);
  font-size: 12px;
  font-weight: 720;
}

.aoi-slider {
  width: 100%;
  --md-slider-active-track-color: var(--aoi-slider-active, var(--aoi-accent-60));
  --md-slider-handle-color: var(--aoi-slider-active, var(--aoi-accent-60));
  --md-slider-inactive-track-color: var(--aoi-slider-inactive, var(--aoi-accent-20));
}

.aoi-slider-field--compact {
  gap: 4px;
}

.aoi-slider-field--inverse {
  --aoi-slider-active: var(--aoi-accent-40);
  --aoi-slider-inactive: rgba(255, 255, 255, .26);
  color: rgba(255, 255, 255, .86);
}

.aoi-slider-field--inverse .aoi-slider-field__label {
  color: rgba(255, 255, 255, .78);
}
</style>
