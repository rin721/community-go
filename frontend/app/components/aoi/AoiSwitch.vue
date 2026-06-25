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
  emit("update:modelValue", Boolean((event.target as HTMLElement & { selected?: boolean }).selected))
}
</script>

<template>
  <label class="aoi-field-control">
    <md-switch
      :selected="modelValue || undefined"
      :disabled="disabled || undefined"
      @input="onInput"
    />
    <span v-if="label">{{ label }}</span>
  </label>
</template>
