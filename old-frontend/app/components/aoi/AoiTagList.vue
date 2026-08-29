<script setup lang="ts">
import type { AoiRevealProp, AoiTagItem, AoiTone } from "~/types/ui"

const props = withDefaults(defineProps<{
  ariaLabel?: string
  items: AoiTagItem[]
  prefix?: string
  reveal?: AoiRevealProp
  size?: "sm" | "md"
  tone?: AoiTone
}>(), {
  ariaLabel: undefined,
  tone: "muted",
  prefix: "",
  reveal: false,
  size: "md"
})

function tagTarget(item: AoiTagItem) {
  return item.to || item.href
}
</script>

<template>
  <div
    v-aoi-reveal="props.reveal"
    class="aoi-tag-list"
    :class="[`aoi-tag-list--${props.size}`, `aoi-tag-list--tone-${props.tone}`]"
    :aria-label="props.ariaLabel"
  >
    <template v-for="item in props.items" :key="item.value || item.label">
      <AoiLink
        v-if="tagTarget(item)"
        class="aoi-tag-list__item"
        :to="tagTarget(item)"
        :external="item.external"
        :target="item.target"
      >
        <AoiIcon v-if="item.icon" :name="item.icon" :size="14" decorative />
        {{ props.prefix }}{{ item.label }}
      </AoiLink>
      <span v-else class="aoi-tag-list__item">
        <AoiIcon v-if="item.icon" :name="item.icon" :size="14" decorative />
        {{ props.prefix }}{{ item.label }}
      </span>
    </template>
  </div>
</template>

<style scoped>
.aoi-tag-list {
  display: flex;
  min-width: 0;
  flex-wrap: wrap;
  gap: 8px;
}

.aoi-tag-list__item {
  display: inline-flex;
  min-height: 32px;
  align-items: center;
  gap: 5px;
  border: 1px solid var(--aoi-border);
  border-radius: var(--aoi-radius-control);
  background: var(--aoi-surface);
  color: var(--aoi-tag-color, var(--aoi-intent-secondary-color));
  font-size: 12px;
  font-weight: 800;
  padding: 5px 10px;
}

.aoi-tag-list--sm .aoi-tag-list__item {
  min-height: 30px;
  padding: 4px 9px;
}

.aoi-tag-list__item:hover {
  background: var(--aoi-state-hover);
}

.aoi-tag-list--tone-accent .aoi-tag-list__item {
  --aoi-tag-color: var(--aoi-intent-primary-color);
}

.aoi-tag-list--tone-muted .aoi-tag-list__item {
  --aoi-tag-color: var(--aoi-intent-secondary-color);
}

.aoi-tag-list--tone-neutral .aoi-tag-list__item {
  --aoi-tag-color: var(--aoi-intent-neutral-color);
}

.aoi-tag-list--tone-success .aoi-tag-list__item {
  --aoi-tag-color: var(--aoi-intent-success-color);
}

.aoi-tag-list--tone-warning .aoi-tag-list__item {
  --aoi-tag-color: var(--aoi-intent-warning-color);
}

.aoi-tag-list--tone-danger .aoi-tag-list__item {
  --aoi-tag-color: var(--aoi-intent-danger-color);
}

.aoi-tag-list--tone-info .aoi-tag-list__item {
  --aoi-tag-color: var(--aoi-intent-info-color);
}
</style>
