<script setup lang="ts">
import type { HistoryEntry } from "~/types/library"

const library = useLibraryStore()

const entries = computed(() => library.history)
const hasHistory = computed(() => library.hydrated && entries.value.length > 0)

function formatViewedAt(entry: HistoryEntry) {
  return new Intl.DateTimeFormat("zh-CN", {
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    month: "2-digit"
  }).format(new Date(entry.lastViewedAt))
}

function progressPercent(entry: HistoryEntry) {
  if (entry.video.durationSeconds <= 0) {
    return 0
  }

  return Math.min(100, Math.round(entry.progressSeconds / entry.video.durationSeconds * 100))
}

function formatProgress(entry: HistoryEntry) {
  const percent = progressPercent(entry)

  if (percent >= 95) {
    return "已看完"
  }

  if (entry.progressSeconds <= 0) {
    return "刚刚打开"
  }

  const minutes = Math.floor(entry.progressSeconds / 60)
  const seconds = String(entry.progressSeconds % 60).padStart(2, "0")

  return `继续观看 ${minutes}:${seconds}`
}

useHead({
  title: "History - Aoi"
})
</script>

<template>
  <div class="aoi-page">
    <PageHeader
      icon="history"
      title="历史"
      description="这里记录你在当前浏览器里打开和观看过的视频，包含本地播放进度。"
    >
      <template #actions>
        <AoiButton tone="accent"
          variant="outlined"
          icon="trash-2"
          :disabled="!hasHistory"
          @click="library.clearHistory()"
        >
          清空历史
        </AoiButton>
      </template>
    </PageHeader>

    <AoiContentGrid
      v-if="hasHistory"
      as="section"
      min-width="224px"
      gap="video"
      :mobile-columns="2"
      aria-label="最近观看"
    >
      <HistoryEntryCard
        v-for="(entry, index) in entries"
        :key="entry.video.id"
        :entry="entry"
        :index="index"
        :viewed-label="formatViewedAt(entry)"
        :progress-label="formatProgress(entry)"
        :progress-percent="progressPercent(entry)"
        progress-aria-label="观看进度"
      />
    </AoiContentGrid>

    <PageState
      v-else-if="library.hydrated"
      icon="clock"
      title="暂无历史记录"
      description="打开任意视频详情页后，这里会记录最近观看和播放进度。"
      action-icon="home"
      action-label="返回首页"
      @action="navigateTo('/')"
    />
  </div>
</template>
