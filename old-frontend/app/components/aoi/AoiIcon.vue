<script setup lang="ts">
defineOptions({
  inheritAttrs: false
})

const props = withDefaults(defineProps<{
  name: string
  size?: number | string
  label?: string
  decorative?: boolean
}>(), {
  size: "1em",
  label: undefined,
  decorative: false
})

const resolvedName = computed(() => props.name.includes(":") ? props.name : `lucide:${props.name}`)
const resolvedSize = computed(() => typeof props.size === "number" ? `${props.size}px` : props.size)
const isHidden = computed(() => props.decorative || !props.label)
</script>

<template>
  <span
    v-bind="$attrs"
    class="aoi-icon"
    :style="{ fontSize: resolvedSize }"
    :aria-hidden="isHidden ? 'true' : undefined"
    :aria-label="!isHidden ? label : undefined"
    :role="!isHidden ? 'img' : undefined"
  >
    <Icon :name="resolvedName" />
  </span>
</template>
