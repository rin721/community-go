<script setup lang="ts">
export interface AoiSegmentedItem {
  value: string
  label: string
  description?: string
  icon?: string
  accent?: string
  disabled?: boolean
}

const props = withDefaults(defineProps<{
  modelValue: string
  items: AoiSegmentedItem[]
  ariaLabel?: string
  columns?: 2 | 3 | "auto"
  selectionRole?: "button" | "tab"
}>(), {
  ariaLabel: undefined,
  columns: "auto",
  selectionRole: "button"
})

const emit = defineEmits<{
  change: [value: string]
  "update:modelValue": [value: string]
}>()

const rootRole = computed(() => props.selectionRole === "tab" ? "tablist" : "group")

function select(item: AoiSegmentedItem) {
  if (item.disabled) {
    return
  }

  emit("update:modelValue", item.value)
  emit("change", item.value)
}
</script>

<template>
  <div
    class="aoi-segmented"
    :class="`aoi-segmented--columns-${columns}`"
    :role="rootRole"
    :aria-label="ariaLabel"
  >
    <button
      v-for="item in items"
      :key="item.value"
      class="aoi-segmented__item"
      :class="{ 'aoi-segmented__item--active': item.value === modelValue }"
      type="button"
      :role="selectionRole === 'tab' ? 'tab' : undefined"
      :aria-selected="selectionRole === 'tab' ? item.value === modelValue : undefined"
      :aria-pressed="selectionRole === 'button' ? item.value === modelValue : undefined"
      :data-value="item.value"
      :disabled="item.disabled || undefined"
      :style="{ '--aoi-segment-accent': item.accent || 'var(--aoi-accent-60)' }"
      @click="select(item)"
    >
      <AoiIcon v-if="item.icon" :name="item.icon" :size="18" decorative />
      <span>{{ item.label }}</span>
      <small v-if="item.description">{{ item.description }}</small>
    </button>
  </div>
</template>

<style scoped>
.aoi-segmented {
  display: grid;
  gap: 6px;
}

.aoi-segmented--columns-2 {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.aoi-segmented--columns-3 {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.aoi-segmented--columns-auto {
  grid-template-columns: repeat(auto-fit, minmax(0, 1fr));
}

.aoi-segmented__item {
  display: grid;
  min-width: 0;
  min-height: calc(var(--aoi-control-height-lg) + 30px);
  align-content: center;
  justify-items: start;
  border: 1px solid transparent;
  border-radius: var(--aoi-radius-choice);
  background: transparent;
  color: var(--aoi-text);
  cursor: pointer;
  font: inherit;
  gap: 4px;
  padding: 10px 12px;
  text-align: left;
  transition:
    background var(--aoi-action-motion-base) var(--aoi-ease-out),
    border-color var(--aoi-action-motion-base) var(--aoi-ease-out),
    color var(--aoi-action-motion-fast) var(--aoi-ease-out),
    transform var(--aoi-action-motion-base) var(--aoi-ease-press);
}

.aoi-segmented__item:hover {
  background: var(--aoi-state-hover);
}

.aoi-segmented__item:active {
  transform: scale(.98);
}

.aoi-segmented__item:disabled {
  cursor: not-allowed;
  opacity: .58;
  transform: none;
}

.aoi-segmented__item--active {
  border-color: color-mix(in srgb, var(--aoi-segment-accent) 34%, var(--aoi-border));
  background: color-mix(in srgb, var(--aoi-segment-accent) 10%, var(--aoi-surface-solid));
  color: var(--aoi-segment-accent);
}

.aoi-segmented__item span {
  overflow: hidden;
  font-weight: 800;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.aoi-segmented__item small {
  display: block;
  max-width: 100%;
  overflow: hidden;
  color: var(--aoi-text-muted);
  font-size: .78rem;
  font-weight: 640;
  line-height: 1.35;
  text-overflow: ellipsis;
  white-space: nowrap;
}

@media (max-width: 760px) {
  .aoi-segmented,
  .aoi-segmented--columns-2,
  .aoi-segmented--columns-3,
  .aoi-segmented--columns-auto {
    grid-template-columns: 1fr;
  }
}
</style>
