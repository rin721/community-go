<script setup lang="ts">
import type { HistoryEntry } from "~/types/library"

const library = useLibraryStore()
const { locale, t } = useI18n()

const syncing = ref(false)
const entries = computed(() => library.history)
const hasHistory = computed(() => library.hydrated && entries.value.length > 0)
const canClearHistory = computed(() => hasHistory.value && !syncing.value)
const dateLocale = computed(() => {
  if (locale.value === "ja") {
    return "ja-JP"
  }
  if (locale.value === "en") {
    return "en-US"
  }
  return "zh-CN"
})

watch(() => library.hydrated, (hydrated) => {
  if (hydrated) {
    void refreshHistory()
  }
}, { immediate: true })

async function refreshHistory() {
  if (!library.hydrated || syncing.value) {
    return
  }

  syncing.value = true
  try {
    await library.syncHistoryWithBackend()
  } finally {
    syncing.value = false
  }
}

async function clearHistory() {
  if (!canClearHistory.value) {
    return
  }

  syncing.value = true
  try {
    await library.clearHistory()
  } finally {
    syncing.value = false
  }
}

function formatViewedAt(entry: HistoryEntry) {
  return new Intl.DateTimeFormat(dateLocale.value, {
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
    return t("history.progress.done")
  }

  if (entry.progressSeconds <= 0) {
    return t("history.progress.opened")
  }

  const minutes = Math.floor(entry.progressSeconds / 60)
  const seconds = String(entry.progressSeconds % 60).padStart(2, "0")

  return t("history.progress.continue", { time: `${minutes}:${seconds}` })
}

useHead(() => ({
  title: `${t("history.title")} - Aoi`
}))
</script>

<template>
  <div class="aoi-page">
    <PageHeader
      icon="history"
      :title="t('history.title')"
      :description="t('history.description')"
    >
      <template #actions>
        <AoiButton
          tone="accent"
          variant="outlined"
          icon="trash-2"
          :disabled="!canClearHistory"
          @click="clearHistory"
        >
          {{ syncing ? t("history.actions.syncing") : t("history.actions.clear") }}
        </AoiButton>
      </template>
    </PageHeader>

    <AoiButton
      class="history-mobile-action"
      tone="accent"
      variant="outlined"
      icon="trash-2"
      :disabled="!canClearHistory"
      @click="clearHistory"
    >
      {{ syncing ? t("history.actions.syncing") : t("history.actions.clear") }}
    </AoiButton>

    <AoiContentGrid
      v-if="hasHistory"
      as="section"
      min-width="224px"
      gap="video"
      :mobile-columns="2"
      :aria-label="t('history.gridAria')"
    >
      <HistoryEntryCard
        v-for="(entry, index) in entries"
        :key="entry.video.id"
        :entry="entry"
        :index="index"
        :viewed-label="formatViewedAt(entry)"
        :progress-label="formatProgress(entry)"
        :progress-percent="progressPercent(entry)"
        :progress-aria-label="t('history.progress.aria')"
      />
    </AoiContentGrid>

    <PageState
      v-else-if="library.hydrated"
      icon="clock"
      :title="t('history.empty.title')"
      :description="t('history.empty.description')"
      action-icon="home"
      :action-label="t('history.empty.action')"
      @action="navigateTo('/')"
    />
  </div>
</template>

<style scoped>
.history-mobile-action {
  display: none;
}

@media (max-width: 639px) {
  .history-mobile-action {
    display: inline-flex;
    width: 100%;
    margin: -4px 0 16px;
    justify-content: center;
  }
}
</style>
