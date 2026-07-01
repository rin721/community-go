<script setup lang="ts">
const props = withDefaults(defineProps<{
  value: string
  title: string
  description?: string
  icon?: string
  selected?: boolean
  disabled?: boolean
  variant?: "card" | "compact"
}>(), {
  description: undefined,
  disabled: false,
  icon: undefined,
  selected: false,
  variant: "card"
})

const emit = defineEmits<{
  select: [value: string]
}>()

function select() {
  if (!props.disabled) {
    emit("select", props.value)
  }
}
</script>

<template>
  <button
    class="aoi-choice-card"
    :class="[
      `aoi-choice-card--${variant}`,
      { 'aoi-choice-card--selected': selected }
    ]"
    type="button"
    :aria-pressed="selected"
    :data-value="value"
    :disabled="disabled || undefined"
    @click="select"
  >
    <AoiRipple v-if="!disabled" />
    <span v-if="$slots.preview" class="aoi-choice-card__preview">
      <slot name="preview" />
    </span>
    <AoiIcon v-else-if="icon" class="aoi-choice-card__icon" :name="icon" :size="22" decorative />
    <span class="aoi-choice-card__copy">
      <strong>{{ title }}</strong>
      <span v-if="description">{{ description }}</span>
      <slot />
    </span>
  </button>
</template>

<style scoped>
.aoi-choice-card {
  position: relative;
  overflow: clip;
  display: grid;
  width: 100%;
  min-width: 0;
  justify-items: start;
  border: 1px solid var(--aoi-border);
  border-radius: var(--aoi-radius-card);
  background: var(--aoi-card-bg);
  color: var(--aoi-text);
  cursor: pointer;
  font: inherit;
  text-align: left;
  transition:
    background var(--aoi-motion-fast) var(--aoi-ease-out),
    border-color var(--aoi-motion-fast) var(--aoi-ease-out),
    color var(--aoi-motion-fast) var(--aoi-ease-out),
    transform var(--aoi-motion-fast) var(--aoi-ease-press);
}

.aoi-choice-card:hover {
  background: var(--aoi-state-hover);
}

.aoi-choice-card:active {
  transform: scale(.98);
}

.aoi-choice-card:disabled {
  cursor: not-allowed;
  opacity: .58;
  transform: none;
}

.aoi-choice-card--selected {
  border-color: var(--aoi-state-border-active);
  background: var(--aoi-state-active);
  color: var(--aoi-accent-60);
}

.aoi-choice-card--card {
  min-height: 104px;
  gap: 8px;
  padding: var(--aoi-card-padding);
}

.aoi-choice-card--compact {
  min-height: 48px;
  gap: 5px;
  padding: 10px;
}

.aoi-choice-card__icon {
  color: currentColor;
}

.aoi-choice-card__preview {
  display: block;
  width: 100%;
}

.aoi-choice-card__copy {
  display: grid;
  min-width: 0;
  gap: 5px;
}

.aoi-choice-card__copy strong {
  overflow: hidden;
  font-weight: 820;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.aoi-choice-card__copy span {
  color: var(--aoi-text-muted);
  line-height: 1.55;
}

.aoi-choice-card--selected .aoi-choice-card__copy span {
  color: color-mix(in srgb, currentColor 70%, var(--aoi-text-muted));
}
</style>
