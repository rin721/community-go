<script setup lang="ts">
const props = withDefaults(defineProps<{
  modelValue?: boolean
  label?: string
  disabled?: boolean
}>(), {
  modelValue: false,
  label: undefined,
  disabled: false
})

const emit = defineEmits<{
  "update:modelValue": [value: boolean]
}>()

function onInput(event: Event) {
  emit("update:modelValue", (event.target as HTMLInputElement).checked)
}
</script>

<template>
  <label class="aoi-field-control">
    <md-checkbox
      :checked="modelValue || undefined"
      :disabled="disabled || undefined"
      @input="onInput"
    />
    <span v-if="label">{{ label }}</span>
  </label>
</template>
