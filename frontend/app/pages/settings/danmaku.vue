<script setup lang="ts">
import { AOI_DANMAKU_DEFAULTS } from "~/utils/aoiDanmaku"
import type { AoiSettingDerivationStrengthKey } from "~/utils/aoiSettingDerivation"

const settings = useAppSettingsStore()
const danmaku = useDanmakuStore()
const { t } = useI18n()
const danmakuDerivationKeys: AoiSettingDerivationStrengthKey[] = ["danmaku"]
const showAdvancedSettings = computed(() => settings.settingsDisplayDepth === "all")

const opacityModel = computed({
  get: () => Math.round(settings.danmakuOpacity * 100),
  set: (value: number) => settings.setDanmakuOpacity(value / 100)
})
const fontScaleModel = computed({
  get: () => Math.round(settings.danmakuFontScale * 100),
  set: (value: number) => settings.setDanmakuFontScale(value / 100)
})
const speedModel = computed({
  get: () => Math.round(settings.danmakuSpeed * 100),
  set: (value: number) => settings.setDanmakuSpeed(value / 100)
})
const visibleAreaModel = computed({
  get: () => Math.round(settings.danmakuVisibleArea),
  set: (value: number) => settings.setDanmakuVisibleArea(value)
})
const blocklistModel = computed({
  get: () => settings.danmakuBlocklist,
  set: (value: string) => settings.setDanmakuBlocklist(value)
})
const danmakuDerivationControls = computed(() => danmakuDerivationKeys.map((key) => {
  const value = settings.settingDerivationStrengths[key]

  return {
    key,
    value,
    title: t(`settings.derivation.controls.${key}.title`),
    label: t(`settings.derivation.controls.${key}.label`),
    description: t("settings.derivation.valueDescription", {
      description: t(`settings.derivation.controls.${key}.description`),
      value
    }),
    disabled: !settings.danmakuEnabled
  }
}))
const hasDanmakuSettings = computed(() => {
  return settings.danmakuEnabled !== AOI_DANMAKU_DEFAULTS.enabled
    || settings.danmakuOpacity !== AOI_DANMAKU_DEFAULTS.opacity
    || settings.danmakuFontScale !== AOI_DANMAKU_DEFAULTS.fontScale
    || settings.danmakuSpeed !== AOI_DANMAKU_DEFAULTS.speed
    || settings.danmakuVisibleArea !== AOI_DANMAKU_DEFAULTS.visibleArea
    || settings.danmakuScrollModeEnabled !== AOI_DANMAKU_DEFAULTS.scrollModeEnabled
    || settings.danmakuTopModeEnabled !== AOI_DANMAKU_DEFAULTS.topModeEnabled
    || settings.danmakuBottomModeEnabled !== AOI_DANMAKU_DEFAULTS.bottomModeEnabled
    || settings.danmakuBlocklist !== AOI_DANMAKU_DEFAULTS.blocklist
    || settings.settingDerivationStrengths.danmaku !== 100
})
const danmakuStats = computed(() => [
  { label: "本地弹幕", value: danmaku.totalCount },
  { label: "透明度", value: `${Math.round(settings.effectiveDanmakuRuntimeSettings.opacity * 100)}%` },
  { label: "字号", value: `${Math.round(settings.effectiveDanmakuRuntimeSettings.fontScale * 100)}%` },
  { label: "速度", value: `${Math.round(settings.effectiveDanmakuRuntimeSettings.speed * 100)}%` }
])

function setSettingDerivationStrength(key: string, value: number) {
  settings.setSettingDerivationStrength(key as AoiSettingDerivationStrengthKey, value)
}
</script>

<template>
  <div class="settings-page">
    <SettingsPageHeader
      title="弹幕"
      description="调整播放器弹幕的显示、运动、模式和屏蔽词。设置会写入当前浏览器，并立即作用于 Aoi 播放器。"
    />

    <SettingsPanel
      icon="message-square-text"
      title="显示与模式"
      description="控制弹幕总开关，以及滚动、顶部、底部三种弹幕模式。"
    >
      <template #actions>
        <AoiButton tone="accent"
          variant="outlined"
          size="sm"
          icon="rotate-ccw"
          :disabled="!settings.hydrated || !hasDanmakuSettings"
          @click="settings.resetDanmakuSettings()"
        >
          重置弹幕
        </AoiButton>
      </template>

      <template v-if="settings.hydrated">
        <SettingsRow
          title="启用弹幕"
          description="关闭后，播放器不会显示弹幕，也不会允许发送新弹幕。"
        >
          <AoiSwitch v-model="settings.danmakuEnabled" />
        </SettingsRow>

        <SettingsRow
          title="滚动弹幕"
          description="允许弹幕从右向左穿过画面。"
        >
          <AoiSwitch v-model="settings.danmakuScrollModeEnabled" />
        </SettingsRow>

        <SettingsRow
          title="顶部弹幕"
          description="允许弹幕固定显示在画面顶部。"
        >
          <AoiSwitch v-model="settings.danmakuTopModeEnabled" />
        </SettingsRow>

        <SettingsRow
          title="底部弹幕"
          description="允许弹幕固定显示在画面底部。"
        >
          <AoiSwitch v-model="settings.danmakuBottomModeEnabled" />
        </SettingsRow>
      </template>
    </SettingsPanel>

    <SettingsPanel
      v-if="settings.hydrated"
      icon="sliders-horizontal"
      title="视觉与运动"
      description="调整弹幕的不透明度、字号、速度和可占用画面区域。"
    >
      <SettingsRow
        title="不透明度"
        :description="`当前 ${opacityModel}%`"
      >
        <AoiSlider v-model="opacityModel" :min="20" :max="100" :step="1" />
      </SettingsRow>

      <SettingsRow
        title="字号倍率"
        :description="`当前 ${fontScaleModel}%`"
      >
        <AoiSlider v-model="fontScaleModel" :min="70" :max="160" :step="5" />
      </SettingsRow>

      <SettingsRow
        title="速度倍率"
        :description="`当前 ${speedModel}%`"
      >
        <AoiSlider v-model="speedModel" :min="50" :max="200" :step="5" />
      </SettingsRow>

      <SettingsRow
        title="显示区域"
        :description="`弹幕最多占用画面上方 ${visibleAreaModel}% 区域`"
      >
        <AoiSlider v-model="visibleAreaModel" :min="20" :max="100" :step="1" />
      </SettingsRow>

      <SettingsDerivationControlGrid
        v-if="showAdvancedSettings"
        :controls="danmakuDerivationControls"
        @update="setSettingDerivationStrength"
      />
    </SettingsPanel>

    <SettingsPanel
      v-if="settings.hydrated"
      icon="ban"
      title="屏蔽词"
      description="每行或用逗号分隔一个屏蔽词；命中后不会显示在弹幕层和弹幕列表。"
    >
      <AoiTextField
        v-model="blocklistModel"
        label="屏蔽词"
        placeholder="例如：剧透&#10;刷屏"
        appearance="outlined"
        multiline
        :rows="5"
      />
    </SettingsPanel>

    <SettingsPanel
      v-if="settings.hydrated"
      icon="activity"
      title="本地弹幕状态"
      description="这里显示当前浏览器里保存的本地发送弹幕，不包含 mock API 初始弹幕。"
    >
      <AoiStatGrid :items="danmakuStats" />
    </SettingsPanel>
  </div>
</template>
