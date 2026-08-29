<script setup lang="ts">
import type { PlayerPlaybackRate } from "~/types/player"

const props = withDefaults(defineProps<{
  danmakuEnabled?: boolean
  fullscreen?: boolean
  isPlaying?: boolean
  muted?: boolean
  playbackRate?: PlayerPlaybackRate
  playbackRates?: PlayerPlaybackRate[]
  theaterMode?: boolean
  volumePercent?: number
}>(), {
  danmakuEnabled: true,
  fullscreen: false,
  isPlaying: false,
  muted: false,
  playbackRate: 1,
  playbackRates: () => [0.75, 1, 1.25, 1.5, 2],
  theaterMode: false,
  volumePercent: 80
})

const emit = defineEmits<{
  "toggle-play": []
  "toggle-muted": []
  "toggle-theater": []
  "toggle-fullscreen": []
  "toggle-danmaku": []
  "update:playbackRate": [value: PlayerPlaybackRate]
  "update:volumePercent": [value: number]
}>()

const { t } = useI18n()
const playbackRateOptions = computed(() => props.playbackRates.map((rate) => ({
  label: `${rate}x`,
  value: String(rate)
})))
const playbackRateModel = computed({
  get: () => String(props.playbackRate),
  set: (value: string) => emit("update:playbackRate", Number(value) as PlayerPlaybackRate)
})
</script>

<template>
  <div class="aoi-video-toolbar" :aria-label="t('player.controls')">
    <AoiIconButton
      :icon="isPlaying ? 'pause' : 'play'"
      :label="isPlaying ? t('player.pause') : t('player.play')"
      size="sm"
      @click="emit('toggle-play')"
    />

    <AoiIconButton
      :class="{ 'aoi-video-toolbar__button--state-on': muted }"
      :icon="muted || volumePercent === 0 ? 'volume-x' : 'volume-2'"
      :label="muted ? t('player.unmute') : t('player.mute')"
      size="sm"
      @click="emit('toggle-muted')"
    />

    <div class="aoi-video-toolbar__volume">
      <span class="aoi-video-toolbar__volume-label">{{ t("player.volume") }}</span>
      <AoiSlider
        class="aoi-video-toolbar__volume-slider"
        :model-value="volumePercent"
        :aria-label="t('player.volume')"
        contrast="inverse"
        compact
        :min="0"
        :max="100"
        :step="1"
        @update:model-value="emit('update:volumePercent', $event)"
      />
    </div>

    <span class="aoi-video-toolbar__spacer" aria-hidden="true" />

    <label class="aoi-video-toolbar__rate">
      <span>{{ t("player.rateShort") }}</span>
      <select v-model="playbackRateModel" :aria-label="t('player.rate')">
        <option
          v-for="option in playbackRateOptions"
          :key="option.value"
          :value="option.value"
        >
          {{ option.label }}
        </option>
      </select>
    </label>

    <AoiIconButton
      :class="{ 'aoi-video-toolbar__button--state-on': danmakuEnabled }"
      icon="message-square-text"
      :label="danmakuEnabled ? t('player.hideDanmaku') : t('player.showDanmaku')"
      size="sm"
      @click="emit('toggle-danmaku')"
    />

    <AoiIconButton
      :class="{ 'aoi-video-toolbar__button--state-on': theaterMode }"
      icon="panel-top"
      :label="t('player.theater')"
      size="sm"
      @click="emit('toggle-theater')"
    />

    <AoiIconButton
      :icon="fullscreen ? 'minimize' : 'maximize'"
      :label="fullscreen ? t('player.exitFullscreen') : t('player.fullscreen')"
      size="sm"
      @click="emit('toggle-fullscreen')"
    />
  </div>
</template>

<style scoped>
.aoi-video-toolbar {
  display: flex;
  align-items: center;
  gap: 3px;
  min-width: 0;
}

.aoi-video-toolbar :deep(.aoi-icon-button) {
  --md-icon-button-icon-color: rgba(255, 255, 255, .9);
  --md-icon-button-hover-icon-color: #fff;
  --md-icon-button-pressed-icon-color: var(--aoi-player-accent);
  --md-icon-button-hover-state-layer-color: #fff;
  color: rgba(255, 255, 255, .9);
  box-shadow: none;
}

.aoi-video-toolbar :deep(.aoi-video-toolbar__button--state-on) {
  --md-icon-button-icon-color: var(--aoi-player-accent);
  --md-icon-button-hover-icon-color: var(--aoi-player-accent);
  color: var(--aoi-player-accent);
  box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--aoi-player-accent) 54%, transparent);
}

.aoi-video-toolbar :deep(.aoi-video-toolbar__button--state-on:hover) {
  box-shadow: inset 0 0 0 1px var(--aoi-player-accent);
}

.aoi-video-toolbar__spacer {
  flex: 1 1 auto;
  min-width: 12px;
}

.aoi-video-toolbar__volume {
  display: flex;
  min-height: 34px;
  align-items: center;
  gap: 6px;
  color: rgba(255, 255, 255, .78);
  font-size: 12px;
  font-weight: 800;
}

.aoi-video-toolbar__volume-label {
  display: none;
}

.aoi-video-toolbar__volume-slider {
  width: 94px;
  --md-slider-active-track-color: rgba(255, 255, 255, .92);
  --md-slider-handle-color: #fff;
  --md-slider-inactive-track-color: rgba(255, 255, 255, .24);
}

.aoi-video-toolbar__rate {
  display: inline-flex;
  min-height: 30px;
  align-items: center;
  gap: 5px;
  border: 1px solid rgba(255, 255, 255, .14);
  border-radius: var(--aoi-radius-field);
  background: rgba(255, 255, 255, .1);
  color: rgba(255, 255, 255, .82);
  font-size: 12px;
  font-weight: 800;
  padding: 0 7px;
  backdrop-filter: blur(10px);
}

.aoi-video-toolbar__rate select {
  width: 54px;
  border: 0;
  background: transparent;
  color: #fff;
  cursor: pointer;
  font: inherit;
  outline: 0;
}

.aoi-video-toolbar__rate option {
  color: var(--aoi-player-text);
  background: var(--aoi-player-surface);
}

@media (max-width: 639px) {
  .aoi-video-toolbar {
    display: flex;
    gap: 3px;
  }

  .aoi-video-toolbar__volume {
    display: none;
  }

  .aoi-video-toolbar__rate {
    min-height: 30px;
    padding-inline: 5px;
  }

  .aoi-video-toolbar__volume-slider {
    display: none;
  }

  .aoi-video-toolbar__rate span {
    display: none;
  }

  .aoi-video-toolbar__spacer {
    min-width: 0;
  }
}
</style>
