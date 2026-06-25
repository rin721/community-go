<script setup lang="ts">
const props = withDefaults(defineProps<{
  type?: "linear" | "circular"
  indeterminate?: boolean
  value?: number
}>(), {
  type: "linear",
  indeterminate: false,
  value: undefined
})
</script>

<template>
  <md-circular-progress
    v-if="type === 'circular'"
    class="aoi-progress"
    :indeterminate="indeterminate || undefined"
    :value="value"
  />
  <md-linear-progress
    v-else
    class="aoi-progress"
    :indeterminate="indeterminate || undefined"
    :value="value"
  />
</template>
