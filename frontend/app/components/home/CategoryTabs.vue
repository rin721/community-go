<script setup lang="ts">
import type { CategoryTreeNode } from "~/types/api"
import { AOI_ALL_CATEGORY } from "~/utils/communityCategories"

const { t } = useI18n()
const props = defineProps<{
  categories: CategoryTreeNode[]
  modelValue: string
}>()

const emit = defineEmits<{
  "update:modelValue": [value: string]
  change: [value: string]
}>()

const tabItems = computed(() => [
  {
    value: AOI_ALL_CATEGORY,
    label: t("home.allCategories")
  },
  ...props.categories.map((category) => ({
    value: category.slug,
    label: category.name
  }))
])

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
    <div class="category-tabs__list" role="list" :aria-label="t('home.categoryTabsAria')">
      <button
        v-for="item in tabItems"
        :key="item.value"
        class="category-tabs__item"
        :class="{ 'category-tabs__item--active': item.value === modelValue }"
        type="button"
        :aria-pressed="item.value === modelValue"
        @click="change(item.value)"
      >
        {{ item.label }}
      </button>
    </div>
  </AoiScrollArea>
</template>

<style scoped>
.category-tabs {
  margin: 0 calc(var(--aoi-category-tabs-bleed) * -1);
  padding: 0 var(--aoi-category-tabs-bleed) 14px;
  scrollbar-width: none;
}

.category-tabs::-webkit-scrollbar {
  display: none;
}

.category-tabs__list {
  display: flex;
  min-width: max-content;
  gap: 8px;
  padding: 2px 0;
}

.category-tabs__item {
  display: inline-flex;
  min-width: 82px;
  height: 38px;
  align-items: center;
  justify-content: center;
  border: 1px solid color-mix(in srgb, var(--aoi-surface-border) 12%, transparent);
  border-radius: var(--aoi-radius-round);
  appearance: none;
  background: color-mix(in srgb, var(--aoi-surface-solid) 24%, transparent);
  color: var(--aoi-text-muted);
  cursor: pointer;
  font: inherit;
  font-weight: 720;
  line-height: 1;
  padding: 0 18px;
  text-align: center;
  transition:
    background var(--aoi-motion-fast) var(--aoi-ease-out),
    border-color var(--aoi-motion-fast) var(--aoi-ease-out),
    color var(--aoi-motion-fast) var(--aoi-ease-out),
    transform var(--aoi-motion-fast) var(--aoi-ease-out);
  white-space: nowrap;
}

.category-tabs__item:hover {
  border-color: color-mix(in srgb, var(--aoi-active-color) 12%, transparent);
  background: color-mix(in srgb, var(--aoi-active-color) 7%, transparent);
  color: var(--aoi-text);
  transform: translateY(-1px);
}

.category-tabs__item:active {
  transform: translateY(0);
}

.category-tabs__item--active {
  border-color: color-mix(in srgb, var(--aoi-active-color) 18%, transparent);
  background: color-mix(in srgb, var(--aoi-active-color) 10%, transparent);
  color: var(--aoi-active-color);
  box-shadow: none;
}

@media (prefers-reduced-motion: reduce) {
  .category-tabs__item,
  .category-tabs__item:hover,
  .category-tabs__item:active {
    transform: none;
  }
}

@media (max-width: 639px) {
  .category-tabs {
    margin: 0 calc(var(--aoi-category-tabs-mobile-bleed) * -1);
    padding: 0 var(--aoi-category-tabs-mobile-bleed) 12px;
  }

  .category-tabs__list {
    gap: 7px;
  }

  .category-tabs__item {
    min-width: auto;
    height: 44px;
    padding: 0 14px;
  }
}
</style>
