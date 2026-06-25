<script setup lang="ts">
import type { CategoryTreeNode } from "~/types/api"

const { t } = useI18n()
const props = defineProps<{
  categories: CategoryTreeNode[]
  modelValue: string
}>()

const emit = defineEmits<{
  "update:modelValue": [value: string]
  change: [value: string]
}>()

const tabItems = computed(() => props.categories.map((category) => ({
  value: category.slug,
  label: category.name
})))

function change(value: string) {
  emit("update:modelValue", value)
  emit("change", value)
}
</script>

<template>
  <AoiScrollArea
    v-aoi-reveal="'fade'"
    class="category-tabs"
    axis="x"
    snap
    :aria-label="t('home.categoryTabsAria')"
  >
    <AoiTabs
      :model-value="modelValue"
      :items="tabItems"
      :aria-label="t('home.categoryTabsAria')"
      @update:model-value="change"
    />
  </AoiScrollArea>
</template>

<style scoped>
.category-tabs {
  margin: 0 calc(var(--aoi-category-tabs-bleed) * -1);
  padding: 0 var(--aoi-category-tabs-bleed) var(--aoi-category-tabs-bleed);
  scrollbar-width: none;
}

.category-tabs::-webkit-scrollbar {
  display: none;
}

.category-tabs :deep(md-tabs) {
  min-width: max-content;
}

.category-tabs :deep(md-primary-tab) {
  scroll-snap-align: start;
  scroll-snap-stop: normal;
}

@media (max-width: 639px) {
  .category-tabs {
    margin: 0 calc(var(--aoi-category-tabs-mobile-bleed) * -1);
    padding: 0 var(--aoi-category-tabs-mobile-bleed) var(--aoi-category-tabs-mobile-bleed);
  }
}
</style>
