<script setup lang="ts">
import type { AoiDataMode } from "~/stores/app-settings"
import type { AoiRevealMotionEffect, AoiRevealMotionReplay } from "~/utils/aoiReveal"
import type { AoiRouteProgressEasing } from "~/utils/aoiRouteProgress"
import { clampAoiRouteProgressSetting } from "~/utils/aoiRouteProgress"
import type {
  AoiPageScrollbarStrategy,
  AoiScrollHijackMode,
  AoiScrollSnapMode
} from "~/utils/aoiScroll"
import { clampAoiScrollSetting } from "~/utils/aoiScroll"
import type { AoiSettingDerivationStrengthKey } from "~/utils/aoiSettingDerivation"

const { t } = useI18n()
const settings = useAppSettingsStore()
const resetPreferenceConfirmOpen = ref(false)
const resettingPreference = ref(false)
const showAdvancedSettings = computed(() => settings.settingsDisplayDepth === "all")

const dataModes = computed<Array<{
  description: string
  icon: string
  label: string
  value: AoiDataMode
}>>(() => [
  {
    description: t("settings.preference.dataMode.options.economy.description"),
    icon: "leaf",
    label: t("settings.preference.dataMode.options.economy.label"),
    value: "economy"
  },
  {
    description: t("settings.preference.dataMode.options.standard.description"),
    icon: "gauge",
    label: t("settings.preference.dataMode.options.standard.label"),
    value: "standard"
  },
  {
    description: t("settings.preference.dataMode.options.turbo.description"),
    icon: "zap",
    label: t("settings.preference.dataMode.options.turbo.label"),
    value: "turbo"
  }
])

const revealEffectOptions = computed(() => [
  { label: t("settings.preference.reveal.effect.contextual"), value: "contextual" },
  { label: t("settings.preference.reveal.effect.pop"), value: "pop" },
  { label: t("settings.preference.reveal.effect.rise"), value: "rise" },
  { label: t("settings.preference.reveal.effect.fade"), value: "fade" },
  { label: t("settings.preference.reveal.effect.slideLeft"), value: "slide-left" },
  { label: t("settings.preference.reveal.effect.slideRight"), value: "slide-right" }
])
const revealReplayOptions = computed(() => [
  {
    icon: "repeat",
    label: t("settings.preference.reveal.replay.repeat.label"),
    description: t("settings.preference.reveal.replay.repeat.description"),
    value: "repeat",
    disabled: !settings.revealMotionEnabled
  },
  {
    icon: "badge-check",
    label: t("settings.preference.reveal.replay.once.label"),
    description: t("settings.preference.reveal.replay.once.description"),
    value: "once",
    disabled: !settings.revealMotionEnabled
  }
])
const scrollSnapModeOptions = computed(() => [
  {
    icon: "magnet",
    label: t("settings.preference.scroll.snap.mode.proximity.label"),
    description: t("settings.preference.scroll.snap.mode.proximity.description"),
    value: "proximity",
    disabled: !settings.scrollSnapEnabled
  },
  {
    icon: "panel-top",
    label: t("settings.preference.scroll.snap.mode.mandatory.label"),
    description: t("settings.preference.scroll.snap.mode.mandatory.description"),
    value: "mandatory",
    disabled: !settings.scrollSnapEnabled
  }
])
const scrollHijackModeOptions = computed(() => [
  {
    icon: "rows-3",
    label: t("settings.preference.scroll.hijack.mode.section.label"),
    description: t("settings.preference.scroll.hijack.mode.section.description"),
    value: "section",
    disabled: !settings.scrollHijackEnabled
  },
  {
    icon: "crosshair",
    label: t("settings.preference.scroll.hijack.mode.nearest.label"),
    description: t("settings.preference.scroll.hijack.mode.nearest.description"),
    value: "nearest",
    disabled: !settings.scrollHijackEnabled
  }
])
const pageScrollbarStrategyOptions = computed(() => [
  {
    icon: "monitor",
    label: t("settings.preference.scroll.scrollbar.strategy.auto.label"),
    description: t("settings.preference.scroll.scrollbar.strategy.auto.description"),
    value: "auto"
  },
  {
    icon: "panel-right",
    label: t("settings.preference.scroll.scrollbar.strategy.stable.label"),
    description: t("settings.preference.scroll.scrollbar.strategy.stable.description"),
    value: "stable"
  },
  {
    icon: "columns-2",
    label: t("settings.preference.scroll.scrollbar.strategy.stableBothEdges.label"),
    description: t("settings.preference.scroll.scrollbar.strategy.stableBothEdges.description"),
    value: "stable-both-edges"
  },
  {
    icon: "eye-off",
    label: t("settings.preference.scroll.scrollbar.strategy.hidden.label"),
    description: t("settings.preference.scroll.scrollbar.strategy.hidden.description"),
    value: "hidden"
  }
])
const routeProgressEasingOptions = computed(() => [
  { label: t("settings.preference.routeProgress.easing.linear"), value: "linear" },
  { label: t("settings.preference.routeProgress.easing.ease"), value: "ease" },
  { label: t("settings.preference.routeProgress.easing.easeIn"), value: "ease-in" },
  { label: t("settings.preference.routeProgress.easing.easeOut"), value: "ease-out" },
  { label: t("settings.preference.routeProgress.easing.easeInOut"), value: "ease-in-out" }
])
const routeProgressDerivationKeys: AoiSettingDerivationStrengthKey[] = ["routeProgress"]
const revealDerivationKeys: AoiSettingDerivationStrengthKey[] = ["revealMotion"]
const scrollDerivationKeys: AoiSettingDerivationStrengthKey[] = [
  "smoothScroll",
  "scrollSnap",
  "scrollHijack",
  "rubberBand"
]
const routeProgressDerivationControls = computed(() => routeProgressDerivationKeys.map(createDerivationControl))
const revealDerivationControls = computed(() => revealDerivationKeys.map(createDerivationControl))
const scrollDerivationControls = computed(() => scrollDerivationKeys.map(createDerivationControl))
const revealEffectModel = computed({
  get: () => settings.revealMotionEffect,
  set: (value: string) => settings.setRevealMotionEffect(value as AoiRevealMotionEffect)
})
const revealReplayModel = computed({
  get: () => settings.revealMotionReplay,
  set: (value: string) => settings.setRevealMotionReplay(value as AoiRevealMotionReplay)
})
const revealDurationModel = computed({
  get: () => settings.revealMotionDurationMs,
  set: (value: number) => {
    settings.revealMotionDurationMs = clampRevealSetting(value, 120, 800)
  }
})
const revealDistanceModel = computed({
  get: () => settings.revealMotionDistancePx,
  set: (value: number) => {
    settings.revealMotionDistancePx = clampRevealSetting(value, 0, 48)
  }
})
const revealStaggerModel = computed({
  get: () => settings.revealMotionStaggerMs,
  set: (value: number) => {
    settings.revealMotionStaggerMs = clampRevealSetting(value, 0, 120)
  }
})
const revealMaxDelayModel = computed({
  get: () => settings.revealMotionMaxDelayMs,
  set: (value: number) => {
    settings.revealMotionMaxDelayMs = clampRevealSetting(value, 0, 600)
  }
})
const routeProgressMinimumModel = computed({
  get: () => Math.round(settings.routeProgressMinimum * 100),
  set: (value: number) => {
    settings.routeProgressMinimum = clampAoiRouteProgressSetting(value, 0, 50, settings.routeProgressMinimum * 100) / 100
  }
})
const routeProgressDelayModel = computed({
  get: () => settings.routeProgressDelayMs,
  set: (value: number) => {
    settings.routeProgressDelayMs = clampAoiRouteProgressSetting(value, 0, 600, settings.routeProgressDelayMs)
  }
})
const routeProgressSpeedModel = computed({
  get: () => settings.routeProgressSpeedMs,
  set: (value: number) => {
    settings.routeProgressSpeedMs = clampAoiRouteProgressSetting(value, 80, 800, settings.routeProgressSpeedMs)
  }
})
const routeProgressTrickleSpeedModel = computed({
  get: () => settings.routeProgressTrickleSpeedMs,
  set: (value: number) => {
    settings.routeProgressTrickleSpeedMs = clampAoiRouteProgressSetting(value, 80, 1000, settings.routeProgressTrickleSpeedMs)
  }
})
const routeProgressHeightModel = computed({
  get: () => settings.routeProgressHeightPx,
  set: (value: number) => {
    settings.routeProgressHeightPx = clampAoiRouteProgressSetting(value, 1, 8, settings.routeProgressHeightPx)
  }
})
const routeProgressEasingModel = computed({
  get: () => settings.routeProgressEasing,
  set: (value: string) => settings.setRouteProgressEasing(value as AoiRouteProgressEasing)
})
const smoothDurationModel = computed({
  get: () => settings.smoothScrollDurationMs,
  set: (value: number) => {
    settings.smoothScrollDurationMs = clampAoiScrollSetting(value, 600, 1800, settings.smoothScrollDurationMs)
  }
})
const smoothDampingModel = computed({
  get: () => settings.smoothScrollDamping,
  set: (value: number) => {
    settings.smoothScrollDamping = clampAoiScrollSetting(value, 0.04, 0.22, settings.smoothScrollDamping)
  }
})
const scrollSnapModeModel = computed({
  get: () => settings.scrollSnapMode,
  set: (value: string) => settings.setScrollSnapMode(value as AoiScrollSnapMode)
})
const scrollSnapStrengthModel = computed({
  get: () => settings.scrollSnapStrength,
  set: (value: number) => {
    settings.scrollSnapStrength = clampAoiScrollSetting(value, 0, 100, settings.scrollSnapStrength)
  }
})
const scrollHijackModeModel = computed({
  get: () => settings.scrollHijackMode,
  set: (value: string) => settings.setScrollHijackMode(value as AoiScrollHijackMode)
})
const pageScrollbarStrategyModel = computed({
  get: () => settings.pageScrollbarStrategy,
  set: (value: string) => settings.setPageScrollbarStrategy(value as AoiPageScrollbarStrategy)
})
const scrollHijackThresholdModel = computed({
  get: () => settings.scrollHijackThresholdPx,
  set: (value: number) => {
    settings.scrollHijackThresholdPx = clampAoiScrollSetting(value, 24, 180, settings.scrollHijackThresholdPx)
  }
})
const rubberBandStrengthModel = computed({
  get: () => settings.rubberBandStrength,
  set: (value: number) => {
    settings.rubberBandStrength = clampAoiScrollSetting(value, 0, 100, settings.rubberBandStrength)
  }
})
const rubberBandMaxOffsetModel = computed({
  get: () => settings.rubberBandMaxOffsetPx,
  set: (value: number) => {
    settings.rubberBandMaxOffsetPx = clampAoiScrollSetting(value, 8, 36, settings.rubberBandMaxOffsetPx)
  }
})

function createDerivationControl(key: AoiSettingDerivationStrengthKey) {
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
    disabled: isDerivationControlDisabled(key)
  }
}

function isDerivationControlDisabled(key: AoiSettingDerivationStrengthKey) {
  if (key === "routeProgress") {
    return !settings.routeProgressEnabled
  }

  if (key === "revealMotion") {
    return !settings.revealMotionEnabled
  }

  if (key === "smoothScroll") {
    return !settings.smoothScrollEnabled
  }

  if (key === "scrollSnap") {
    return !settings.scrollSnapEnabled
  }

  if (key === "scrollHijack") {
    return !settings.scrollHijackEnabled
  }

  if (key === "rubberBand") {
    return !settings.rubberBandEnabled
  }

  return false
}

function setSettingDerivationStrength(key: string, value: number) {
  settings.setSettingDerivationStrength(key as AoiSettingDerivationStrengthKey, value)
}

function clampRevealSetting(value: number, min: number, max: number) {
  if (!Number.isFinite(value)) {
    return min
  }

  return Math.min(max, Math.max(min, value))
}

async function confirmResetPreference() {
  resettingPreference.value = true

  try {
    settings.resetPreference()
    resetPreferenceConfirmOpen.value = false
  } finally {
    resettingPreference.value = false
  }
}
</script>

<template>
  <div class="settings-page">
    <SettingsPageHeader
      :title="t('settings.preference.page.title')"
      :description="t('settings.preference.page.description')"
    >
      <template #actions>
        <AoiButton tone="accent"
          variant="outlined"
          size="sm"
          icon="rotate-ccw"
          :disabled="!settings.hydrated || resettingPreference"
          @click="resetPreferenceConfirmOpen = true"
        >
          {{ t("settings.resetPage.action") }}
        </AoiButton>
      </template>
    </SettingsPageHeader>

    <SettingsPanel
      icon="radio"
      :title="t('settings.preference.dataMode.title')"
      :description="t('settings.preference.dataMode.description')"
    >
      <SettingsOptionGrid>
        <AoiChoiceCard
          v-for="mode in dataModes"
          :key="mode.value"
          class="settings-mode-card"
          :value="mode.value"
          :title="mode.label"
          :description="mode.description"
          :icon="mode.icon"
          :selected="settings.dataMode === mode.value"
          @select="settings.dataMode = mode.value"
        />
      </SettingsOptionGrid>
    </SettingsPanel>

    <SettingsPanel
      icon="mouse-pointer-click"
      :title="t('settings.preference.browsing.title')"
      :description="t('settings.preference.browsing.description')"
    >
      <SettingsRow
        :title="t('settings.preference.browsing.openNewTabTitle')"
        :description="t('settings.preference.browsing.openNewTabDescription')"
      >
        <AoiSwitch v-model="settings.openVideosInNewTab" />
      </SettingsRow>

      <SettingsRow
        :title="t('settings.preference.browsing.relativeDatesTitle')"
        :description="t('settings.preference.browsing.relativeDatesDescription')"
      >
        <AoiSwitch v-model="settings.useRelativeDates" />
      </SettingsRow>
    </SettingsPanel>

    <SettingsPanel
      v-if="showAdvancedSettings"
      icon="loader"
      :title="t('settings.preference.routeProgress.title')"
      :description="t('settings.preference.routeProgress.description')"
    >
      <SettingsRow
        :title="t('settings.preference.routeProgress.enabledTitle')"
        :description="t('settings.preference.routeProgress.enabledDescription')"
      >
        <AoiSwitch v-model="settings.routeProgressEnabled" />
      </SettingsRow>

      <SettingsRow
        :title="t('settings.preference.routeProgress.trickleTitle')"
        :description="t('settings.preference.routeProgress.trickleDescription')"
      >
        <AoiSwitch
          v-model="settings.routeProgressTrickle"
          :disabled="!settings.routeProgressEnabled"
        />
      </SettingsRow>

      <SettingsRow
        :title="t('settings.preference.routeProgress.spinnerTitle')"
        :description="t('settings.preference.routeProgress.spinnerDescription')"
      >
        <AoiSwitch
          v-model="settings.routeProgressShowSpinner"
          :disabled="!settings.routeProgressEnabled"
        />
      </SettingsRow>

      <SettingsRow
        :title="t('settings.preference.routeProgress.easingTitle')"
        :description="t('settings.preference.routeProgress.easingDescription')"
      >
        <AoiSelect
          v-model="routeProgressEasingModel"
          class="settings-route-progress-control"
          appearance="outlined"
          :label="t('settings.preference.routeProgress.easingLabel')"
          :options="routeProgressEasingOptions"
          :disabled="!settings.routeProgressEnabled"
        />
      </SettingsRow>

      <div class="settings-reveal-slider-grid">
        <SettingsRow
          :title="t('settings.preference.routeProgress.minimumTitle')"
          :description="`${Math.round(settings.routeProgressMinimum * 100)}%`"
        >
          <AoiSlider
            v-model="routeProgressMinimumModel"
            :label="t('settings.preference.routeProgress.minimumLabel')"
            :min="0"
            :max="50"
            :step="1"
            :disabled="!settings.routeProgressEnabled"
          />
        </SettingsRow>

        <SettingsRow
          :title="t('settings.preference.routeProgress.delayTitle')"
          :description="`${settings.routeProgressDelayMs}ms`"
        >
          <AoiSlider
            v-model="routeProgressDelayModel"
            :label="t('settings.preference.routeProgress.delayLabel')"
            :min="0"
            :max="600"
            :step="20"
            :disabled="!settings.routeProgressEnabled"
          />
        </SettingsRow>

        <SettingsRow
          :title="t('settings.preference.routeProgress.speedTitle')"
          :description="`${settings.routeProgressSpeedMs}ms`"
        >
          <AoiSlider
            v-model="routeProgressSpeedModel"
            :label="t('settings.preference.routeProgress.speedLabel')"
            :min="80"
            :max="800"
            :step="20"
            :disabled="!settings.routeProgressEnabled"
          />
        </SettingsRow>

        <SettingsRow
          :title="t('settings.preference.routeProgress.trickleSpeedTitle')"
          :description="`${settings.routeProgressTrickleSpeedMs}ms`"
        >
          <AoiSlider
            v-model="routeProgressTrickleSpeedModel"
            :label="t('settings.preference.routeProgress.trickleSpeedLabel')"
            :min="80"
            :max="1000"
            :step="20"
            :disabled="!settings.routeProgressEnabled || !settings.routeProgressTrickle"
          />
        </SettingsRow>

        <SettingsRow
          :title="t('settings.preference.routeProgress.heightTitle')"
          :description="`${settings.routeProgressHeightPx}px`"
        >
          <AoiSlider
            v-model="routeProgressHeightModel"
            :label="t('settings.preference.routeProgress.heightLabel')"
            :min="1"
            :max="8"
            :step="1"
            :disabled="!settings.routeProgressEnabled"
          />
        </SettingsRow>
      </div>

      <SettingsDerivationControlGrid
        :controls="routeProgressDerivationControls"
        @update="setSettingDerivationStrength"
      />
    </SettingsPanel>

    <SettingsPanel
      v-if="showAdvancedSettings"
      icon="sparkles"
      :title="t('settings.preference.reveal.title')"
      :description="t('settings.preference.reveal.description')"
    >
      <SettingsRow
        :title="t('settings.preference.reveal.enabledTitle')"
        :description="t('settings.preference.reveal.enabledDescription')"
      >
        <AoiSwitch v-model="settings.revealMotionEnabled" />
      </SettingsRow>

      <SettingsRow
        :title="t('settings.preference.reveal.effectTitle')"
        :description="t('settings.preference.reveal.effectDescription')"
      >
        <AoiSelect
          v-model="revealEffectModel"
          class="settings-reveal-control"
          appearance="outlined"
          :label="t('settings.preference.reveal.effectLabel')"
          :options="revealEffectOptions"
          :disabled="!settings.revealMotionEnabled"
        />
      </SettingsRow>

      <SettingsRow
        :title="t('settings.preference.reveal.replayTitle')"
        :description="t('settings.preference.reveal.replayDescription')"
      >
        <AoiSegmentedControl
          v-model="revealReplayModel"
          class="settings-reveal-control"
          :items="revealReplayOptions"
          :columns="2"
          :aria-label="t('settings.preference.reveal.replayTitle')"
        />
      </SettingsRow>

      <div class="settings-reveal-slider-grid">
        <SettingsRow
          :title="t('settings.preference.reveal.durationTitle')"
          :description="`${settings.revealMotionDurationMs}ms`"
        >
          <AoiSlider
            v-model="revealDurationModel"
            :label="t('settings.preference.reveal.durationLabel')"
            :min="120"
            :max="800"
            :step="20"
            :disabled="!settings.revealMotionEnabled"
          />
        </SettingsRow>

        <SettingsRow
          :title="t('settings.preference.reveal.distanceTitle')"
          :description="`${settings.revealMotionDistancePx}px`"
        >
          <AoiSlider
            v-model="revealDistanceModel"
            :label="t('settings.preference.reveal.distanceLabel')"
            :min="0"
            :max="48"
            :step="2"
            :disabled="!settings.revealMotionEnabled"
          />
        </SettingsRow>

        <SettingsRow
          :title="t('settings.preference.reveal.staggerTitle')"
          :description="`${settings.revealMotionStaggerMs}ms`"
        >
          <AoiSlider
            v-model="revealStaggerModel"
            :label="t('settings.preference.reveal.staggerLabel')"
            :min="0"
            :max="120"
            :step="5"
            :disabled="!settings.revealMotionEnabled"
          />
        </SettingsRow>

        <SettingsRow
          :title="t('settings.preference.reveal.maxDelayTitle')"
          :description="`${settings.revealMotionMaxDelayMs}ms`"
        >
          <AoiSlider
            v-model="revealMaxDelayModel"
            :label="t('settings.preference.reveal.maxDelayLabel')"
            :min="0"
            :max="600"
            :step="20"
            :disabled="!settings.revealMotionEnabled"
          />
        </SettingsRow>
      </div>

      <SettingsDerivationControlGrid
        :controls="revealDerivationControls"
        @update="setSettingDerivationStrength"
      />
    </SettingsPanel>

    <SettingsPanel
      v-if="showAdvancedSettings"
      icon="move-vertical"
      :title="t('settings.preference.scroll.title')"
      :description="t('settings.preference.scroll.description')"
    >
      <SettingsRow
        class="settings-scrollbar-row"
        :title="t('settings.preference.scroll.scrollbar.strategyTitle')"
        :description="t('settings.preference.scroll.scrollbar.strategyDescription')"
      >
        <AoiSegmentedControl
          v-model="pageScrollbarStrategyModel"
          class="settings-scrollbar-control"
          :items="pageScrollbarStrategyOptions"
          :columns="2"
          :aria-label="t('settings.preference.scroll.scrollbar.strategyTitle')"
        />
      </SettingsRow>

      <SettingsRow
        :title="t('settings.preference.scroll.smooth.enabledTitle')"
        :description="t('settings.preference.scroll.smooth.enabledDescription')"
      >
        <AoiSwitch v-model="settings.smoothScrollEnabled" />
      </SettingsRow>

      <div class="settings-reveal-slider-grid">
        <SettingsRow
          :title="t('settings.preference.scroll.smooth.durationTitle')"
          :description="`${settings.smoothScrollDurationMs}ms`"
        >
          <AoiSlider
            v-model="smoothDurationModel"
            :label="t('settings.preference.scroll.smooth.durationLabel')"
            :min="600"
            :max="1800"
            :step="50"
            :disabled="!settings.smoothScrollEnabled"
          />
        </SettingsRow>

        <SettingsRow
          :title="t('settings.preference.scroll.smooth.dampingTitle')"
          :description="`${Math.round(settings.smoothScrollDamping * 100)}%`"
        >
          <AoiSlider
            v-model="smoothDampingModel"
            :label="t('settings.preference.scroll.smooth.dampingLabel')"
            :min="0.04"
            :max="0.22"
            :step="0.01"
            :disabled="!settings.smoothScrollEnabled"
          />
        </SettingsRow>
      </div>

      <SettingsRow
        :title="t('settings.preference.scroll.snap.enabledTitle')"
        :description="t('settings.preference.scroll.snap.enabledDescription')"
      >
        <AoiSwitch v-model="settings.scrollSnapEnabled" />
      </SettingsRow>

      <SettingsRow
        :title="t('settings.preference.scroll.snap.modeTitle')"
        :description="t('settings.preference.scroll.snap.modeDescription')"
      >
        <AoiSegmentedControl
          v-model="scrollSnapModeModel"
          class="settings-reveal-control"
          :items="scrollSnapModeOptions"
          :columns="2"
          :aria-label="t('settings.preference.scroll.snap.modeTitle')"
        />
      </SettingsRow>

      <SettingsRow
        :title="t('settings.preference.scroll.snap.strengthTitle')"
        :description="`${settings.scrollSnapStrength}%`"
      >
        <AoiSlider
          v-model="scrollSnapStrengthModel"
          :label="t('settings.preference.scroll.snap.strengthLabel')"
          :min="0"
          :max="100"
          :step="5"
          :disabled="!settings.scrollSnapEnabled"
        />
      </SettingsRow>

      <SettingsRow
        :title="t('settings.preference.scroll.hijack.enabledTitle')"
        :description="t('settings.preference.scroll.hijack.enabledDescription')"
      >
        <AoiSwitch v-model="settings.scrollHijackEnabled" />
      </SettingsRow>

      <SettingsRow
        :title="t('settings.preference.scroll.hijack.modeTitle')"
        :description="t('settings.preference.scroll.hijack.modeDescription')"
      >
        <AoiSegmentedControl
          v-model="scrollHijackModeModel"
          class="settings-reveal-control"
          :items="scrollHijackModeOptions"
          :columns="2"
          :aria-label="t('settings.preference.scroll.hijack.modeTitle')"
        />
      </SettingsRow>

      <SettingsRow
        :title="t('settings.preference.scroll.hijack.thresholdTitle')"
        :description="`${settings.scrollHijackThresholdPx}px`"
      >
        <AoiSlider
          v-model="scrollHijackThresholdModel"
          :label="t('settings.preference.scroll.hijack.thresholdLabel')"
          :min="24"
          :max="180"
          :step="4"
          :disabled="!settings.scrollHijackEnabled"
        />
      </SettingsRow>

      <SettingsRow
        :title="t('settings.preference.scroll.rubberBand.enabledTitle')"
        :description="t('settings.preference.scroll.rubberBand.enabledDescription')"
      >
        <AoiSwitch v-model="settings.rubberBandEnabled" />
      </SettingsRow>

      <div class="settings-reveal-slider-grid">
        <SettingsRow
          :title="t('settings.preference.scroll.rubberBand.strengthTitle')"
          :description="`${settings.rubberBandStrength}%`"
        >
          <AoiSlider
            v-model="rubberBandStrengthModel"
            :label="t('settings.preference.scroll.rubberBand.strengthLabel')"
            :min="0"
            :max="100"
            :step="5"
            :disabled="!settings.rubberBandEnabled"
          />
        </SettingsRow>

        <SettingsRow
          :title="t('settings.preference.scroll.rubberBand.maxOffsetTitle')"
          :description="`${settings.rubberBandMaxOffsetPx}px`"
        >
          <AoiSlider
            v-model="rubberBandMaxOffsetModel"
            :label="t('settings.preference.scroll.rubberBand.maxOffsetLabel')"
            :min="8"
            :max="36"
            :step="2"
            :disabled="!settings.rubberBandEnabled"
          />
        </SettingsRow>
      </div>

      <SettingsDerivationControlGrid
        :controls="scrollDerivationControls"
        @update="setSettingDerivationStrength"
      />
    </SettingsPanel>

    <SettingsPanel
      icon="shield-check"
      :title="t('settings.preference.privacy.title')"
      :description="t('settings.preference.privacy.description')"
    >
      <SettingsRow
        :title="t('settings.preference.privacy.disableHistoryTitle')"
        :description="t('settings.preference.privacy.disableHistoryDescription')"
      >
        <AoiSwitch v-model="settings.disableWatchHistory" />
      </SettingsRow>

      <SettingsRow
        :title="t('settings.preference.privacy.hideRecentSearchesTitle')"
        :description="t('settings.preference.privacy.hideRecentSearchesDescription')"
      >
        <AoiSwitch v-model="settings.hideRecentSearches" />
      </SettingsRow>
    </SettingsPanel>

    <SettingsPanel
      icon="focus"
      :title="t('settings.preference.focus.title')"
      :description="t('settings.preference.focus.description')"
    >
      <SettingsRow
        :title="t('settings.preference.focus.noSearchRecommendationsTitle')"
        :description="t('settings.preference.focus.noSearchRecommendationsDescription')"
      >
        <AoiSwitch v-model="settings.noSearchRecommendations" />
      </SettingsRow>

      <SettingsRow
        :title="t('settings.preference.focus.noRelatedVideosTitle')"
        :description="t('settings.preference.focus.noRelatedVideosDescription')"
      >
        <AoiSwitch v-model="settings.noRelatedVideos" />
      </SettingsRow>
    </SettingsPanel>

    <AoiDialog v-model:open="resetPreferenceConfirmOpen">
      <template #headline>{{ t("settings.resetPage.preference.title") }}</template>
      <p class="settings-note">{{ t("settings.resetPage.preference.description") }}</p>
      <template #actions>
        <AoiButton
          :disabled="resettingPreference"
          @click="resetPreferenceConfirmOpen = false"
        >
          {{ t("settings.resetPage.cancel") }}
        </AoiButton>
        <AoiButton tone="accent" variant="filled"
          icon="check"
          :loading="resettingPreference"
          @click="confirmResetPreference"
        >
          {{ t("settings.resetPage.confirm") }}
        </AoiButton>
      </template>
    </AoiDialog>
  </div>
</template>

<style scoped>
.settings-mode-card {
  min-height: 136px;
}

.settings-reveal-control {
  width: min(280px, 100%);
}

.settings-scrollbar-control {
  grid-template-columns: repeat(2, minmax(0, 1fr));
  width: 100%;
}

.settings-route-progress-control {
  width: min(280px, 100%);
}

.settings-row.settings-scrollbar-row {
  grid-template-columns: 1fr;
}

.settings-row.settings-scrollbar-row :deep(.settings-row__control) {
  justify-content: stretch;
}

.settings-reveal-slider-grid {
  display: grid;
  gap: var(--aoi-grid-gap-compact);
}
</style>
