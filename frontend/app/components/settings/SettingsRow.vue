<script setup lang="ts">
withDefaults(defineProps<{
  description?: string
  title: string
}>(), {
  description: undefined
})
</script>

<template>
  <AoiSurface class="settings-row" surface="card" padding="md">
    <div class="settings-row__copy">
      <strong>{{ title }}</strong>
      <span v-if="description">{{ description }}</span>
    </div>
    <div class="settings-row__control">
      <slot />
    </div>
  </AoiSurface>
</template>

<style scoped>
.settings-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(var(--aoi-settings-control-min-width), .44fr);
  gap: var(--aoi-grid-gap);
  align-items: center;
}

.settings-row__copy {
  display: grid;
  min-width: 0;
  gap: max(4px, calc(var(--aoi-grid-gap-compact) - 8px));
}

.settings-row__copy strong,
.settings-row__copy span {
  margin: 0;
}

.settings-row__copy strong {
  color: var(--aoi-text);
}

.settings-row__copy span {
  color: var(--aoi-text-muted);
  line-height: 1.7;
}

.settings-row__control {
  display: flex;
  min-width: 0;
  align-items: center;
  justify-content: flex-end;
}

@media (max-width: 639px) {
  .settings-row {
    grid-template-columns: 1fr;
  }

  .settings-row__control {
    justify-content: start;
  }
}
</style>
