<script setup lang="ts">
import type { AoiDanmakuItem } from "~/types/danmaku"
import type { AoiDanmakuRuntimeSettings } from "~/utils/aoiDanmaku"
import { filterAoiDanmakuItems } from "~/utils/aoiDanmaku"

const props = withDefaults(defineProps<{
  currentTime?: number
  items?: AoiDanmakuItem[]
  settings?: Partial<AoiDanmakuRuntimeSettings>
}>(), {
  currentTime: 0,
  items: () => [],
  settings: () => ({})
})

const emit = defineEmits<{
  seek: [seconds: number]
}>()

const { t } = useI18n()
const sortMode = ref<"time" | "newest">("time")
const collapsed = ref(false)
const visibleItems = computed(() => {
  const items = filterAoiDanmakuItems(props.items, {
    ...props.settings,
    enabled: true
  })

  return [...items].sort((a, b) => sortMode.value === "time"
    ? a.timeSeconds - b.timeSeconds
    : Date.parse(b.createdAt || "") - Date.parse(a.createdAt || ""))
})

function formatTime(seconds: number) {
  const minutes = Math.floor(seconds / 60)
  const rest = String(Math.floor(seconds % 60)).padStart(2, "0")

  return `${minutes}:${rest}`
}

function formatDate(value?: string) {
  if (!value) {
    return "-"
  }

  return new Intl.DateTimeFormat("zh-CN", {
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    month: "2-digit"
  }).format(new Date(value))
}
</script>

<template>
  <section class="aoi-danmaku-panel" :class="{ 'aoi-danmaku-panel--collapsed': collapsed }">
    <header class="aoi-danmaku-panel__header">
      <div>
        <h2>{{ t("player.danmakuList") }}</h2>
        <p>{{ t("player.danmakuListCount", { count: visibleItems.length }) }}</p>
      </div>
      <div class="aoi-danmaku-panel__actions">
        <AoiIconButton
          icon="arrow-up-down"
          :label="t('player.danmakuSort')"
          @click="sortMode = sortMode === 'time' ? 'newest' : 'time'"
        />
        <AoiIconButton
          :icon="collapsed ? 'chevron-down' : 'chevron-up'"
          :label="collapsed ? t('player.showPanel') : t('player.hidePanel')"
          @click="collapsed = !collapsed"
        />
      </div>
    </header>

    <div v-if="!collapsed" class="aoi-danmaku-panel__table" role="table" :aria-label="t('player.danmakuListAria')">
      <div class="aoi-danmaku-panel__row aoi-danmaku-panel__row--head" role="row">
        <span role="columnheader">{{ t("player.danmakuTime") }}</span>
        <span role="columnheader">{{ t("player.danmakuContent") }}</span>
        <span role="columnheader">{{ t("player.danmakuSentAt") }}</span>
      </div>
      <button
        v-for="item in visibleItems"
        :key="item.id"
        class="aoi-danmaku-panel__row"
        :class="{ 'aoi-danmaku-panel__row--active': Math.abs(item.timeSeconds - currentTime) < 2 }"
        type="button"
        role="row"
        @click="emit('seek', item.timeSeconds)"
      >
        <AoiRipple />
        <span role="cell">{{ formatTime(item.timeSeconds) }}</span>
        <strong role="cell">{{ item.body }}</strong>
        <span role="cell">{{ formatDate(item.createdAt) }}</span>
      </button>
      <p v-if="visibleItems.length === 0" class="aoi-danmaku-panel__empty">
        {{ t("player.danmakuEmpty") }}
      </p>
    </div>
  </section>
</template>

<style scoped>
.aoi-danmaku-panel {
  display: grid;
  min-height: 0;
  border: 1px solid var(--aoi-player-border);
  border-radius: 0;
  background: var(--aoi-player-surface);
  box-shadow: none;
  overflow: hidden;
}

.aoi-danmaku-panel__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  border-bottom: 1px solid var(--aoi-player-border);
  background: var(--aoi-player-surface-muted);
  padding: 8px 10px;
}

.aoi-danmaku-panel__header h2,
.aoi-danmaku-panel__header p {
  margin: 0;
}

.aoi-danmaku-panel__header h2 {
  color: var(--aoi-player-text);
  font-size: 13px;
  letter-spacing: 0;
}

.aoi-danmaku-panel__header p {
  color: var(--aoi-player-text-muted);
  font-size: 11px;
  font-weight: 680;
}

.aoi-danmaku-panel__actions {
  display: flex;
  gap: 2px;
}

.aoi-danmaku-panel__actions :deep(.aoi-icon-button) {
  --md-icon-button-icon-color: var(--aoi-player-text-muted);
  --md-icon-button-hover-icon-color: var(--aoi-player-accent);
}

.aoi-danmaku-panel__table {
  display: grid;
  max-height: 320px;
  overflow: auto;
  scrollbar-width: thin;
}

.aoi-danmaku-panel__row {
  position: relative;
  overflow: clip;
  display: grid;
  grid-template-columns: 48px minmax(0, 1fr) 76px;
  align-items: center;
  gap: 8px;
  border: 0;
  border-bottom: 1px solid color-mix(in srgb, var(--aoi-player-border) 72%, transparent);
  background: transparent;
  color: var(--aoi-player-text-muted);
  cursor: pointer;
  font: inherit;
  font-size: 11px;
  padding: 7px 10px;
  text-align: left;
  transition:
    background var(--aoi-motion-fast) var(--aoi-ease-out),
    color var(--aoi-motion-fast) var(--aoi-ease-out);
}

.aoi-danmaku-panel__row strong {
  min-width: 0;
  overflow: hidden;
  color: var(--aoi-player-text);
  font-weight: 700;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.aoi-danmaku-panel__row:hover {
  background: var(--aoi-player-surface-muted);
}

.aoi-danmaku-panel__row--head {
  position: sticky;
  top: 0;
  z-index: 1;
  background: var(--aoi-player-surface);
  cursor: default;
  font-weight: 760;
  color: var(--aoi-player-text-muted);
}

.aoi-danmaku-panel__row--active {
  background: var(--aoi-player-accent-soft);
  color: var(--aoi-player-accent);
}

.aoi-danmaku-panel__empty {
  margin: 0;
  color: var(--aoi-player-text-muted);
  padding: 14px 12px;
}

@media (max-width: 1100px) {
  .aoi-danmaku-panel__table {
    max-height: 260px;
  }
}
</style>
