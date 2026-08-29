<script setup lang="ts">
import type { UploadDraft } from "~/types/upload"

const props = defineProps<{
  activeId?: string
  drafts: UploadDraft[]
}>()

const emit = defineEmits<{
  select: [id: string]
}>()

const { t } = useI18n()

function draftStatusLabel(draft: UploadDraft) {
  if (draft.status === "submitted") {
    return t("upload.status.submitted")
  }
  return t("upload.status.draft")
}
</script>

<template>
  <div class="upload-draft-list" :aria-label="t('upload.draftList.ariaLabel')">
    <AoiChoiceCard
      v-for="draft in props.drafts"
      :key="draft.id"
      :value="draft.id"
      :title="draft.title || t('upload.draftList.untitled')"
      :description="`${draftStatusLabel(draft)} · ${t('upload.draftList.tagCount', { count: draft.tags.length })}`"
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
