<script setup lang="ts">
import type { HistoryEntry } from "~/types/library"

const props = defineProps<{
  entry: HistoryEntry
  index: number
  progressAriaLabel?: string
  progressLabel: string
  progressPercent: number
  viewedLabel: string
}>()
</script>

<template>
  <AoiReveal tag="article" class="history-entry-card" :index="props.index" variant="rise">
    <div class="history-entry-card__meta">
      <AoiMetaPill icon="clock-3">{{ props.viewedLabel }}</AoiMetaPill>
      <AoiMetaPill tone="accent">{{ props.progressLabel }}</AoiMetaPill>
    </div>
    <AoiProgressBar :value="props.progressPercent" :label="props.progressAriaLabel" />
    <VideoCard :video="props.entry.video" :index="props.index" />
  </AoiReveal>
</template>

<style scoped>
.history-entry-card {
  display: grid;
  min-width: 0;
  gap: 8px;
}

.history-entry-card__meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
}
</style>
