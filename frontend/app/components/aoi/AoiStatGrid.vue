<script setup lang="ts">
import type { AoiRevealProp, AoiStatItem } from "~/types/ui"

const props = withDefaults(defineProps<{
  columns?: number
  items: AoiStatItem[]
  reveal?: AoiRevealProp
}>(), {
  columns: 4,
  reveal: false
})

const gridStyle = computed(() => ({
  "--aoi-stat-grid-columns": `repeat(${Math.max(1, props.columns)}, minmax(0, 1fr))`
}))
</script>

<template>
  <div v-aoi-reveal="props.reveal" class="aoi-stat-grid" :style="gridStyle">
    <AoiSurface
      v-for="item in props.items"
      :key="item.label"
      class="aoi-stat-grid__item"
      surface="card"
      padding="sm"
      :tone="item.tone || 'neutral'"
    >
      <span class="aoi-stat-grid__label">
        <AoiIcon v-if="item.icon" :name="item.icon" :size="15" decorative />
        {{ item.label }}
      </span>
      <strong>{{ item.value }}</strong>
      <small v-if="item.description">{{ item.description }}</small>
    </AoiSurface>
  </div>
</template>

<style scoped>
.aoi-stat-grid {
  display: grid;
  grid-template-columns: var(--aoi-stat-grid-columns);
  gap: var(--aoi-nav-group-gap);
}

.aoi-stat-grid__item {
  display: grid;
  gap: max(4px, calc(var(--aoi-grid-gap-compact) - 8px));
}

.aoi-stat-grid__label {
  display: inline-flex;
  min-width: 0;
  align-items: center;
  gap: 5px;
  color: var(--aoi-text-muted);
}

.aoi-stat-grid__item strong {
  overflow-wrap: anywhere;
  color: var(--aoi-text);
}

.aoi-stat-grid__item small {
  color: var(--aoi-text-muted);
  line-height: 1.5;
}

@media (max-width: 760px) {
  .aoi-stat-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 460px) {
  .aoi-stat-grid {
    grid-template-columns: 1fr;
  }
}
</style>
