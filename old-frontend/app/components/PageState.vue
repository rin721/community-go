<script setup lang="ts">
withDefaults(defineProps<{
  actionIcon?: string
  actionLabel?: string
  description?: string
  icon?: string
  title: string
}>(), {
  actionIcon: undefined,
  actionLabel: undefined,
  description: undefined,
  icon: "info"
})

const emit = defineEmits<{
  action: []
}>()
</script>

<template>
  <section v-aoi-reveal class="page-state">
    <div class="page-state__icon" aria-hidden="true">
      <AoiIcon :name="icon" :size="24" decorative />
    </div>
    <div>
      <h2 class="page-state__title">{{ title }}</h2>
      <p v-if="description" class="page-state__description">{{ description }}</p>
    </div>
    <AoiButton tone="accent"
      v-if="actionLabel"
      variant="tonal"
      :icon="actionIcon"
      @click="emit('action')"
    >
      {{ actionLabel }}
    </AoiButton>
  </section>
</template>

<style scoped>
.page-state {
  display: grid;
  gap: 12px;
  justify-items: start;
  border: 1px solid var(--aoi-border);
  border-radius: var(--aoi-radius-sm);
  background: var(--aoi-surface);
  box-shadow: var(--aoi-shadow-sm);
  color: var(--aoi-text-muted);
  padding: 18px;
}

.page-state__icon {
  display: grid;
  width: 38px;
  height: 38px;
  place-items: center;
  border-radius: var(--aoi-radius-sm);
  background: var(--aoi-accent-10);
  color: var(--aoi-accent-60);
}

.page-state__title {
  margin: 0;
  color: var(--aoi-text);
  font-size: 17px;
}

.page-state__description {
  margin: 6px 0 0;
  line-height: 1.7;
}
</style>
