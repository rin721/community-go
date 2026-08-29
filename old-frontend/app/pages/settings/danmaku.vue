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
  { label: t("settings.danmaku.stats.fallback"), value: danmaku.totalCount },
  { label: t("settings.danmaku.stats.opacity"), value: `${Math.round(settings.effectiveDanmakuRuntimeSettings.opacity * 100)}%` },
  { label: t("settings.danmaku.stats.fontScale"), value: `${Math.round(settings.effectiveDanmakuRuntimeSettings.fontScale * 100)}%` },
  { label: t("settings.danmaku.stats.speed"), value: `${Math.round(settings.effectiveDanmakuRuntimeSettings.speed * 100)}%` }
])

function setSettingDerivationStrength(key: string, value: number) {
  settings.setSettingDerivationStrength(key as AoiSettingDerivationStrengthKey, value)
}
</script>

<template>
  <div class="settings-page">
    <SettingsPageHeader
      :title="t('settings.danmaku.page.title')"
      :description="t('settings.danmaku.page.description')"
    />

    <SettingsPanel
      icon="message-square-text"
      :title="t('settings.danmaku.display.title')"
      :description="t('settings.danmaku.display.description')"
    >
      <template #actions>
        <AoiButton tone="accent"
          variant="outlined"
          size="sm"
          icon="rotate-ccw"
          :disabled="!settings.hydrated || !hasDanmakuSettings"
          @click="settings.resetDanmakuSettings()"
        >
          {{ t("settings.danmaku.display.reset") }}
        </AoiButton>
      </template>

      <template v-if="settings.hydrated">
        <SettingsRow
          :title="t('settings.danmaku.display.enabledTitle')"
          :description="t('settings.danmaku.display.enabledDescription')"
        >
          <AoiSwitch v-model="settings.danmakuEnabled" />
        </SettingsRow>

        <SettingsRow
          :title="t('settings.danmaku.display.scrollTitle')"
          :description="t('settings.danmaku.display.scrollDescription')"
        >
          <AoiSwitch v-model="settings.danmakuScrollModeEnabled" />
        </SettingsRow>

        <SettingsRow
          :title="t('settings.danmaku.display.topTitle')"
          :description="t('settings.danmaku.display.topDescription')"
        >
          <AoiSwitch v-model="settings.danmakuTopModeEnabled" />
        </SettingsRow>

        <SettingsRow
          :title="t('settings.danmaku.display.bottomTitle')"
          :description="t('settings.danmaku.display.bottomDescription')"
        >
          <AoiSwitch v-model="settings.danmakuBottomModeEnabled" />
        </SettingsRow>
      </template>
    </SettingsPanel>

    <SettingsPanel
      v-if="settings.hydrated"
      icon="sliders-horizontal"
      :title="t('settings.danmaku.visual.title')"
      :description="t('settings.danmaku.visual.description')"
    >
      <SettingsRow
        :title="t('settings.danmaku.visual.opacityTitle')"
        :description="t('settings.danmaku.visual.currentPercent', { value: opacityModel })"
      >
        <AoiSlider v-model="opacityModel" :min="20" :max="100" :step="1" />
      </SettingsRow>

      <SettingsRow
        :title="t('settings.danmaku.visual.fontScaleTitle')"
        :description="t('settings.danmaku.visual.currentPercent', { value: fontScaleModel })"
      >
        <AoiSlider v-model="fontScaleModel" :min="70" :max="160" :step="5" />
      </SettingsRow>

      <SettingsRow
        :title="t('settings.danmaku.visual.speedTitle')"
        :description="t('settings.danmaku.visual.currentPercent', { value: speedModel })"
      >
        <AoiSlider v-model="speedModel" :min="50" :max="200" :step="5" />
      </SettingsRow>

      <SettingsRow
        :title="t('settings.danmaku.visual.visibleAreaTitle')"
        :description="t('settings.danmaku.visual.visibleAreaDescription', { value: visibleAreaModel })"
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
      :title="t('settings.danmaku.blocklist.title')"
      :description="t('settings.danmaku.blocklist.description')"
    >
      <AoiTextField
        v-model="blocklistModel"
        :label="t('settings.danmaku.blocklist.label')"
        :placeholder="t('settings.danmaku.blocklist.placeholder')"
        appearance="outlined"
        multiline
        :rows="5"
      />
    </SettingsPanel>

    <SettingsPanel
      v-if="settings.hydrated"
      icon="activity"
      :title="t('settings.danmaku.cache.title')"
      :description="t('settings.danmaku.cache.description')"
    >
      <AoiStatGrid :items="danmakuStats" />
    </SettingsPanel>
  </div>
</template>
