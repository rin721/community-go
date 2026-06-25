<script setup lang="ts">
const props = withDefaults(defineProps<{
  code?: string
  filename?: string
  language?: string
}>(), {
  code: undefined,
  filename: undefined,
  language: undefined
})

const label = computed(() => props.filename || props.language || undefined)
</script>

<template>
  <div class="docs-prose-pre">
    <div v-if="props.filename || props.language" class="docs-prose-pre__meta">
      <span v-if="props.filename">{{ props.filename }}</span>
      <span v-if="props.language">{{ props.language }}</span>
    </div>
    <AoiCodeBlock :code="props.code" :label="label">
      <slot />
    </AoiCodeBlock>
  </div>
</template>

<style scoped>
.docs-prose-pre {
  display: grid;
  gap: 0;
  margin: 18px 0;
}

.docs-prose-pre__meta {
  display: flex;
  min-width: 0;
  justify-content: space-between;
  gap: 8px;
  border: 1px solid var(--aoi-border);
  border-bottom: 0;
  border-radius: var(--aoi-radius-card) var(--aoi-radius-card) 0 0;
  background: var(--aoi-surface-muted);
  color: var(--aoi-text-muted);
  font-size: 12px;
  font-weight: 760;
  padding: 8px 12px;
}

.docs-prose-pre :deep(.aoi-code-block) {
  border-top-left-radius: 0;
  border-top-right-radius: 0;
}
</style>
