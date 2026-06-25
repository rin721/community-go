<script setup lang="ts">
const props = withDefaults(defineProps<{
  accept?: string
  multiple?: boolean
  disabled?: boolean
}>(), {
  accept: undefined,
  disabled: false,
  multiple: false
})

const emit = defineEmits<{
  change: [files: File[]]
}>()

const inputRef = ref<HTMLInputElement | null>(null)

function open() {
  if (!props.disabled) {
    inputRef.value?.click()
  }
}

function onChange(event: Event) {
  const input = event.target as HTMLInputElement
  const files = Array.from(input.files || [])

  if (files.length) {
    emit("change", files)
  }

  input.value = ""
}

defineExpose({
  open
})
</script>

<template>
  <span class="aoi-file-input">
    <input
      ref="inputRef"
      class="aoi-file-input__control"
      type="file"
      :accept="accept"
      :multiple="multiple || undefined"
      :disabled="disabled || undefined"
      @change="onChange"
    >
    <slot :open="open" />
  </span>
</template>

<style scoped>
.aoi-file-input {
  display: contents;
}

.aoi-file-input__control {
  position: fixed;
  width: 1px;
  height: 1px;
  overflow: hidden;
  opacity: 0;
  pointer-events: none;
}
</style>
