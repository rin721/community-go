<script setup lang="ts">
import type { AoiSettingsDisplayDepth } from "~/stores/app-settings"

const route = useRoute()
const { t } = useI18n()
const settings = useAppSettingsStore()
const query = ref("")

interface SettingsCatalogItem {
  depth: AoiSettingsDisplayDepth
  description: string
  group: "app" | "project"
  icon: string
  id: string
  keywords: string
  label: string
  to: string
}

const settingsCatalog = computed<SettingsCatalogItem[]>(() => [
  settingsCatalogItem("appearance", "basic", "app", "palette", "/settings/appearance"),
  settingsCatalogItem("player", "basic", "app", "play-circle", "/settings/player"),
  settingsCatalogItem("danmaku", "basic", "app", "message-square-text", "/settings/danmaku"),
  settingsCatalogItem("preference", "basic", "app", "sliders-horizontal", "/settings/preference"),
  settingsCatalogItem("language", "basic", "app", "languages", "/settings/language"),
  settingsCatalogItem("experimental", "all", "app", "flask-conical", "/settings/experimental"),
  settingsCatalogItem("shortcut-key", "all", "app", "keyboard", "/settings/shortcut-key"),
  settingsCatalogItem("about", "basic", "project", "info", "/settings/about"),
  settingsCatalogItem("acknowledgement", "basic", "project", "heart-handshake", "/settings/acknowledgement"),
  settingsCatalogItem("advanced", "all", "project", "activity", "/settings/advanced")
])

const depthOptions = computed(() => [
  {
    icon: "list",
    label: t("settings.shell.depth.basic.label"),
    description: t("settings.shell.depth.basic.description"),
    value: "basic"
  },
  {
    icon: "layers-3",
    label: t("settings.shell.depth.all.label"),
    description: t("settings.shell.depth.all.description"),
    value: "all"
  }
])
const depthModel = computed({
  get: () => settings.settingsDisplayDepth,
  set: (value: string) => settings.setSettingsDisplayDepth(value as AoiSettingsDisplayDepth)
})

const normalizedQuery = computed(() => query.value.trim().toLowerCase())
const availableItems = computed(() => settingsCatalog.value.filter((item) => settings.settingsDisplayDepth === "all" || item.depth === "basic"))
const visibleGroups = computed(() => {
  const items = normalizedQuery.value
    ? availableItems.value.filter((item) => {
        const haystack = `${item.label} ${item.description} ${item.keywords}`.toLowerCase()

        return haystack.includes(normalizedQuery.value)
      })
    : availableItems.value

  return [
    {
      label: t("settings.shell.groups.app"),
      items: items.filter((item) => item.group === "app")
    },
    {
      label: t("settings.shell.groups.project"),
      items: items.filter((item) => item.group === "project")
    }
  ]
    .filter((group) => group.items.length > 0)
})
const activeItem = computed(() => {
  return settingsCatalog.value
    .find((item) => route.path === item.to)
})
const activeAvailableItem = computed(() => availableItems.value.find((item) => route.path === item.to))

watch([availableItems, () => route.path, () => settings.hydrated], () => {
  if (!settings.hydrated) {
    return
  }

  if (route.path.startsWith("/settings") && !activeAvailableItem.value) {
    navigateTo("/settings/appearance", { replace: true })
  }
}, { immediate: true })

useHead(() => ({
  title: activeItem.value
    ? t("settings.shell.headTitleWithPage", { page: activeItem.value.label })
    : t("settings.shell.headTitle")
}))

function settingsCatalogItem(
  id: string,
  depth: AoiSettingsDisplayDepth,
  group: "app" | "project",
  icon: string,
  to: string
): SettingsCatalogItem {
  return {
    depth,
    description: t(`settings.shell.catalog.${id}.description`),
    group,
    icon,
    id,
    keywords: t(`settings.shell.catalog.${id}.keywords`),
    label: t(`settings.shell.catalog.${id}.label`),
    to
  }
}
</script>

<template>
  <div class="aoi-page settings-shell">
    <SettingsShellNav
      v-model="query"
      :groups="visibleGroups"
      :active-path="route.path"
      v-model:depth-model-value="depthModel"
      :depth-items="depthOptions"
      :depth-label="t('settings.shell.depth.label')"
      :title="t('settings.shell.title')"
      :description="t('settings.shell.description')"
      :search-label="t('settings.shell.searchLabel')"
      :search-placeholder="t('settings.shell.searchPlaceholder')"
      :empty-text="t('settings.shell.emptyText')"
    />

    <main class="settings-shell__content">
      <NuxtPage />
    </main>
  </div>
</template>

<style scoped>
.settings-shell {
  display: grid;
  max-width: var(--aoi-content-wide-max-width);
  grid-template-columns: minmax(var(--aoi-settings-shell-nav-min-width), var(--aoi-settings-shell-nav-width)) minmax(0, 1fr);
  gap: var(--aoi-settings-shell-gap);
  align-items: start;
  animation: none;
}

.settings-shell__content {
  min-width: 0;
}

@media (max-width: 960px) {
  .settings-shell {
    grid-template-columns: 1fr;
  }
}
</style>
