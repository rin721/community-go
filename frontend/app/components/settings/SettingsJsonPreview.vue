<script setup lang="ts">
const props = withDefaults(defineProps<{
  code: string
  fallback: string
  note?: string
}>(), {
  note: undefined
})
</script>

<template>
  <div class="settings-json-preview">
    <p v-if="props.note" class="settings-note">{{ props.note }}</p>
    <AoiCodeBlock :code="props.code" :fallback="props.fallback" />
  </div>
</template>

<style scoped>
.settings-json-preview {
  display: grid;
  gap: var(--aoi-grid-gap-compact);
}
</style>
