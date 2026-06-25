<script setup lang="ts">
import type { VideoSummary } from "~/types/api"

const props = withDefaults(defineProps<{
  compact?: boolean
  linkUploader?: boolean
  video: VideoSummary
}>(), {
  compact: false,
  linkUploader: false
})

const settings = useAppSettingsStore()
const duration = computed(() => {
  const minutes = Math.floor(props.video.durationSeconds / 60).toString().padStart(2, "0")
  const seconds = (props.video.durationSeconds % 60).toString().padStart(2, "0")

  return `${minutes}:${seconds}`
})

const views = computed(() => {
  if (props.video.viewCount >= 1000) {
    return `${(props.video.viewCount / 1000).toFixed(1)}k`
  }

  return String(props.video.viewCount)
})

const publishedDate = computed(() => {
  const date = new Date(props.video.publishedAt)

  if (settings.useRelativeDates) {
    return formatRelativeDate(date)
  }

  return new Intl.DateTimeFormat("zh-CN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  }).format(date)
})

function formatRelativeDate(date: Date) {
  const diffMs = Date.now() - date.getTime()
  const minutes = Math.floor(diffMs / 1000 / 60)

  if (!Number.isFinite(minutes) || minutes < 1) {
    return "刚刚"
  }

  if (minutes < 60) {
    return `${minutes} 分钟前`
  }

  const hours = Math.floor(minutes / 60)

  if (hours < 24) {
    return `${hours} 小时前`
  }

  const days = Math.floor(hours / 24)

  if (days < 30) {
    return `${days} 天前`
  }

  const months = Math.floor(days / 30)

  if (months < 12) {
    return `${months} 个月前`
  }

  return `${Math.floor(months / 12)} 年前`
}
</script>

<template>
  <div class="video-meta" :class="{ 'video-meta--compact': compact }">
    <div class="video-meta__line">
      <span class="video-meta__item video-meta__uploader">
        <span class="video-meta__dot" />
        <AoiLink
          v-if="linkUploader"
          class="video-meta__name video-meta__name--link"
          :to="`/u/${video.uploader.handle}`"
        >
          {{ video.uploader.displayName }}
        </AoiLink>
        <span v-else class="video-meta__name">{{ video.uploader.displayName }}</span>
      </span>
    </div>
    <div class="video-meta__line">
      <span class="video-meta__item">
        <AoiIcon name="play" :size="13" decorative />
        {{ views }}
      </span>
      <span class="video-meta__item">
        <AoiIcon name="message-circle" :size="13" decorative />
        {{ video.commentCount }}
      </span>
      <span class="video-meta__item">
        <AoiIcon name="clock-3" :size="13" decorative />
        {{ duration }}
      </span>
      <span class="video-meta__item">{{ publishedDate }}</span>
    </div>
  </div>
</template>

<style scoped>
.video-meta {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 7px;
  color: var(--aoi-text-muted);
  font-size: 12px;
}

.video-meta__line {
  display: flex;
  min-width: 0;
  flex-wrap: wrap;
  gap: 8px 10px;
  align-items: center;
}

.video-meta__item {
  display: inline-flex;
  min-width: 0;
  align-items: center;
  gap: 4px;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

.video-meta__uploader {
  max-width: 100%;
}

.video-meta__name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.video-meta__name--link {
  color: var(--aoi-accent-60);
  font-weight: 750;
}

.video-meta__dot {
  width: 4px;
  height: 4px;
  border-radius: var(--aoi-radius-round);
  background: currentColor;
  flex: 0 0 auto;
}

.video-meta--compact {
  font-size: 11px;
  gap: 5px;
}

.video-meta--compact .video-meta__line {
  gap: 6px 8px;
}
</style>
