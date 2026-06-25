<script setup lang="ts">
export interface AoiButtonBoxItem {
  disabled?: boolean
  icon?: string
  label: string
  value: string
}

type AoiButtonBoxValue = string | string[]

const props = withDefaults(defineProps<{
  modelValue?: AoiButtonBoxValue
  items: AoiButtonBoxItem[]
  ariaLabel?: string
  disabled?: boolean
  multiselect?: boolean
  noCheckmark?: boolean
}>(), {
  ariaLabel: undefined,
  disabled: false,
  modelValue: "",
  multiselect: false,
  noCheckmark: false
})

const emit = defineEmits<{
  change: [value: AoiButtonBoxValue]
  "update:modelValue": [value: AoiButtonBoxValue]
}>()

const selectedValues = computed(() => {
  if (Array.isArray(props.modelValue)) {
    return props.modelValue
  }

  return props.modelValue ? [props.modelValue] : []
})

function isSelected(value: string) {
  return selectedValues.value.includes(value)
}

function selectItem(item: AoiButtonBoxItem) {
  if (item.disabled || props.disabled) {
    return
  }

  let nextValue: AoiButtonBoxValue

  if (props.multiselect) {
    const values = new Set(selectedValues.value)

    if (values.has(item.value)) {
      values.delete(item.value)
    } else {
      values.add(item.value)
    }

    nextValue = Array.from(values)
  } else {
    nextValue = item.value
  }

  emit("update:modelValue", nextValue)
  emit("change", nextValue)
}
</script>

<template>
  <md-outlined-segmented-button-set
    class="aoi-button-box"
    :aria-label="ariaLabel"
    :multiselect="multiselect || undefined"
  >
    <md-outlined-segmented-button
      v-for="item in items"
      :key="item.value"
      class="aoi-button-box__item"
      :disabled="disabled || item.disabled || undefined"
      :has-icon="Boolean(item.icon) || undefined"
      :label="item.label"
      :no-checkmark="noCheckmark || undefined"
      :selected="isSelected(item.value) || undefined"
      @click="selectItem(item)"
    >
      <AoiIcon
        v-if="item.icon"
        slot="icon"
        :name="item.icon"
        :size="18"
        decorative
      />
    </md-outlined-segmented-button>
  </md-outlined-segmented-button-set>
</template>

<style scoped>
.aoi-button-box {
  display: flex;
  width: 100%;
  min-width: 0;
  max-width: 100%;
  vertical-align: middle;
  --md-outlined-segmented-button-label-text-color: var(--aoi-text-muted);
  --md-outlined-segmented-button-selected-label-text-color: var(--aoi-active-color);
  --md-outlined-segmented-button-outline-color: var(--aoi-border);
  --md-outlined-segmented-button-selected-container-color: var(--aoi-state-active);
  --md-outlined-segmented-button-selected-outline-color: var(--aoi-state-border-active);
  --md-outlined-segmented-button-icon-color: var(--aoi-text-muted);
  --md-outlined-segmented-button-selected-icon-color: var(--aoi-active-color);
}

.aoi-button-box__item {
  min-width: 0;
  flex: 1 1 0;
}
</style>
