<script setup lang="ts">
withDefaults(defineProps<{
  description?: string
  icon?: string
  id?: string
  title: string
}>(), {
  description: undefined,
  id: undefined,
  icon: undefined
})
</script>

<template>
  <AoiSurface :id="id" as="section" reveal="rise" surface="panel" padding="lg" class="settings-panel">
    <header class="settings-panel__header">
      <span v-if="icon" class="settings-panel__icon" aria-hidden="true">
        <AoiIcon :name="icon" :size="18" decorative />
      </span>
      <div class="settings-panel__copy">
        <h2>{{ title }}</h2>
        <p v-if="description">{{ description }}</p>
      </div>
      <div v-if="$slots.actions" class="settings-panel__actions">
        <slot name="actions" />
      </div>
    </header>

    <slot />
  </AoiSurface>
</template>

<style scoped>
.settings-panel {
  display: grid;
  gap: var(--aoi-grid-gap);
  scroll-margin-block-start: var(--aoi-settings-anchor-offset);
}

.settings-panel__header {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  gap: var(--aoi-grid-gap-compact);
  align-items: start;
}

.settings-panel__icon {
  display: inline-grid;
  width: var(--aoi-settings-panel-icon-size);
  height: var(--aoi-settings-panel-icon-size);
  place-items: center;
  border-radius: var(--aoi-radius-round);
  background: var(--aoi-accent-10);
  color: var(--aoi-accent-60);
}

.settings-panel__copy {
  display: grid;
  min-width: 0;
  gap: max(4px, calc(var(--aoi-grid-gap-compact) - 8px));
}

.settings-panel__copy h2,
.settings-panel__copy p {
  margin: 0;
}

.settings-panel__copy h2 {
  color: var(--aoi-text);
  font-size: var(--aoi-settings-panel-title-size);
}

.settings-panel__copy p {
  color: var(--aoi-text-muted);
  line-height: 1.7;
}

.settings-panel__actions {
  display: inline-flex;
  flex-wrap: wrap;
  gap: var(--aoi-grid-gap-compact);
  justify-content: end;
}

@media (max-width: 639px) {
  .settings-panel__header {
    grid-template-columns: 1fr;
  }

  .settings-panel__actions {
    justify-content: start;
  }
}
</style>
