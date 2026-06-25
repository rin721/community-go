<script setup lang="ts">
import type { AoiTone } from "~/types/ui"

const props = withDefaults(defineProps<{
  description?: string
  tone?: Extract<AoiTone, "danger" | "neutral">
  title: string
}>(), {
  description: undefined,
  tone: "neutral"
})
</script>

<template>
  <AoiSurface
    as="article"
    class="settings-data-action-card"
    surface="card"
    padding="sm"
    :tone="props.tone"
  >
    <div>
      <h3>{{ props.title }}</h3>
      <p v-if="props.description">{{ props.description }}</p>
    </div>
    <div v-if="$slots.actions" class="settings-data-action-card__actions">
      <slot name="actions" />
    </div>
  </AoiSurface>
</template>

<style scoped>
.settings-data-action-card {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: var(--aoi-grid-gap-compact);
  align-items: center;
}

.settings-data-action-card h3,
.settings-data-action-card p {
  margin: 0;
}

.settings-data-action-card h3 {
  font-size: 15px;
}

.settings-data-action-card p {
  color: var(--aoi-text-muted);
  line-height: 1.6;
}

.settings-data-action-card__actions {
  display: inline-flex;
  flex-wrap: wrap;
  gap: 8px;
  justify-content: flex-end;
}

@media (max-width: 639px) {
  .settings-data-action-card {
    grid-template-columns: 1fr;
  }

  .settings-data-action-card__actions {
    justify-content: flex-start;
  }
}
</style>
