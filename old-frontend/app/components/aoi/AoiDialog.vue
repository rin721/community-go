<script setup lang="ts">
const props = withDefaults(defineProps<{
  dismissible?: boolean
  open?: boolean
}>(), {
  dismissible: true,
  open: false
})

const emit = defineEmits<{
  "update:open": [value: boolean]
  cancel: [event: Event]
  closed: []
}>()

const layer = useAoiLayer("dialog", computed(() => props.open))

function onClosed() {
  emit("update:open", false)
  emit("closed")
}

function onCancel(event: Event) {
  emit("cancel", event)

  if (!props.dismissible) {
    event.preventDefault()
  }
}
</script>

<template>
  <md-dialog
    :open="props.open || undefined"
    :style="layer.style.value"
    @cancel="onCancel"
    @closed="onClosed"
  >
    <div slot="headline">
      <slot name="headline" />
    </div>
    <div slot="content">
      <slot />
    </div>
    <div slot="actions">
      <slot name="actions" />
    </div>
  </md-dialog>
</template>
