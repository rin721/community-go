<script setup lang="ts">
import type { Category } from "~/types/api"

defineProps<{
  category: Category
  count?: number
}>()
</script>

<template>
  <AoiInfoCard
    class="category-card"
    :to="`/category/${category.slug}`"
    layout="inline"
    interactive
  >
    <template #media>
      <span class="category-card__swatch" :style="{ '--category-card-accent': category.accentColor || 'var(--aoi-accent-50)' }" />
    </template>
    <template #title>{{ category.name }}</template>
    <template v-if="category.description" #description>{{ category.description }}</template>
    <template v-if="typeof count === 'number'" #actions>
      <span class="category-card__count">{{ count }}</span>
    </template>
  </AoiInfoCard>
</template>

<style scoped>
.category-card {
  --aoi-info-card-media-size: 30px;
  width: min(100%, 260px);
  min-height: 78px;
  height: 100%;
}

.category-card :deep(.aoi-info-card__main) {
  align-items: center;
}

.category-card__swatch {
  width: 8px;
  height: 30px;
  border-radius: var(--aoi-radius-round);
  background: var(--category-card-accent);
  box-shadow: none;
}

.category-card :deep(.aoi-info-card__title) {
  font-size: 16px;
}

.category-card__count {
  display: inline-flex;
  min-width: 28px;
  height: 22px;
  align-items: center;
  justify-content: center;
  border-radius: var(--aoi-radius-control);
  background: color-mix(in srgb, var(--aoi-accent-10) 72%, transparent);
  color: var(--aoi-accent-60);
  font-size: 12px;
  font-weight: 800;
}
</style>
