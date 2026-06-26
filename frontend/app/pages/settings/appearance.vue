<script setup lang="ts">
import type {
  AoiDeveloperAssetActionResponse,
  AoiDeveloperAssetEntry,
  AoiDeveloperAssetListResponse,
  AoiDeveloperAssetUploadResponse
} from "~~/shared/types/developer-assets"
import type {
  AoiBuildProfileManifest,
  AoiSettingsProfile
} from "~/lib/aoiSettingsProfiles"
import type {
  AoiAppearanceContrast,
  AoiAppearanceDensity,
  AoiAppearanceShape,
  AoiAppearanceSize,
  AoiPreferredTheme
} from "~/stores/app-settings"
import type {
  AoiAccentPresetCardOption,
  AoiAccentPresetCards
} from "~/utils/aoiAccentPresets"
import {
  aoiPublicAssetPathToUrl,
  normalizeAoiAccentPresetCards
} from "~/utils/aoiAccentPresets"
import {
  normalizeAoiBuildDefaultAppSettings
} from "~/lib/aoiBuildDefaultSerialization"
import type {
  AoiContentWidthMode,
  AoiContentWidthPercentKey,
  AoiContentWidthScope,
  AoiSpecUnitKey
} from "~/utils/aoiSpecUnits"
import {
  AOI_CONTENT_WIDTH_PERCENT_RANGES,
  AOI_SPEC_UNIT_RANGES
} from "~/utils/aoiSpecUnits"
import type { AoiRgbaColor } from "~/utils/aoiColor"
import {
  aoiRgbaToCss
} from "~/utils/aoiColor"
import type { AoiAccentDerivedTone } from "~/utils/aoiAccentDerivation"
import {
  AOI_ACCENT_DERIVATION_STRENGTH_RANGE,
  AOI_ACCENT_DERIVED_TONES
} from "~/utils/aoiAccentDerivation"
import type {
  AoiDerivationPreset,
  AoiSettingDerivationStrengthKey
} from "~/utils/aoiSettingDerivation"
import {
  AOI_DERIVATION_PRESETS
} from "~/utils/aoiSettingDerivation"

const { t } = useI18n()
const settings = useAppSettingsStore()
const resetAppearanceConfirmOpen = ref(false)
const resettingAppearance = ref(false)
const showAdvancedSettings = computed(() => settings.settingsDisplayDepth === "all")
const canEditAccentCards = computed(() => false)
const accentCardEditorOpen = ref(false)
const accentCardConfirmOpen = ref(false)
const accentCardSaving = ref(false)
const accentCardBusy = ref("")
const accentCardError = ref("")
const accentCardAssetError = ref("")
const accentCardStatus = ref("")
const editingAccentPreset = ref<AoiAccentPresetCardOption | null>(null)
type ActivePersonaTool = "custom" | null
const activePersonaTool = ref<ActivePersonaTool>(null)
const accentCardDraft = reactive({
  backgroundImagePath: "",
  description: "",
  subtitle: "",
  title: ""
})
const assetCurrentPath = ref("")
const assetEntries = ref<AoiDeveloperAssetEntry[]>([])
const pendingAccentCardWrite = shallowRef<{
  fields: string[]
  nextCards: AoiAccentPresetCards
  profile: AoiSettingsProfile
  settings: ReturnType<typeof normalizeAoiBuildDefaultAppSettings>
} | null>(null)

interface DeveloperProfilesResponse {
  manifest: AoiBuildProfileManifest
  ok: boolean
  originalProfiles?: AoiSettingsProfile[]
  paths?: unknown
  profiles: AoiSettingsProfile[]
  updatedAt: string
}

const themeCards: Array<{ icon: string, label: string, value: AoiPreferredTheme }> = [
  { icon: "sun", label: "浅色主题", value: "light" },
  { icon: "moon", label: "深色主题", value: "dark" },
  { icon: "monitor-cog", label: "跟随系统", value: "system" }
]

interface AppearanceOption<T extends string> {
  description: string
  icon: string
  label: string
  value: T
}

const densityOptions = computed<Array<AppearanceOption<AoiAppearanceDensity>>>(() => [
  {
    icon: "panel-top-open",
    label: t("settings.appearance.density.comfortable.label"),
    description: t("settings.appearance.density.comfortable.description"),
    value: "comfortable"
  },
  {
    icon: "rows-3",
    label: t("settings.appearance.density.compact.label"),
    description: t("settings.appearance.density.compact.description"),
    value: "compact"
  }
])

const sizeOptions = computed<Array<AppearanceOption<AoiAppearanceSize>>>(() => [
  {
    icon: "minimize-2",
    label: t("settings.appearance.size.small.label"),
    description: t("settings.appearance.size.small.description"),
    value: "small"
  },
  {
    icon: "scan",
    label: t("settings.appearance.size.default.label"),
    description: t("settings.appearance.size.default.description"),
    value: "default"
  },
  {
    icon: "maximize-2",
    label: t("settings.appearance.size.large.label"),
    description: t("settings.appearance.size.large.description"),
    value: "large"
  }
])

const shapeOptions = computed<Array<AppearanceOption<AoiAppearanceShape>>>(() => [
  {
    icon: "square",
    label: t("settings.appearance.shape.square.label"),
    description: t("settings.appearance.shape.square.description"),
    value: "square"
  },
  {
    icon: "squircle",
    label: t("settings.appearance.shape.soft.label"),
    description: t("settings.appearance.shape.soft.description"),
    value: "soft"
  },
  {
    icon: "circle",
    label: t("settings.appearance.shape.pill.label"),
    description: t("settings.appearance.shape.pill.description"),
    value: "pill"
  }
])

const contrastOptions = computed<Array<AppearanceOption<AoiAppearanceContrast>>>(() => [
  {
    icon: "contrast",
    label: t("settings.appearance.contrast.normal.label"),
    description: t("settings.appearance.contrast.normal.description"),
    value: "normal"
  },
  {
    icon: "badge-alert",
    label: t("settings.appearance.contrast.high.label"),
    description: t("settings.appearance.contrast.high.description"),
    value: "high"
  }
])
const derivationPresetOptions = computed<Array<AppearanceOption<AoiDerivationPreset>>>(() => AOI_DERIVATION_PRESETS.map((value) => ({
  icon: value === "soft" ? "cloud" : value === "vivid" ? "sparkles" : value === "custom" ? "sliders-horizontal" : "circle-dot",
  label: t(`settings.derivation.presets.${value}.label`),
  description: t(`settings.derivation.presets.${value}.description`),
  value
})))
const themeDerivationKeys: AoiSettingDerivationStrengthKey[] = [
  "auxiliaryPalette",
  "surfaceTint",
  "stateLayer",
  "navigationColor",
  "materialColor",
  "shadowDepth"
]
const specDerivationKeys: AoiSettingDerivationStrengthKey[] = [
  "typography",
  "spacing",
  "radius",
  "controls",
  "contentWidth",
  "mediaGrid",
  "settingsLayout"
]

const specUnitControls: Array<{
  descriptionKey: string
  key: AoiSpecUnitKey
  labelKey: string
  titleKey: string
}> = [
  {
    key: "baseFontPx",
    titleKey: "settings.appearance.specUnits.baseFont.title",
    descriptionKey: "settings.appearance.specUnits.baseFont.description",
    labelKey: "settings.appearance.specUnits.baseFont.label"
  },
  {
    key: "spaceUnitPx",
    titleKey: "settings.appearance.specUnits.space.title",
    descriptionKey: "settings.appearance.specUnits.space.description",
    labelKey: "settings.appearance.specUnits.space.label"
  },
  {
    key: "radiusUnitPx",
    titleKey: "settings.appearance.specUnits.radius.title",
    descriptionKey: "settings.appearance.specUnits.radius.description",
    labelKey: "settings.appearance.specUnits.radius.label"
  },
  {
    key: "controlHeightPx",
    titleKey: "settings.appearance.specUnits.controlHeight.title",
    descriptionKey: "settings.appearance.specUnits.controlHeight.description",
    labelKey: "settings.appearance.specUnits.controlHeight.label"
  },
  {
    key: "railWidthPx",
    titleKey: "settings.appearance.specUnits.railWidth.title",
    descriptionKey: "settings.appearance.specUnits.railWidth.description",
    labelKey: "settings.appearance.specUnits.railWidth.label"
  },
  {
    key: "mobileNavHeightPx",
    titleKey: "settings.appearance.specUnits.mobileNavHeight.title",
    descriptionKey: "settings.appearance.specUnits.mobileNavHeight.description",
    labelKey: "settings.appearance.specUnits.mobileNavHeight.label"
  },
  {
    key: "videoGridMinCardWidthPx",
    titleKey: "settings.appearance.specUnits.videoGridMinCardWidth.title",
    descriptionKey: "settings.appearance.specUnits.videoGridMinCardWidth.description",
    labelKey: "settings.appearance.specUnits.videoGridMinCardWidth.label"
  },
  {
    key: "settingsCardMinWidthPx",
    titleKey: "settings.appearance.specUnits.settingsCardMinWidth.title",
    descriptionKey: "settings.appearance.specUnits.settingsCardMinWidth.description",
    labelKey: "settings.appearance.specUnits.settingsCardMinWidth.label"
  }
]

const contentWidthControls: Array<{
  descriptionKey: string
  labelKey: string
  modeKey: "contentWidthMode" | "contentWideWidthMode"
  percentKey: AoiContentWidthPercentKey
  pxKey: "contentMaxWidthPx" | "contentWideMaxWidthPx"
  scope: AoiContentWidthScope
  titleKey: string
}> = [
  {
    scope: "content",
    modeKey: "contentWidthMode",
    percentKey: "contentWidthPercent",
    pxKey: "contentMaxWidthPx",
    titleKey: "settings.appearance.specUnits.contentMaxWidth.title",
    descriptionKey: "settings.appearance.specUnits.contentMaxWidth.description",
    labelKey: "settings.appearance.specUnits.contentMaxWidth.label"
  },
  {
    scope: "wide",
    modeKey: "contentWideWidthMode",
    percentKey: "contentWideWidthPercent",
    pxKey: "contentWideMaxWidthPx",
    titleKey: "settings.appearance.specUnits.contentWideMaxWidth.title",
    descriptionKey: "settings.appearance.specUnits.contentWideMaxWidth.description",
    labelKey: "settings.appearance.specUnits.contentWideMaxWidth.label"
  }
]

const widthModeOptions = computed(() => [
  {
    icon: "ruler",
    label: t("settings.appearance.specUnits.widthMode.px"),
    value: "px"
  },
  {
    icon: "percent",
    label: t("settings.appearance.specUnits.widthMode.percent"),
    value: "percent"
  }
])

const customAccentModel = computed<AoiRgbaColor>({
  get: () => settings.customAccent,
  set: (value) => settings.setCustomAccent(value)
})
const defaultCustomAccent = computed(() => settings.activeDefaultCustomAccent())
const palettePresets = computed(() => settings.accentPresetCardOptions)
const customPersonaStyle = computed(() => ({
  "--persona-accent": aoiRgbaToCss(settings.customAccent)
}))
const imageAssetEntries = computed(() => assetEntries.value.filter((entry) => {
  return entry.kind === "directory" || entry.previewKind === "image"
}))
const accentPreviewTones = ["accent10", "accent20", "accent40", "accent50", "accent60"] as const
const accentDerivationIsDefault = computed(() => {
  return AOI_ACCENT_DERIVED_TONES.every((tone) => {
    return settings.accentDerivationStrengths[tone] === AOI_ACCENT_DERIVATION_STRENGTH_RANGE.default
  })
})
const accentDerivationControls = computed(() => AOI_ACCENT_DERIVED_TONES.map((tone) => ({
  tone,
  title: t(`settings.appearance.palette.derivation.tones.${tone}.title`),
  label: t(`settings.appearance.palette.derivation.tones.${tone}.label`)
})))
const themeDerivationControls = computed(() => themeDerivationKeys.map(createDerivationControl))
const specDerivationControls = computed(() => specDerivationKeys.map(createDerivationControl))

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
    })
  }
}

function accentDerivationDescription(tone: AoiAccentDerivedTone) {
  const current = t("settings.appearance.palette.derivation.toneDescription", {
    value: settings.accentDerivationStrengths[tone]
  })
  const affected = t(`settings.appearance.palette.derivation.tones.${tone}.affected`)

  return `${current} ${affected}`
}

function setAccentDerivationStrength(tone: AoiAccentDerivedTone, value: number) {
  settings.setAccentDerivationStrength(tone, value)
}

function setDerivationPreset(value: string) {
  settings.setDerivationPreset(value as AoiDerivationPreset)
}

function setSettingDerivationStrength(key: string, value: number) {
  settings.setSettingDerivationStrength(key as AoiSettingDerivationStrengthKey, value)
}

function setSpecUnit(key: AoiSpecUnitKey, value: number) {
  settings.setSpecUnit(key, value)
}

function setContentWidthMode(scope: AoiContentWidthScope, value: string) {
  settings.setContentWidthMode(scope, value as AoiContentWidthMode)
}

function setContentWidthValue(control: typeof contentWidthControls[number], value: number) {
  if (settings.specUnits[control.modeKey] === "percent") {
    settings.setContentWidthPercent(control.scope, value)
    return
  }

  settings.setSpecUnit(control.pxKey, value)
}

function contentWidthDescription(control: typeof contentWidthControls[number]) {
  const mode = settings.specUnits[control.modeKey]
  const value = mode === "percent"
    ? `${settings.specUnits[control.percentKey]}%`
    : `${settings.specUnits[control.pxKey]}px`

  return `${value} · ${t(control.descriptionKey)}`
}

function contentWidthSliderValue(control: typeof contentWidthControls[number]) {
  return settings.specUnits[control.modeKey] === "percent"
    ? settings.specUnits[control.percentKey]
    : settings.specUnits[control.pxKey]
}

function contentWidthSliderRange(control: typeof contentWidthControls[number]) {
  return settings.specUnits[control.modeKey] === "percent"
    ? AOI_CONTENT_WIDTH_PERCENT_RANGES[control.percentKey]
    : AOI_SPEC_UNIT_RANGES[control.pxKey]
}

function contentWidthSliderLabel(control: typeof contentWidthControls[number]) {
  const suffix = settings.specUnits[control.modeKey] === "percent"
    ? t("settings.appearance.specUnits.widthMode.percent")
    : t("settings.appearance.specUnits.widthMode.px")

  return `${t(control.labelKey)} (${suffix})`
}

function setAppearanceDensity(value: string) {
  settings.setAppearanceDensity(value as AoiAppearanceDensity)
}

function setAppearanceSize(value: string) {
  settings.setAppearanceSize(value as AoiAppearanceSize)
}

function setAppearanceShape(value: string) {
  settings.setAppearanceShape(value as AoiAppearanceShape)
}

function setAppearanceContrast(value: string) {
  settings.setAppearanceContrast(value as AoiAppearanceContrast)
}

function parentAssetPath(path: string) {
  const segments = path.split("/").filter(Boolean)

  segments.pop()
  return segments.join("/")
}

function accentCardImageUrl(path: string) {
  return path ? aoiPublicAssetPathToUrl(path) : ""
}

function personaPresetStyle(preset: AoiAccentPresetCardOption) {
  return {
    "--persona-10": preset.accent10,
    "--persona-20": preset.accent20,
    "--persona-40": preset.accent40,
    "--persona-50": preset.accent50,
    "--persona-60": preset.accent60,
    ...(preset.backgroundImageUrl ? { "--persona-image": `url("${preset.backgroundImageUrl}")` } : {})
  }
}

function selectPresetPersona(preset: AoiAccentPresetCardOption) {
  activePersonaTool.value = null
  settings.setAccentPreset(preset.value)
}

function selectCustomPersona() {
  activePersonaTool.value = "custom"
  settings.setCustomAccent(settings.customAccent)
}

function draftAccentCardConfig() {
  const preset = editingAccentPreset.value

  if (!preset) {
    return {}
  }

  const title = accentCardDraft.title.trim()
  const subtitle = accentCardDraft.subtitle.trim()
  const description = accentCardDraft.description.trim()
  const backgroundImagePath = accentCardDraft.backgroundImagePath.trim()
  const normalized = normalizeAoiAccentPresetCards({
    [preset.value]: {
      backgroundImagePath,
      description,
      subtitle: subtitle && subtitle !== preset.subtitle ? subtitle : "",
      title: title && title !== preset.label ? title : ""
    }
  })

  return normalized[preset.value] || {}
}

function formatAccentCardConfig(value: unknown) {
  const preset = editingAccentPreset.value

  if (!preset) {
    return "{}"
  }

  return JSON.stringify(normalizeAoiAccentPresetCards({ [preset.value]: value })[preset.value] || {}, null, 2)
}

function openAccentCardEditor(preset: AoiAccentPresetCardOption) {
  editingAccentPreset.value = preset
  accentCardDraft.title = preset.cardTitle
  accentCardDraft.subtitle = preset.cardSubtitle
  accentCardDraft.description = preset.cardDescription
  accentCardDraft.backgroundImagePath = preset.backgroundImagePath
  accentCardError.value = ""
  accentCardAssetError.value = ""
  accentCardStatus.value = ""
  accentCardEditorOpen.value = true
  void loadPublicAssets(parentAssetPath(preset.backgroundImagePath))
}

function closeAccentCardEditor() {
  accentCardEditorOpen.value = false
  editingAccentPreset.value = null
  pendingAccentCardWrite.value = null
  accentCardConfirmOpen.value = false
  accentCardBusy.value = ""
  accentCardAssetError.value = ""
}

async function requestDeveloperAssets<T>(body: Record<string, unknown>) {
  return await $fetch<T>("/api/developer/assets", {
    method: "POST",
    body: {
      rootId: "public",
      ...body
    }
  })
}

async function loadPublicAssets(path = assetCurrentPath.value) {
  accentCardBusy.value = "assets"
  accentCardAssetError.value = ""

  try {
    const response = await requestDeveloperAssets<AoiDeveloperAssetListResponse>({
      action: "list",
      path
    })

    assetCurrentPath.value = response.currentPath
    assetEntries.value = response.entries
  } catch {
    assetCurrentPath.value = ""
    assetEntries.value = []
    accentCardAssetError.value = t("settings.appearance.palette.cards.errors.loadAssets")
  } finally {
    accentCardBusy.value = ""
  }
}

function openAssetDirectory(entry: AoiDeveloperAssetEntry) {
  if (entry.kind === "directory") {
    void loadPublicAssets(entry.path)
  }
}

function goAssetParent() {
  void loadPublicAssets(parentAssetPath(assetCurrentPath.value))
}

function selectAssetImage(entry: AoiDeveloperAssetEntry) {
  if (entry.kind === "file" && entry.previewKind === "image") {
    accentCardDraft.backgroundImagePath = entry.path
  }
}

function clearAccentCardImage() {
  accentCardDraft.backgroundImagePath = ""
}

function safeUploadFilename(file: File) {
  const extension = file.name.match(/\.[a-z0-9]+$/i)?.[0].toLowerCase() || ".png"
  const base = file.name
    .replace(/\.[^.]+$/, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 36) || "theme-card"

  return `${base}-${Date.now().toString(36)}${extension}`
}

async function ensureThemeCardAssetDirectory() {
  try {
    await requestDeveloperAssets<AoiDeveloperAssetActionResponse>({
      action: "createDirectory",
      name: "theme-card-backgrounds",
      path: ""
    })
  } catch (error) {
    const statusCode = error && typeof error === "object" && "statusCode" in error
      ? Number((error as { statusCode?: number }).statusCode)
      : 0

    if (statusCode !== 409) {
      throw error
    }
  }
}

async function onAccentCardUpload(files: File[]) {
  const file = files[0]

  if (!file) {
    return
  }

  if (!file.type.startsWith("image/")) {
    accentCardError.value = t("settings.appearance.palette.cards.errors.imageOnly")
    return
  }

  accentCardBusy.value = "upload"
  accentCardError.value = ""
  accentCardAssetError.value = ""

  try {
    await ensureThemeCardAssetDirectory()

    const form = new FormData()
    const uploadFile = new File([file], safeUploadFilename(file), { type: file.type })

    form.append("rootId", "public")
    form.append("path", "theme-card-backgrounds")
    form.append("overwrite", "false")
    form.append("files", uploadFile)

    const response = await $fetch<AoiDeveloperAssetUploadResponse>("/api/developer/assets/upload", {
      method: "POST",
      body: form
    })
    const uploaded = response.uploaded.find((entry) => entry.previewKind === "image")

    if (uploaded) {
      accentCardDraft.backgroundImagePath = uploaded.path
      assetCurrentPath.value = response.currentPath
      assetEntries.value = response.entries
    }
  } catch {
    accentCardError.value = t("settings.appearance.palette.cards.errors.upload")
  } finally {
    accentCardBusy.value = ""
  }
}

async function loadBuildProfiles() {
  return await $fetch<DeveloperProfilesResponse>("/api/developer/profiles", {
    method: "POST",
    body: { action: "listBuild" }
  })
}

async function prepareAccentCardWrite() {
  const preset = editingAccentPreset.value

  if (!preset) {
    return
  }

  accentCardBusy.value = "prepare"
  accentCardError.value = ""

  try {
    const response = await loadBuildProfiles()
    const activeId = response.manifest.activeProfileId
    const profile = response.profiles.find((item) => item.id === activeId) || response.profiles[0]

    if (!profile) {
      accentCardError.value = t("settings.appearance.palette.cards.errors.profile")
      return
    }

    const currentCards = normalizeAoiAccentPresetCards(profile.settings.accentPresetCards || settings.accentPresetCards)
    const nextCards = { ...currentCards }
    const nextCard = draftAccentCardConfig()

    if (Object.keys(nextCard).length) {
      nextCards[preset.value] = nextCard
    } else {
      delete nextCards[preset.value]
    }

    const normalizedCards = normalizeAoiAccentPresetCards(nextCards)

    if (JSON.stringify(currentCards) === JSON.stringify(normalizedCards)) {
      accentCardStatus.value = t("settings.appearance.palette.cards.noChanges")
      return
    }

    const nextSettings = normalizeAoiBuildDefaultAppSettings({
      ...profile.settings,
      accentPresetCards: normalizedCards
    })
    const fields = profile.fields.includes("accentPresetCards")
      ? [...profile.fields]
      : [...profile.fields, "accentPresetCards"]

    pendingAccentCardWrite.value = {
      fields,
      nextCards: normalizedCards,
      profile,
      settings: nextSettings
    }
    accentCardConfirmOpen.value = true
  } catch {
    accentCardError.value = t("settings.appearance.palette.cards.errors.profile")
  } finally {
    accentCardBusy.value = ""
  }
}

async function confirmAccentCardWrite() {
  const pending = pendingAccentCardWrite.value

  if (!pending) {
    return
  }

  accentCardSaving.value = true
  accentCardError.value = ""

  try {
    const response = await $fetch<DeveloperProfilesResponse>("/api/developer/profiles", {
      method: "POST",
      body: {
        action: "writeBuild",
        fields: pending.fields,
        id: pending.profile.id,
        settings: pending.settings
      }
    })
    const activeProfile = response.profiles.find((profile) => profile.id === response.manifest.activeProfileId)

    settings.setBuildAccentPresetCards(activeProfile?.settings.accentPresetCards || pending.nextCards)
    accentCardStatus.value = t("settings.appearance.palette.cards.saved")
    accentCardConfirmOpen.value = false
    accentCardEditorOpen.value = false
    editingAccentPreset.value = null
    pendingAccentCardWrite.value = null
  } catch {
    accentCardError.value = t("settings.appearance.palette.cards.errors.save")
  } finally {
    accentCardSaving.value = false
  }
}

async function onBackgroundChange(files: File[]) {
  const file = files[0]

  if (file) {
    await settings.setBackgroundFile(file)
  }
}

async function confirmResetAppearance() {
  resettingAppearance.value = true

  try {
    await settings.resetAppearance()
    resetAppearanceConfirmOpen.value = false
  } finally {
    resettingAppearance.value = false
  }
}

function formatBytes(value: number) {
  if (!value) {
    return "未上传"
  }

  if (value < 1024 * 1024) {
    return `${Math.round(value / 1024)}KB`
  }

  return `${(value / 1024 / 1024).toFixed(1)}MB`
}
</script>

<template>
  <div class="settings-page">
    <SettingsPageHeader
      title="外观"
      description="用主题、个性色和本地背景图把 Aoi 调成自己的样子。"
    >
      <template #actions>
        <AoiButton tone="accent"
          variant="outlined"
          size="sm"
          icon="rotate-ccw"
          :disabled="!settings.hydrated || resettingAppearance"
          @click="resetAppearanceConfirmOpen = true"
        >
          {{ t("settings.resetPage.action") }}
        </AoiButton>
      </template>
    </SettingsPageHeader>

    <SettingsPanel
      icon="sun-moon"
      title="主题"
      description="切换浅色、深色或跟随系统。"
    >
      <SettingsOptionGrid>
        <AoiChoiceCard
          v-for="item in themeCards"
          :key="item.value"
          :value="item.value"
          :title="item.label"
          :icon="item.icon"
          :selected="settings.preferredTheme === item.value"
          @select="settings.setPreferredTheme(item.value)"
        />
      </SettingsOptionGrid>
    </SettingsPanel>

    <SettingsPanel
      id="appearance-spec-presets"
      icon="sliders-horizontal"
      :title="t('settings.appearance.form.title')"
      :description="t('settings.appearance.form.description')"
    >
      <template v-if="showAdvancedSettings" #actions>
        <AoiButton tone="accent"
          variant="outlined"
          size="sm"
          icon="ruler"
          to="/settings/appearance#appearance-spec-units"
        >
          {{ t("settings.appearance.specUnits.jump") }}
        </AoiButton>
      </template>

      <div class="settings-form-grid">
        <section class="settings-form-group">
          <div class="settings-form-group__copy">
            <strong>{{ t("settings.appearance.form.densityTitle") }}</strong>
            <span>{{ t("settings.appearance.form.densityDescription") }}</span>
          </div>
          <AoiSegmentedControl
            :model-value="settings.appearanceDensity"
            :items="densityOptions"
            :aria-label="t('settings.appearance.form.densityTitle')"
            :columns="2"
            @update:model-value="setAppearanceDensity"
          />
        </section>

        <section class="settings-form-group">
          <div class="settings-form-group__copy">
            <strong>{{ t("settings.appearance.form.sizeTitle") }}</strong>
            <span>{{ t("settings.appearance.form.sizeDescription") }}</span>
          </div>
          <AoiSegmentedControl
            :model-value="settings.appearanceSize"
            :items="sizeOptions"
            :aria-label="t('settings.appearance.form.sizeTitle')"
            :columns="3"
            @update:model-value="setAppearanceSize"
          />
        </section>

        <section class="settings-form-group">
          <div class="settings-form-group__copy">
            <strong>{{ t("settings.appearance.form.shapeTitle") }}</strong>
            <span>{{ t("settings.appearance.form.shapeDescription") }}</span>
          </div>
          <AoiSegmentedControl
            :model-value="settings.appearanceShape"
            :items="shapeOptions"
            :aria-label="t('settings.appearance.form.shapeTitle')"
            :columns="3"
            @update:model-value="setAppearanceShape"
          />
        </section>

        <section class="settings-form-group">
          <div class="settings-form-group__copy">
            <strong>{{ t("settings.appearance.form.contrastTitle") }}</strong>
            <span>{{ t("settings.appearance.form.contrastDescription") }}</span>
          </div>
          <AoiSegmentedControl
            :model-value="settings.appearanceContrast"
            :items="contrastOptions"
            :aria-label="t('settings.appearance.form.contrastTitle')"
            :columns="2"
            @update:model-value="setAppearanceContrast"
          />
        </section>
      </div>

      <SettingsRow
        :title="t('settings.appearance.form.colorfulNavTitle')"
        :description="t('settings.appearance.form.colorfulNavDescription')"
      >
        <AoiSwitch v-model="settings.colorfulNavigation" />
      </SettingsRow>

      <SettingsRow
        v-if="showAdvancedSettings"
        :title="t('settings.derivation.presetTitle')"
        :description="t('settings.derivation.presetDescription')"
      >
        <AoiSegmentedControl
          :model-value="settings.derivationPreset"
          :items="derivationPresetOptions"
          :columns="2"
          :aria-label="t('settings.derivation.presetTitle')"
          @update:model-value="setDerivationPreset"
        />
      </SettingsRow>
    </SettingsPanel>

    <SettingsPanel
      v-if="showAdvancedSettings"
      id="appearance-spec-units"
      icon="ruler"
      :title="t('settings.appearance.specUnits.title')"
      :description="t('settings.appearance.specUnits.description')"
    >
      <template #actions>
        <AoiButton tone="accent"
          variant="outlined"
          size="sm"
          icon="rotate-ccw"
          @click="settings.resetSpecUnits()"
        >
          {{ t("settings.appearance.specUnits.reset") }}
        </AoiButton>
      </template>

      <div class="settings-spec-grid">
        <SettingsRow
          v-for="control in contentWidthControls"
          :key="control.scope"
          :title="t(control.titleKey)"
          :description="contentWidthDescription(control)"
        >
          <div class="settings-width-control">
            <AoiSegmentedControl
              class="settings-width-mode"
              :model-value="settings.specUnits[control.modeKey]"
              :items="widthModeOptions"
              :aria-label="t(control.titleKey)"
              :columns="2"
              @update:model-value="(value) => setContentWidthMode(control.scope, value)"
            />
            <AoiSlider
              class="settings-spec-slider"
              :model-value="contentWidthSliderValue(control)"
              :label="contentWidthSliderLabel(control)"
              :min="contentWidthSliderRange(control).min"
              :max="contentWidthSliderRange(control).max"
              :step="contentWidthSliderRange(control).step"
              @update:model-value="(value) => setContentWidthValue(control, value)"
            />
          </div>
        </SettingsRow>

        <SettingsRow
          v-for="control in specUnitControls"
          :key="control.key"
          :title="t(control.titleKey)"
          :description="`${settings.specUnits[control.key]}px · ${t(control.descriptionKey)}`"
        >
          <AoiSlider
            class="settings-spec-slider"
            :model-value="settings.specUnits[control.key]"
            :label="t(control.labelKey)"
            :min="AOI_SPEC_UNIT_RANGES[control.key].min"
            :max="AOI_SPEC_UNIT_RANGES[control.key].max"
            :step="AOI_SPEC_UNIT_RANGES[control.key].step"
            @update:model-value="(value) => setSpecUnit(control.key, value)"
          />
        </SettingsRow>
      </div>

      <div class="settings-derivation-section">
        <div class="settings-derivation-section__header">
          <strong>{{ t("settings.derivation.specTitle") }}</strong>
          <span>{{ t("settings.derivation.specDescription") }}</span>
        </div>
        <SettingsDerivationControlGrid
          :controls="specDerivationControls"
          @update="setSettingDerivationStrength"
        />
      </div>
    </SettingsPanel>

    <SettingsPanel
      icon="swatch-book"
      :title="t('settings.appearance.palette.title')"
      :description="t('settings.appearance.palette.description')"
    >
      <template v-if="showAdvancedSettings" #actions>
        <AoiButton tone="accent"
          variant="outlined"
          size="sm"
          icon="rotate-ccw"
          :disabled="accentDerivationIsDefault"
          @click="settings.resetAccentDerivationStrengths()"
        >
          {{ t("settings.appearance.palette.derivation.reset") }}
        </AoiButton>
      </template>

      <div class="settings-persona-grid">
        <div
          v-for="preset in palettePresets"
          :key="preset.value"
          class="settings-persona-card-wrap"
        >
          <button
            class="settings-persona-card settings-persona-card--preset"
            :class="{
              'settings-persona-card--selected': settings.accentMode === 'preset' && settings.accentPreset === preset.value,
              'settings-persona-card--with-image': preset.backgroundImageUrl
            }"
            type="button"
            :aria-pressed="settings.accentMode === 'preset' && settings.accentPreset === preset.value"
            :style="personaPresetStyle(preset)"
            @click="selectPresetPersona(preset)"
          >
            <span class="settings-persona-card__hero">
              <span class="settings-persona-card__art" aria-hidden="true" />
              <span class="settings-persona-card__copy">
                <strong>{{ preset.cardTitle }}</strong>
                <small>{{ preset.cardSubtitle }}</small>
              </span>
              <AoiIcon class="settings-persona-card__mark" name="palette" :size="20" decorative />
              <span v-if="preset.cardDescription" class="settings-persona-card__description">
                {{ preset.cardDescription }}
              </span>
            </span>
            <span class="settings-persona-card__caption">
              <span>{{ preset.cardTitle }}</span>
              <AoiIcon
                v-if="settings.accentMode === 'preset' && settings.accentPreset === preset.value"
                name="circle-check"
                :size="18"
                decorative
              />
            </span>
          </button>
          <AoiIconButton
            v-if="canEditAccentCards"
            class="settings-persona-card__edit"
            icon="image-plus"
            size="sm"
            variant="tonal"
            :label="t('settings.appearance.palette.cards.editAria', { title: preset.cardTitle })"
            @click.stop="openAccentCardEditor(preset)"
          />
        </div>

        <button
          class="settings-persona-card settings-persona-card--custom"
          :class="{ 'settings-persona-card--selected': settings.accentMode === 'custom' }"
          type="button"
          :aria-pressed="settings.accentMode === 'custom'"
          :style="customPersonaStyle"
          @click="selectCustomPersona"
        >
          <span class="settings-persona-card__hero">
            <span class="settings-persona-card__art" aria-hidden="true" />
            <span class="settings-persona-card__copy">
              <strong>{{ t("settings.appearance.palette.persona.customTitle") }}</strong>
              <small>{{ t("settings.appearance.palette.persona.customSubtitle") }}</small>
            </span>
            <AoiIcon class="settings-persona-card__mark" name="pencil" :size="21" decorative />
          </span>
          <span class="settings-persona-card__caption">
            <span>{{ t("settings.appearance.palette.persona.customCaption") }}</span>
            <AoiIcon
              v-if="settings.accentMode === 'custom'"
              name="circle-check"
              :size="18"
              decorative
            />
          </span>
        </button>
      </div>
      <p v-if="accentCardStatus" class="settings-note">{{ accentCardStatus }}</p>

      <div v-if="activePersonaTool === 'custom'" class="settings-persona-tool settings-persona-tool--custom">
        <AoiColorPalette
          v-model="customAccentModel"
          :label="t('settings.appearance.palette.customTitle')"
          :reset-label="t('components.colorPalette.reset')"
          :reset-value="defaultCustomAccent"
        />
      </div>

      <div v-if="showAdvancedSettings" class="settings-accent-derivation">
        <div class="settings-accent-derivation__header">
          <strong>{{ t("settings.appearance.palette.derivation.title") }}</strong>
          <span>{{ t("settings.appearance.palette.derivation.description") }}</span>
        </div>

        <div
          class="settings-accent-preview"
          :aria-label="t('settings.appearance.palette.derivation.preview')"
        >
          <span
            v-for="tone in accentPreviewTones"
            :key="tone"
            :style="{ background: settings.accentScale[tone] }"
            :title="tone"
            :aria-label="tone"
          />
        </div>

        <div class="settings-accent-derivation__grid">
          <SettingsRow
            v-for="control in accentDerivationControls"
            :key="control.tone"
            :title="control.title"
            :description="accentDerivationDescription(control.tone)"
          >
            <div class="settings-accent-strength-control">
              <AoiSlider
                class="settings-accent-strength-control__slider"
                :model-value="settings.accentDerivationStrengths[control.tone]"
                :label="control.label"
                :min="AOI_ACCENT_DERIVATION_STRENGTH_RANGE.min"
                :max="AOI_ACCENT_DERIVATION_STRENGTH_RANGE.max"
                :step="AOI_ACCENT_DERIVATION_STRENGTH_RANGE.step"
                @update:model-value="(value) => setAccentDerivationStrength(control.tone, value)"
              />
              <span class="settings-accent-strength-control__value">
                {{ settings.accentDerivationStrengths[control.tone] }}%
              </span>
            </div>
          </SettingsRow>
        </div>
      </div>

      <div v-if="showAdvancedSettings" class="settings-derivation-section">
        <div class="settings-derivation-section__header">
          <strong>{{ t("settings.derivation.themeTitle") }}</strong>
          <span>{{ t("settings.derivation.themeDescription") }}</span>
        </div>
        <SettingsDerivationControlGrid
          :controls="themeDerivationControls"
          @update="setSettingDerivationStrength"
        />
      </div>
    </SettingsPanel>

    <SettingsPanel
      icon="image"
      :title="t('settings.appearance.palette.persona.backgroundTitle')"
      :description="t('settings.appearance.palette.persona.backgroundDescription')"
    >
      <div class="settings-background-panel">
        <div class="settings-background-panel__toolbar">
          <AoiActionBar size="sm" align="start">
            <AoiFileInput accept="image/png,image/jpeg,image/webp" @change="onBackgroundChange">
              <template #default="{ open }">
                <AoiButton tone="accent" variant="filled" size="sm" icon="upload" @click="open">
                  {{ t("settings.appearance.palette.persona.backgroundUpload") }}
                </AoiButton>
              </template>
            </AoiFileInput>
            <AoiButton
              size="sm"
              icon="x"
              :disabled="!settings.backgroundImageId"
              @click="settings.clearBackground()"
            >
              {{ t("settings.appearance.palette.persona.backgroundClear") }}
            </AoiButton>
          </AoiActionBar>
        </div>

        <div class="settings-background-tiles" aria-live="polite">
          <div class="settings-background-tile settings-background-tile--empty">
            <AoiIcon name="ban" :size="30" decorative />
            <span>{{ t("settings.appearance.palette.persona.backgroundEmpty") }}</span>
          </div>
          <div
            v-if="settings.backgroundObjectUrl"
            class="settings-background-tile settings-background-tile--image"
            :style="{ backgroundImage: `url(${settings.backgroundObjectUrl})` }"
          >
            <span>{{ settings.backgroundFileName }}</span>
          </div>
        </div>

        <p class="settings-note">
          {{ settings.backgroundFileName || t("settings.appearance.palette.persona.backgroundDefault") }}
          <span v-if="settings.backgroundFileSize"> · {{ formatBytes(settings.backgroundFileSize) }}</span>
        </p>
        <p v-if="settings.backgroundError" class="settings-error">{{ settings.backgroundError }}</p>

        <div class="settings-slider-grid">
          <AoiSlider
            v-model="settings.backgroundOpacity"
            :label="t('settings.appearance.palette.persona.backgroundOpacity')"
            :min="0"
            :max="1"
            :step="0.05"
          />
          <AoiSlider
            v-model="settings.backgroundBlur"
            :label="t('settings.appearance.palette.persona.backgroundBlur')"
            :min="0"
            :max="24"
            :step="1"
          />
          <AoiSlider
            v-model="settings.backgroundDim"
            :label="t('settings.appearance.palette.persona.backgroundDim')"
            :min="0"
            :max="0.9"
            :step="0.05"
          />
        </div>
      </div>
    </SettingsPanel>

    <SettingsPanel
      icon="rotate-ccw"
      :title="t('settings.resetPage.appearance.title')"
      :description="t('settings.resetPage.appearance.description')"
    >
      <AoiButton tone="accent"
        variant="outlined"
        icon="rotate-ccw"
        :disabled="!settings.hydrated || resettingAppearance"
        @click="resetAppearanceConfirmOpen = true"
      >
        {{ t("settings.resetPage.action") }}
      </AoiButton>
    </SettingsPanel>

    <AoiDialog v-model:open="accentCardEditorOpen" @closed="closeAccentCardEditor">
      <template #headline>
        {{ t("settings.appearance.palette.cards.dialogTitle") }}
      </template>

      <div v-if="editingAccentPreset" class="settings-accent-card-editor">
        <div
          class="settings-accent-card-editor__preview"
          :class="{ 'settings-accent-card-editor__preview--empty': !accentCardDraft.backgroundImagePath }"
          :style="{ backgroundImage: accentCardDraft.backgroundImagePath ? `url(${accentCardImageUrl(accentCardDraft.backgroundImagePath)})` : undefined }"
        >
          <span>
            {{ accentCardDraft.title || editingAccentPreset.label }}
            <small>{{ accentCardDraft.subtitle || editingAccentPreset.subtitle }}</small>
          </span>
        </div>

        <div class="settings-accent-card-editor__fields">
          <AoiTextField
            v-model="accentCardDraft.title"
            appearance="outlined"
            :label="t('settings.appearance.palette.cards.titleLabel')"
            :max-length="48"
          />
          <AoiTextField
            v-model="accentCardDraft.subtitle"
            appearance="outlined"
            :label="t('settings.appearance.palette.cards.subtitleLabel')"
            :max-length="64"
          />
          <AoiTextField
            v-model="accentCardDraft.description"
            appearance="outlined"
            multiline
            :rows="3"
            :label="t('settings.appearance.palette.cards.descriptionLabel')"
            :max-length="180"
          />
          <AoiTextField
            v-model="accentCardDraft.backgroundImagePath"
            appearance="outlined"
            icon="image"
            :label="t('settings.appearance.palette.cards.imagePathLabel')"
            :placeholder="t('settings.appearance.palette.cards.imagePathPlaceholder')"
          />
        </div>

        <div class="settings-accent-card-assets">
          <div class="settings-accent-card-assets__toolbar">
            <strong>{{ t("settings.appearance.palette.cards.assetsTitle") }}</strong>
            <span>{{ assetCurrentPath || "/" }}</span>
            <AoiActionBar size="sm" align="end">
              <AoiButton
                size="sm"
                icon="corner-up-left"
                :disabled="!assetCurrentPath || Boolean(accentCardBusy)"
                @click="goAssetParent"
              >
                {{ t("settings.appearance.palette.cards.parent") }}
              </AoiButton>
              <AoiButton
                size="sm"
                icon="refresh-cw"
                :disabled="Boolean(accentCardBusy)"
                @click="loadPublicAssets()"
              >
                {{ t("settings.appearance.palette.cards.refresh") }}
              </AoiButton>
              <AoiFileInput
                accept="image/png,image/jpeg,image/webp,image/gif,image/avif,image/svg+xml"
                :disabled="Boolean(accentCardBusy)"
                @change="onAccentCardUpload"
              >
                <template #default="{ open }">
                  <AoiButton tone="accent"
                    variant="outlined"
                    size="sm"
                    icon="upload"
                    :disabled="Boolean(accentCardBusy)"
                    @click="open"
                  >
                    {{ t("settings.appearance.palette.cards.upload") }}
                  </AoiButton>
                </template>
              </AoiFileInput>
              <AoiButton
                size="sm"
                icon="x"
                :disabled="!accentCardDraft.backgroundImagePath"
                @click="clearAccentCardImage"
              >
                {{ t("settings.appearance.palette.cards.clearImage") }}
              </AoiButton>
            </AoiActionBar>
          </div>

          <div v-if="accentCardAssetError" class="settings-accent-card-assets__error">
            <span>{{ accentCardAssetError }}</span>
            <AoiButton tone="accent"
              variant="outlined"
              size="sm"
              icon="refresh-cw"
              :disabled="Boolean(accentCardBusy)"
              @click="loadPublicAssets()"
            >
              {{ t("settings.appearance.palette.cards.retry") }}
            </AoiButton>
          </div>

          <div v-else v-aoi-scroll-native class="settings-accent-card-assets__list">
            <button
              v-for="entry in imageAssetEntries"
              :key="`${entry.kind}:${entry.path}`"
              class="settings-accent-card-assets__item"
              :class="{
                'settings-accent-card-assets__item--directory': entry.kind === 'directory',
                'settings-accent-card-assets__item--selected': entry.path === accentCardDraft.backgroundImagePath
              }"
              type="button"
              @click="entry.kind === 'directory' ? openAssetDirectory(entry) : selectAssetImage(entry)"
              @dblclick="entry.kind === 'directory' ? openAssetDirectory(entry) : selectAssetImage(entry)"
            >
              <span
                v-if="entry.kind === 'file'"
                class="settings-accent-card-assets__thumb"
                :style="{ backgroundImage: `url(${entry.publicUrl || accentCardImageUrl(entry.path)})` }"
              />
              <AoiIcon v-else name="folder" :size="18" decorative />
              <span>{{ entry.name }}</span>
            </button>
            <p v-if="!imageAssetEntries.length" class="settings-note">
              {{ t("settings.appearance.palette.cards.emptyAssets") }}
            </p>
          </div>
        </div>

        <p v-if="accentCardError" class="settings-error">{{ accentCardError }}</p>
      </div>

      <template #actions>
        <AoiButton
          :disabled="accentCardSaving"
          @click="closeAccentCardEditor"
        >
          {{ t("settings.appearance.palette.cards.cancel") }}
        </AoiButton>
        <AoiButton tone="accent" variant="filled"
          icon="save"
          :loading="accentCardBusy === 'prepare'"
          :disabled="accentCardSaving || Boolean(accentCardBusy)"
          @click="prepareAccentCardWrite"
        >
          {{ t("settings.appearance.palette.cards.save") }}
        </AoiButton>
      </template>
    </AoiDialog>

    <AoiDialog v-model:open="accentCardConfirmOpen">
      <template #headline>
        {{ t("settings.appearance.palette.cards.confirmTitle") }}
      </template>

      <div class="settings-accent-card-confirm">
        <p>{{ t("settings.appearance.palette.cards.confirmDescription") }}</p>
        <div class="settings-accent-card-confirm__diff">
          <section>
            <strong>{{ t("settings.appearance.palette.cards.before") }}</strong>
            <code>{{ formatAccentCardConfig(editingAccentPreset ? settings.accentPresetCards[editingAccentPreset.value] : undefined) }}</code>
          </section>
          <AoiIcon name="arrow-right" :size="18" decorative />
          <section>
            <strong>{{ t("settings.appearance.palette.cards.after") }}</strong>
            <code>{{ formatAccentCardConfig(editingAccentPreset && pendingAccentCardWrite ? pendingAccentCardWrite.nextCards[editingAccentPreset.value] : undefined) }}</code>
          </section>
        </div>
        <p v-if="accentCardError" class="settings-error">{{ accentCardError }}</p>
      </div>

      <template #actions>
        <AoiButton
          :disabled="accentCardSaving"
          @click="accentCardConfirmOpen = false"
        >
          {{ t("settings.appearance.palette.cards.cancel") }}
        </AoiButton>
        <AoiButton tone="accent" variant="filled"
          icon="check"
          :loading="accentCardSaving"
          @click="confirmAccentCardWrite"
        >
          {{ t("settings.appearance.palette.cards.confirmSave") }}
        </AoiButton>
      </template>
    </AoiDialog>

    <AoiDialog v-model:open="resetAppearanceConfirmOpen">
      <template #headline>{{ t("settings.resetPage.appearance.title") }}</template>
      <p class="settings-note">{{ t("settings.resetPage.appearance.description") }}</p>
      <template #actions>
        <AoiButton
          :disabled="resettingAppearance"
          @click="resetAppearanceConfirmOpen = false"
        >
          {{ t("settings.resetPage.cancel") }}
        </AoiButton>
        <AoiButton tone="accent" variant="filled"
          icon="check"
          :loading="resettingAppearance"
          @click="confirmResetAppearance"
        >
          {{ t("settings.resetPage.confirm") }}
        </AoiButton>
      </template>
    </AoiDialog>
  </div>
</template>

<style scoped>
.settings-form-grid {
  display: grid;
  gap: var(--aoi-grid-gap-compact);
}

.settings-form-group {
  display: grid;
  grid-template-columns: minmax(0, .42fr) minmax(0, 1fr);
  gap: var(--aoi-grid-gap);
  align-items: stretch;
  border: 1px solid var(--aoi-border);
  border-radius: var(--aoi-radius-card);
  background: var(--aoi-control-bg);
  padding: var(--aoi-row-padding);
}

.settings-form-group__copy {
  display: grid;
  align-content: center;
  gap: max(4px, calc(var(--aoi-grid-gap-compact) - 8px));
}

.settings-form-group__copy strong,
.settings-form-group__copy span {
  margin: 0;
}

.settings-form-group__copy strong {
  color: var(--aoi-text);
}

.settings-form-group__copy span {
  color: var(--aoi-text-muted);
  line-height: 1.7;
}

.settings-persona-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(260px, 100%), 1fr));
  gap: calc(var(--aoi-grid-gap-compact) + 2px);
}

.settings-persona-card-wrap {
  position: relative;
  min-width: 0;
}

.settings-persona-card {
  display: grid;
  width: 100%;
  min-width: 0;
  gap: 8px;
  border: 0;
  background: transparent;
  color: var(--aoi-text);
  cursor: pointer;
  font: inherit;
  text-align: left;
}

.settings-persona-card:focus-visible {
  outline: 3px solid var(--aoi-focus);
  outline-offset: 3px;
}

.settings-persona-card__hero {
  position: relative;
  display: grid;
  min-height: 142px;
  overflow: hidden;
  border: 1px solid var(--aoi-border);
  border-radius: var(--aoi-radius-card);
  background:
    radial-gradient(circle at 78% 70%, color-mix(in srgb, white 92%, transparent) 0 15%, transparent 16%),
    radial-gradient(circle at 76% 74%, color-mix(in srgb, var(--persona-60, var(--aoi-accent-60)) 88%, transparent) 0 21%, transparent 22%),
    linear-gradient(135deg, var(--persona-20, var(--aoi-accent-20)), var(--persona-50, var(--aoi-accent-50)) 58%, var(--persona-60, var(--aoi-accent-60))),
    var(--aoi-surface-muted);
  background-position: center;
  background-size: cover;
  box-shadow: var(--aoi-shadow-sm);
  transition:
    border-color .18s ease,
    box-shadow .18s ease,
    transform .18s ease;
  aspect-ratio: 16 / 9;
  isolation: isolate;
}

.settings-persona-card__hero::before,
.settings-persona-card__hero::after {
  position: absolute;
  inset: 0;
  content: "";
  pointer-events: none;
}

.settings-persona-card__hero::before {
  z-index: -2;
  background:
    linear-gradient(135deg, color-mix(in srgb, var(--persona-10, var(--aoi-accent-10)) 78%, white), transparent 56%),
    radial-gradient(circle at 26% 62%, color-mix(in srgb, white 28%, transparent), transparent 28%);
}

.settings-persona-card__hero::after {
  z-index: -1;
  background:
    linear-gradient(90deg, color-mix(in srgb, white 68%, transparent), transparent 62%),
    linear-gradient(180deg, transparent 44%, color-mix(in srgb, var(--persona-10, var(--aoi-accent-10)) 68%, transparent));
}

.settings-persona-card--with-image .settings-persona-card__hero {
  background:
    linear-gradient(90deg, color-mix(in srgb, white 70%, transparent), transparent 58%),
    linear-gradient(135deg, color-mix(in srgb, var(--persona-20, var(--aoi-accent-20)) 68%, transparent), color-mix(in srgb, var(--persona-50, var(--aoi-accent-50)) 32%, transparent)),
    var(--persona-image),
    linear-gradient(135deg, var(--persona-20, var(--aoi-accent-20)), var(--persona-60, var(--aoi-accent-60)));
  background-position: center;
  background-size: cover;
}

.settings-persona-card--with-image .settings-persona-card__hero::before {
  background:
    linear-gradient(135deg, color-mix(in srgb, var(--persona-10, var(--aoi-accent-10)) 74%, transparent), transparent 62%),
    linear-gradient(180deg, color-mix(in srgb, white 32%, transparent), transparent);
}

.settings-persona-card--with-image .settings-persona-card__hero::after {
  background:
    linear-gradient(90deg, color-mix(in srgb, white 78%, transparent), transparent 68%),
    linear-gradient(180deg, transparent 46%, color-mix(in srgb, white 54%, transparent));
}

.settings-persona-card:hover .settings-persona-card__hero {
  border-color: color-mix(in srgb, var(--persona-60, var(--aoi-accent-60)) 42%, var(--aoi-border));
  box-shadow: var(--aoi-shadow-md);
  transform: translateY(-1px);
}

.settings-persona-card--selected .settings-persona-card__hero {
  border-color: var(--persona-60, var(--aoi-accent-60));
  box-shadow:
    0 0 0 2px color-mix(in srgb, var(--persona-60, var(--aoi-accent-60)) 18%, transparent),
    var(--aoi-shadow-sm);
}

.settings-persona-card__art {
  position: absolute;
  inset: 0;
  z-index: 0;
  background:
    radial-gradient(circle at 86% 82%, color-mix(in srgb, white 74%, transparent) 0 12%, transparent 13%),
    repeating-linear-gradient(135deg, transparent 0 16px, color-mix(in srgb, white 18%, transparent) 17px 18px);
  mix-blend-mode: soft-light;
  opacity: .78;
  pointer-events: none;
}

.settings-persona-card__copy {
  position: relative;
  z-index: 1;
  display: grid;
  max-width: 78%;
  align-content: start;
  gap: 2px;
  padding: 18px 16px 12px;
}

.settings-persona-card__copy strong {
  color: var(--persona-60, var(--aoi-accent-60));
  font-size: clamp(22px, 2.2vw, 30px);
  font-weight: 920;
  line-height: 1.02;
  text-shadow: 0 1px 0 color-mix(in srgb, white 78%, transparent);
}

.settings-persona-card__copy small {
  color: color-mix(in srgb, var(--persona-60, var(--aoi-accent-60)) 82%, var(--aoi-text));
  font-size: 15px;
  font-weight: 720;
  line-height: 1.25;
}

.settings-persona-card__mark {
  position: absolute;
  z-index: 1;
  bottom: 14px;
  left: 16px;
  display: inline-grid;
  width: 32px;
  height: 32px;
  place-items: center;
  border-radius: 50%;
  background: var(--persona-60, var(--aoi-accent-60));
  color: white;
  box-shadow: 0 10px 24px color-mix(in srgb, var(--persona-60, var(--aoi-accent-60)) 28%, transparent);
}

.settings-persona-card__description {
  position: absolute;
  z-index: 1;
  right: 14px;
  bottom: 14px;
  display: -webkit-box;
  overflow: hidden;
  max-width: min(52%, 210px);
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  color: color-mix(in srgb, var(--aoi-text) 76%, transparent);
  font-size: 12px;
  font-weight: 720;
  line-height: 1.5;
  text-align: right;
}

.settings-persona-card__caption {
  display: flex;
  min-width: 0;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 0 2px;
  color: var(--aoi-text);
  font-size: 14px;
  font-weight: 760;
}

.settings-persona-card__caption > span {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.settings-persona-card__caption > .aoi-icon {
  flex: 0 0 auto;
  color: var(--persona-60, var(--aoi-accent-60));
}

.settings-persona-card__edit {
  position: absolute;
  z-index: 1;
  top: 10px;
  right: 10px;
  opacity: 0;
  transform: translateY(-3px);
  backdrop-filter: blur(10px);
  transition:
    opacity .16s ease,
    transform .16s ease;
}

.settings-persona-card-wrap:hover .settings-persona-card__edit,
.settings-persona-card-wrap:focus-within .settings-persona-card__edit {
  opacity: 1;
  transform: translateY(0);
}

.settings-persona-card--custom .settings-persona-card__hero {
  --persona-60: var(--persona-accent, var(--aoi-accent-60));
  --persona-50: var(--persona-accent, var(--aoi-accent-50));
  background:
    linear-gradient(135deg, transparent, color-mix(in srgb, white 32%, transparent)),
    conic-gradient(from 42deg, #ff596f, #ffa600, #5ee386, #4fb6ff, #be77ff, #ff596f);
}

.settings-persona-tool {
  display: grid;
  gap: var(--aoi-grid-gap-compact);
  border: 1px solid var(--aoi-border);
  border-radius: var(--aoi-radius-card);
  background:
    linear-gradient(135deg, color-mix(in srgb, var(--aoi-accent-10) 48%, transparent), transparent 42%),
    var(--aoi-control-bg);
  padding: var(--aoi-card-padding);
}

.settings-persona-tool__header {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 8px var(--aoi-grid-gap-compact);
  align-items: center;
}

.settings-persona-tool__header strong {
  color: var(--aoi-text);
  font-size: var(--aoi-settings-panel-title-size);
}

.settings-persona-tool__header span {
  color: var(--aoi-text-muted);
  line-height: 1.7;
}

.settings-persona-tool__header :deep(.aoi-action-bar) {
  justify-content: end;
}

.settings-accent-card-editor {
  display: grid;
  width: min(720px, calc(100vw - 48px));
  max-width: 100%;
  gap: var(--aoi-grid-gap-compact);
}

.settings-accent-card-editor__preview {
  display: grid;
  min-height: 170px;
  place-items: end start;
  overflow: hidden;
  border: 1px solid var(--aoi-border);
  border-radius: var(--aoi-radius-card);
  background:
    linear-gradient(180deg, transparent, color-mix(in srgb, var(--aoi-card-bg) 92%, transparent)),
    var(--aoi-surface-muted);
  background-position: center;
  background-size: cover;
  padding: var(--aoi-card-padding);
}

.settings-accent-card-editor__preview span {
  display: grid;
  gap: 4px;
  border-radius: var(--aoi-radius-card);
  background: color-mix(in srgb, var(--aoi-card-bg) 74%, transparent);
  padding: 10px 12px;
  color: var(--aoi-text);
  font-weight: 820;
  backdrop-filter: blur(10px);
}

.settings-accent-card-editor__preview small {
  color: var(--aoi-text-muted);
  font-size: 12px;
  font-weight: 720;
}

.settings-accent-card-editor__preview--empty {
  background:
    linear-gradient(135deg, color-mix(in srgb, var(--aoi-accent-20) 58%, transparent), transparent 55%),
    var(--aoi-surface-muted);
}

.settings-accent-card-editor__fields {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--aoi-grid-gap-compact);
}

.settings-accent-card-editor__fields > :nth-child(n + 3) {
  grid-column: 1 / -1;
}

.settings-accent-card-assets {
  display: grid;
  gap: var(--aoi-grid-gap-compact);
}

.settings-accent-card-assets__toolbar {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 4px var(--aoi-grid-gap-compact);
  align-items: center;
}

.settings-accent-card-assets__toolbar strong {
  color: var(--aoi-text);
}

.settings-accent-card-assets__toolbar > span {
  min-width: 0;
  overflow-wrap: anywhere;
  color: var(--aoi-text-muted);
  font-size: 12px;
  font-weight: 720;
}

.settings-accent-card-assets__toolbar :deep(.aoi-action-bar) {
  grid-row: 1 / span 2;
  grid-column: 2;
}

.settings-accent-card-assets__error {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: var(--aoi-grid-gap-compact);
  align-items: center;
  border: 1px solid color-mix(in srgb, var(--aoi-danger) 28%, var(--aoi-border));
  border-radius: var(--aoi-radius-card);
  background: color-mix(in srgb, var(--aoi-danger) 7%, var(--aoi-card-bg));
  padding: 10px 12px;
  color: var(--aoi-danger);
  font-size: 13px;
  font-weight: 760;
}

.settings-accent-card-assets__list {
  display: grid;
  max-height: min(34vh, 280px);
  grid-template-columns: repeat(auto-fill, minmax(132px, 1fr));
  gap: 8px;
  overflow: auto;
  border: 1px solid var(--aoi-border);
  border-radius: var(--aoi-radius-card);
  background: var(--aoi-control-bg);
  padding: 8px;
}

.settings-accent-card-assets__item {
  display: grid;
  min-width: 0;
  gap: 6px;
  justify-items: start;
  border: 1px solid var(--aoi-border);
  border-radius: var(--aoi-radius-card);
  background: var(--aoi-card-bg);
  padding: 8px;
  color: var(--aoi-text);
  cursor: pointer;
  font: inherit;
  text-align: left;
}

.settings-accent-card-assets__item:hover,
.settings-accent-card-assets__item:focus-visible {
  border-color: var(--aoi-state-border-active);
  background: var(--aoi-state-hover);
}

.settings-accent-card-assets__item--selected {
  border-color: var(--aoi-state-border-active);
  background: var(--aoi-state-active);
}

.settings-accent-card-assets__item > span:last-child {
  overflow: hidden;
  max-width: 100%;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.settings-accent-card-assets__thumb {
  width: 100%;
  aspect-ratio: 16 / 9;
  border-radius: var(--aoi-radius-card);
  background-position: center;
  background-size: cover;
  box-shadow: inset 0 0 0 1px color-mix(in srgb, white 38%, transparent);
}

.settings-accent-card-confirm {
  display: grid;
  width: min(680px, calc(100vw - 48px));
  max-width: 100%;
  gap: var(--aoi-grid-gap-compact);
}

.settings-accent-card-confirm p {
  margin: 0;
  color: var(--aoi-text-muted);
  line-height: 1.7;
}

.settings-accent-card-confirm__diff {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);
  gap: var(--aoi-grid-gap-compact);
  align-items: stretch;
}

.settings-accent-card-confirm__diff section {
  display: grid;
  min-width: 0;
  gap: 8px;
  border: 1px solid var(--aoi-border);
  border-radius: var(--aoi-radius-card);
  background: var(--aoi-card-bg);
  padding: 10px;
}

.settings-accent-card-confirm__diff code {
  overflow: auto;
  max-height: 220px;
  color: var(--aoi-text);
  font-size: 12px;
  white-space: pre-wrap;
}

.settings-accent-derivation {
  display: grid;
  gap: var(--aoi-grid-gap-compact);
}

.settings-derivation-section {
  display: grid;
  gap: var(--aoi-grid-gap-compact);
}

.settings-accent-derivation__header {
  display: grid;
  gap: max(4px, calc(var(--aoi-grid-gap-compact) - 8px));
}

.settings-derivation-section__header {
  display: grid;
  gap: max(4px, calc(var(--aoi-grid-gap-compact) - 8px));
}

.settings-accent-derivation__header strong {
  color: var(--aoi-text);
  font-size: var(--aoi-settings-panel-title-size);
}

.settings-derivation-section__header strong {
  color: var(--aoi-text);
  font-size: var(--aoi-settings-panel-title-size);
}

.settings-accent-derivation__header span {
  color: var(--aoi-text-muted);
  line-height: 1.7;
}

.settings-derivation-section__header span {
  color: var(--aoi-text-muted);
  line-height: 1.7;
}

.settings-accent-preview {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  overflow: hidden;
  min-height: var(--aoi-control-height-md);
  border: 1px solid var(--aoi-border);
  border-radius: var(--aoi-radius-card);
  background: var(--aoi-control-bg);
}

.settings-accent-preview span {
  min-width: 0;
}

.settings-accent-derivation__grid {
  display: grid;
  gap: var(--aoi-grid-gap-compact);
}

.settings-accent-strength-control {
  display: grid;
  width: min(calc(var(--aoi-settings-card-min-width) * 1.88), 100%);
  grid-template-columns: minmax(0, 1fr) auto;
  gap: var(--aoi-grid-gap-compact);
  align-items: end;
}

.settings-accent-strength-control__slider {
  min-width: 0;
}

.settings-accent-strength-control__value {
  min-width: 48px;
  padding-bottom: 6px;
  color: var(--aoi-text-muted);
  font-size: 12px;
  font-weight: 720;
  text-align: right;
}

.settings-background-panel {
  display: grid;
  gap: var(--aoi-grid-gap-compact);
}

.settings-background-panel__toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: var(--aoi-grid-gap-compact);
  align-items: center;
}

.settings-background-tiles {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(190px, 100%), 1fr));
  gap: var(--aoi-grid-gap-compact);
}

.settings-background-tile {
  position: relative;
  display: grid;
  min-height: 128px;
  place-items: center;
  overflow: hidden;
  border: 1px solid var(--aoi-border);
  border-radius: var(--aoi-radius-card);
  background:
    linear-gradient(135deg, color-mix(in srgb, var(--aoi-accent-10) 42%, transparent), transparent 54%),
    var(--aoi-control-bg);
  color: var(--aoi-text-muted);
  font-size: 12px;
  font-weight: 760;
}

.settings-background-tile--empty {
  gap: 6px;
  border-style: dashed;
}

.settings-background-tile--image {
  display: grid;
  place-items: end start;
  background-position: center;
  background-size: cover;
}

.settings-background-tile--image::before {
  position: absolute;
  inset: 0;
  background: linear-gradient(180deg, transparent 44%, color-mix(in srgb, black 28%, transparent));
  content: "";
}

.settings-background-tile--image span {
  position: relative;
  z-index: 1;
  overflow: hidden;
  max-width: calc(100% - 20px);
  border-radius: var(--aoi-radius-control);
  background: color-mix(in srgb, var(--aoi-card-bg) 72%, transparent);
  padding: 6px 8px;
  color: var(--aoi-text);
  text-overflow: ellipsis;
  white-space: nowrap;
  backdrop-filter: blur(10px);
}

.settings-slider-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: var(--aoi-grid-gap-compact);
}

.settings-spec-grid {
  display: grid;
  gap: var(--aoi-grid-gap-compact);
}

.settings-width-control {
  display: grid;
  width: min(calc(var(--aoi-settings-card-min-width) * 2.18), 100%);
  gap: var(--aoi-grid-gap-compact);
}

.settings-width-mode :deep(.aoi-segmented__item) {
  min-height: var(--aoi-control-height-md);
  grid-template-columns: auto minmax(0, 1fr);
  align-items: center;
  padding: 0 var(--aoi-row-padding);
}

.settings-spec-slider {
  width: min(calc(var(--aoi-settings-card-min-width) * 1.88), 100%);
}

@media (hover: none), (pointer: coarse) {
  .settings-persona-card__edit {
    opacity: .78;
    transform: none;
  }
}

@media (max-width: 760px) {
  .settings-accent-card-assets__toolbar,
  .settings-accent-card-assets__error,
  .settings-accent-card-confirm__diff,
  .settings-accent-card-editor__fields,
  .settings-accent-strength-control,
  .settings-form-group,
  .settings-persona-tool__header,
  .settings-slider-grid {
    grid-template-columns: 1fr;
  }

  .settings-persona-grid {
    grid-template-columns: repeat(auto-fit, minmax(min(210px, 100%), 1fr));
  }

  .settings-persona-card__hero {
    min-height: 124px;
  }

  .settings-persona-card__copy strong {
    font-size: 23px;
  }

  .settings-persona-card__description {
    display: none;
  }

  .settings-persona-card__edit {
    opacity: .78;
    transform: none;
  }

  .settings-persona-tool__header :deep(.aoi-action-bar) {
    justify-content: start;
  }

  .settings-accent-card-assets__toolbar :deep(.aoi-action-bar) {
    grid-row: auto;
    grid-column: auto;
    justify-content: start;
  }

  .settings-accent-card-confirm__diff > .aoi-icon {
    transform: rotate(90deg);
  }

  .settings-accent-strength-control__value {
    padding-bottom: 0;
    text-align: left;
  }
}
</style>
