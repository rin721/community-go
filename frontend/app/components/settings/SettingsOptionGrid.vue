<script setup lang="ts">
const props = withDefaults(defineProps<{
  columns?: number
  minWidth?: string
}>(), {
  columns: undefined,
  minWidth: "var(--aoi-settings-card-min-width)"
})

const gridStyle = computed(() => ({
  "--settings-option-grid-columns": props.columns
    ? `repeat(${Math.max(1, props.columns)}, minmax(0, 1fr))`
    : `repeat(auto-fit, minmax(${props.minWidth}, 1fr))`
}))
</script>

<template>
  <div class="settings-option-grid" :style="gridStyle">
    <slot />
  </div>
</template>

<style scoped>
.settings-option-grid {
  display: grid;
  grid-template-columns: var(--settings-option-grid-columns);
  gap: var(--aoi-grid-gap-compact);
}

@media (max-width: 639px) {
  .settings-option-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>
