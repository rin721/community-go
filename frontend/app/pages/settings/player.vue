<script setup lang="ts">
import type { PlayerPlaybackRate } from "~/types/player"

const playerSettings = usePlayerSettingsStore()

const volumeModel = computed({
  get: () => Math.round(playerSettings.volume * 100),
  set: (value: number) => playerSettings.setVolume(value / 100)
})
const playbackRateModel = computed({
  get: () => String(playerSettings.playbackRate),
  set: (value: string) => playerSettings.setPlaybackRate(Number(value) as PlayerPlaybackRate)
})
const playbackRateOptions = computed(() => playerSettings.playbackRates.map((rate) => ({
  label: `${rate}x`,
  value: String(rate)
})))
const hasPlayerSettings = computed(() => {
  return playerSettings.volume !== 0.8
    || playerSettings.muted
    || playerSettings.playbackRate !== 1
    || playerSettings.theaterMode
})
const playerStats = computed(() => [
  { label: "音量", value: `${volumeModel.value}%` },
  { label: "静音", value: playerSettings.muted ? "开启" : "关闭" },
  { label: "倍速", value: `${playerSettings.playbackRate}x` },
  { label: "剧场模式", value: playerSettings.theaterMode ? "开启" : "关闭" }
])
</script>

<template>
  <div class="settings-page">
    <SettingsPageHeader
      title="播放器"
      description="这些选项会写入当前浏览器，并被视频播放器立即使用。"
    />

    <SettingsPanel
      icon="volume-2"
      title="播放控制"
      description="调整默认音量、静音和倍速。"
    >
      <template #actions>
        <AoiButton tone="accent"
          variant="outlined"
          size="sm"
          icon="rotate-ccw"
          :disabled="!playerSettings.hydrated || !hasPlayerSettings"
          @click="playerSettings.resetPlayerSettings()"
        >
          重置播放器
        </AoiButton>
      </template>

      <template v-if="playerSettings.hydrated">
        <SettingsRow
          title="音量"
          :description="`当前音量 ${volumeModel}%`"
        >
          <AoiSlider v-model="volumeModel" :min="0" :max="100" :step="1" />
        </SettingsRow>

        <SettingsRow
          title="静音"
          description="开启后播放器会保持静音，调高音量时自动取消。"
        >
          <AoiSwitch v-model="playerSettings.muted" />
        </SettingsRow>

        <SettingsRow
          title="默认倍速"
          description="新打开的视频会沿用这个倍速。"
        >
          <AoiSelect
            v-model="playbackRateModel"
            label="倍速"
            appearance="outlined"
            :options="playbackRateOptions"
          />
        </SettingsRow>

        <SettingsRow
          title="剧场模式"
          description="播放器打开时保留更沉浸的观看布局。"
        >
          <AoiSwitch v-model="playerSettings.theaterMode" />
        </SettingsRow>
      </template>
    </SettingsPanel>

    <SettingsPanel
      v-if="playerSettings.hydrated"
      icon="activity"
      title="当前状态"
      description="用于确认持久化设置是否已恢复。"
    >
      <AoiStatGrid :items="playerStats" />
    </SettingsPanel>
  </div>
</template>
