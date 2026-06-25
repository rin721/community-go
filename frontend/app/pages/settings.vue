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
  requiresDeveloperMode?: boolean
  to: string
}

const settingsCatalog = computed<SettingsCatalogItem[]>(() => [
  { id: "appearance", depth: "basic", group: "app", icon: "palette", label: "外观", description: "主题、色板、背景和规格单位。", keywords: "主题 色板 背景 DIY 自定义 规格 尺寸 单位 间距 圆角 导航宽度 卡片宽度 派生 强度", to: "/settings/appearance" },
  { id: "player", depth: "basic", group: "app", icon: "play-circle", label: "播放器", description: "音量、静音、倍速和剧场模式。", keywords: "音量 静音 倍速 剧场", to: "/settings/player" },
  { id: "danmaku", depth: "basic", group: "app", icon: "message-square-text", label: "弹幕", description: "弹幕显示、运动、模式和屏蔽词。", keywords: "弹幕 占位 屏蔽 速度 字号 透明度", to: "/settings/danmaku" },
  { id: "preference", depth: "basic", group: "app", icon: "sliders-horizontal", label: "偏好", description: "浏览、隐私、动效、滚动和搜索偏好。", keywords: "省流 隐私 新标签 日期 搜索 进度条 NProgress loading reveal scroll snap", to: "/settings/preference" },
  { id: "language", depth: "basic", group: "app", icon: "languages", label: "语言", description: "界面语言和本地化。", keywords: "中文 English 日本語 i18n", to: "/settings/language" },
  { id: "experimental", depth: "all", group: "app", icon: "flask-conical", label: "实验", description: "功能预览和交互实验。", keywords: "实验 功能预览 富文本 lightbox scroll scene", to: "/settings/experimental" },
  { id: "shortcut-key", depth: "all", group: "app", icon: "keyboard", label: "快捷键", description: "键盘操作预留。", keywords: "键盘 播放 评论", to: "/settings/shortcut-key" },
  { id: "about", depth: "basic", group: "project", icon: "info", label: "关于", description: "版本、技术栈和项目说明。", keywords: "版本 技术栈 仓库", to: "/settings/about" },
  { id: "acknowledgement", depth: "basic", group: "project", icon: "heart-handshake", label: "鸣谢", description: "链接、友情链接和致谢。", keywords: "链接 友情链接 致谢", to: "/settings/acknowledgement" },
  { id: "advanced", depth: "all", group: "project", icon: "database", label: "高级", description: "API 诊断、本地缓存和重置。", keywords: "API mock 错误 本地缓存 重置 数据", to: "/settings/advanced" },
  { id: "components", depth: "all", group: "project", icon: "blocks", label: t("settings.components.title"), description: t("settings.components.catalogDescription"), keywords: t("settings.components.keywords"), requiresDeveloperMode: true, to: "/settings/components" },
  { id: "developer", depth: "all", group: "project", icon: "code-2", label: "开发者", description: "构建默认配置、运行时档案和公共资产。", keywords: "开发者 developer defaults build config restore profiles runtime profile assets public i18n 构建 默认 配置 恢复 多配置 运行时 档案 字段选择 差异预览 公共资产 文件管理 上传 下载 chmod", requiresDeveloperMode: true, to: "/settings/developer" }
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
const availableItems = computed(() => settingsCatalog.value.filter((item) => {
  if (item.requiresDeveloperMode && !settings.developerModeEnabled) {
    return false
  }

  return settings.settingsDisplayDepth === "all" || item.depth === "basic"
}))
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
  title: activeItem.value ? `${activeItem.value.label} - 设置 - Aoi` : "设置 - Aoi"
}))
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
