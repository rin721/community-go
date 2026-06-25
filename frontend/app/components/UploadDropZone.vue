<script setup lang="ts">
import type { UploadDraftSource } from "~/types/upload"

const props = defineProps<{
  chooseLabel: string
  emptyDescription: string
  emptyTitle: string
  formatBytes: (size: number) => string
  replaceLabel: string
  source: UploadDraftSource | null
}>()

const emit = defineEmits<{
  change: [files: File[]]
}>()
</script>

<template>
  <div class="upload-drop-zone">
    <div class="upload-drop-zone__icon" aria-hidden="true">
      <AoiIcon name="file-video" :size="28" decorative />
    </div>
    <div class="upload-drop-zone__copy">
      <strong>{{ props.source?.name || props.emptyTitle }}</strong>
      <span v-if="props.source">
        {{ props.formatBytes(props.source.size) }} · {{ props.source.type || "video/*" }}
      </span>
      <span v-else>{{ props.emptyDescription }}</span>
    </div>
    <AoiFileInput accept="video/*" @change="emit('change', $event)">
      <template #default="{ open }">
        <AoiButton tone="accent" variant="outlined" icon="folder-open" @click="open">
          {{ props.source ? props.replaceLabel : props.chooseLabel }}
        </AoiButton>
      </template>
    </AoiFileInput>
  </div>
</template>

<style scoped>
.upload-drop-zone {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  gap: var(--aoi-grid-gap);
  align-items: center;
  border: 1px dashed color-mix(in srgb, var(--aoi-accent-60) 42%, var(--aoi-border));
  border-radius: var(--aoi-radius-card);
  background: color-mix(in srgb, var(--aoi-accent-10) 58%, var(--aoi-surface));
  padding: var(--aoi-card-padding);
}

.upload-drop-zone__icon {
  display: grid;
  width: 46px;
  height: 46px;
  place-items: center;
  border-radius: var(--aoi-radius-card);
  background: var(--aoi-accent-10);
  color: var(--aoi-accent-60);
}

.upload-drop-zone__copy {
  display: grid;
  min-width: 0;
  gap: 5px;
}

.upload-drop-zone__copy strong {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.upload-drop-zone__copy span {
  color: var(--aoi-text-muted);
}

@media (max-width: 639px) {
  .upload-drop-zone {
    grid-template-columns: 1fr;
    justify-items: start;
  }
}
</style>
