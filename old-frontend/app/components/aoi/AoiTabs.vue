<script setup lang="ts">
export interface AoiTabItem {
  value: string
  label: string
  icon?: string
}

const props = withDefaults(defineProps<{
  modelValue: string
  items: AoiTabItem[]
  ariaLabel?: string
}>(), {
  ariaLabel: undefined
})

const emit = defineEmits<{
  "update:modelValue": [value: string]
  change: [value: string]
}>()

const activeIndex = computed(() => Math.max(0, props.items.findIndex((item) => item.value === props.modelValue)))

function select(value: string) {
  emit("update:modelValue", value)
  emit("change", value)
}

function onChange(event: Event) {
  const target = event.target as HTMLElement & { activeTabIndex?: number }
  const item = props.items[target.activeTabIndex ?? activeIndex.value]
  if (item) {
    select(item.value)
  }
}
</script>

<template>
  <md-tabs
    class="aoi-tabs"
    :active-tab-index="activeIndex"
    :aria-label="ariaLabel"
    @change="onChange"
  >
    <md-primary-tab
      v-for="item in items"
      :key="item.value"
      @click="select(item.value)"
    >
      <AoiIcon v-if="item.icon" slot="icon" :name="item.icon" decorative />
      {{ item.label }}
    </md-primary-tab>
  </md-tabs>
</template>
