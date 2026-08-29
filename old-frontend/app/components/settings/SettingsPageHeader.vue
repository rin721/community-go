<script setup lang="ts">
withDefaults(defineProps<{
  description?: string
  title: string
}>(), {
  description: undefined
})
</script>

<template>
  <header v-aoi-reveal="'rise'" class="settings-page-header">
    <div class="settings-page-header__copy">
      <h1>{{ title }}</h1>
      <p v-if="description">{{ description }}</p>
    </div>
    <div v-if="$slots.actions" class="settings-page-header__actions">
      <slot name="actions" />
    </div>
  </header>
</template>

<style scoped>
.settings-page-header {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 7px;
  align-items: start;
}

.settings-page-header__copy {
  display: grid;
  gap: 7px;
}

.settings-page-header__copy h1,
.settings-page-header__copy p {
  margin: 0;
}

.settings-page-header__copy h1 {
  color: var(--aoi-text);
  font-size: 24px;
  line-height: 1.2;
}

.settings-page-header__copy p {
  color: var(--aoi-text-muted);
  line-height: 1.7;
}

.settings-page-header__actions {
  display: inline-flex;
  flex-wrap: wrap;
  gap: var(--aoi-grid-gap-compact);
  justify-content: end;
}

@media (max-width: 639px) {
  .settings-page-header {
    grid-template-columns: 1fr;
  }

  .settings-page-header__actions {
    justify-content: start;
  }
}
</style>
