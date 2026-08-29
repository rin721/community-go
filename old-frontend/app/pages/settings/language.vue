<script setup lang="ts">
import type { AoiLocale } from "~/stores/app-settings"

const settings = useAppSettingsStore()
const { locale, setLocale, t } = useI18n()
const resetLanguageConfirmOpen = ref(false)
const resettingLanguage = ref(false)

const localeOptions: Array<{
  description: string
  label: string
  nativeName: string
  value: AoiLocale
}> = [
  {
    description: "默认语言，适合当前内容和设计文案。",
    label: "简体中文",
    nativeName: "简体中文",
    value: "zh-CN"
  },
  {
    description: "English interface copy where available.",
    label: "英语",
    nativeName: "English",
    value: "en"
  },
  {
    description: "利用可能な範囲で日本語表示に切り替えます。",
    label: "日语",
    nativeName: "日本語",
    value: "ja"
  }
]

async function chooseLocale(value: AoiLocale) {
  settings.setLocalePreference(value)
  await setLocale(value)
}

async function confirmResetLanguage() {
  resettingLanguage.value = true

  try {
    settings.resetLanguage()
    await setLocale(settings.locale)
    resetLanguageConfirmOpen.value = false
  } finally {
    resettingLanguage.value = false
  }
}
</script>

<template>
  <div class="settings-page">
    <SettingsPageHeader
      title="语言"
      description="当前项目接入了三种语言。更多语言等 locale 文件完善后再开放。"
    >
      <template #actions>
        <AoiButton tone="accent"
          variant="outlined"
          size="sm"
          icon="rotate-ccw"
          :disabled="!settings.hydrated || resettingLanguage"
          @click="resetLanguageConfirmOpen = true"
        >
          {{ t("settings.resetPage.action") }}
        </AoiButton>
      </template>
    </SettingsPageHeader>

    <SettingsPanel
      icon="languages"
      title="界面语言"
      description="切换后会立即应用，并保存到当前浏览器。"
    >
      <SettingsOptionGrid>
        <AoiChoiceCard
          v-for="item in localeOptions"
          :key="item.value"
          class="settings-language-card"
          :value="item.value"
          :title="item.nativeName"
          :description="item.label"
          :selected="locale === item.value"
          @select="chooseLocale(item.value)"
        >
          <small>{{ item.description }}</small>
        </AoiChoiceCard>
      </SettingsOptionGrid>
    </SettingsPanel>

    <AoiDialog v-model:open="resetLanguageConfirmOpen">
      <template #headline>{{ t("settings.resetPage.language.title") }}</template>
      <p class="settings-note">{{ t("settings.resetPage.language.description") }}</p>
      <template #actions>
        <AoiButton
          :disabled="resettingLanguage"
          @click="resetLanguageConfirmOpen = false"
        >
          {{ t("settings.resetPage.cancel") }}
        </AoiButton>
        <AoiButton tone="accent" variant="filled"
          icon="check"
          :loading="resettingLanguage"
          @click="confirmResetLanguage"
        >
          {{ t("settings.resetPage.confirm") }}
        </AoiButton>
      </template>
    </AoiDialog>
  </div>
</template>

<style scoped>
.settings-language-card {
  min-height: 132px;
}

.settings-language-card small {
  color: var(--aoi-text-muted);
  line-height: 1.55;
}
</style>
