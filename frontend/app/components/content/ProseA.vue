<script setup lang="ts">
const props = defineProps<{
  href?: string
  rel?: string
  target?: string
}>()

const isExternal = computed(() => Boolean(props.href && /^[a-z][a-z\d+\-.]*:\/\//i.test(props.href)))
</script>

<template>
  <AoiLink
    :href="isExternal ? props.href : undefined"
    :to="!isExternal ? props.href : undefined"
    :rel="props.rel"
    :target="props.target"
  >
    <slot />
  </AoiLink>
</template>
