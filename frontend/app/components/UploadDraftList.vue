<script setup lang="ts">
import type { UploadDraft } from "~/types/upload"

const props = defineProps<{
  activeId?: string
  drafts: UploadDraft[]
}>()

const emit = defineEmits<{
  select: [id: string]
}>()
</script>

<template>
  <div class="upload-draft-list" aria-label="投稿草稿列表">
    <AoiChoiceCard
      v-for="draft in props.drafts"
      :key="draft.id"
      :value="draft.id"
      :title="draft.title || '未命名草稿'"
      :description="`${draft.status === 'queued-local' ? '已本地排队' : '草稿'} · ${draft.tags.length} 标签`"
      variant="compact"
      :selected="draft.id === props.activeId"
      @select="emit('select', $event)"
    />
  </div>
</template>

<style scoped>
.upload-draft-list {
  display: grid;
  gap: 8px;
}
</style>
