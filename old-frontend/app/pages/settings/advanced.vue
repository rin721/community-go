<script setup lang="ts">
const config = useRuntimeConfig()
const settings = useAppSettingsStore()
const api = useAoiApi()
const library = useLibraryStore()
const telemetry = useAoiApiTelemetry()
const uploadDrafts = useUploadDraftStore()
const following = useFollowingStore()
const comments = useCommentsStore()
const playerSettings = usePlayerSettingsStore()
const { locale, t } = useI18n()

const defaultCommentAuthor = "Aoi 游客"
const confirmOpen = ref(false)
const pendingAction = ref<{
  action: () => Promise<void> | void
  body: string
  danger: boolean
  title: string
} | null>(null)

const activeBaseURL = computed(() => apiStatus.value?.basePath || (config.public.apiMock ? "pending" : config.public.apiBaseURL))
const dateLocale = computed(() => {
  if (locale.value === "ja") {
    return "ja-JP"
  }
  if (locale.value === "en") {
    return "en-US"
  }
  return "zh-CN"
})
const setupBlocked = computed(() => Boolean(apiStatus.value?.setup.required && !apiStatus.value.setup.completed))
const communityAccessStatus = computed(() => {
  if (config.public.apiMock) {
    return t("settings.advanced.connection.mockReady")
  }
  if (setupBlocked.value) {
    return t("settings.advanced.connection.setupBlocked", {
      step: apiStatus.value?.setup.currentStep || t("settings.advanced.connection.setupPending")
    })
  }
  return t("settings.advanced.connection.realReady")
})
const dataSourceStats = computed(() => [
  { label: t("settings.advanced.dataSource.source"), value: config.public.apiMock ? t("settings.advanced.dataSource.mock") : t("settings.advanced.dataSource.real") },
  { label: t("settings.advanced.dataSource.mockSwitch"), value: config.public.apiMock ? t("settings.advanced.dataSource.enabled") : t("settings.advanced.dataSource.disabled") },
  { label: "Base URL", value: activeBaseURL.value },
  { label: t("settings.advanced.dataSource.apiStatus"), value: communityAccessStatus.value }
])
const localStats = computed(() => ({
  favorites: Object.keys(library.favoriteVideos).length,
  history: library.history.length,
  liked: library.likedCount,
  watchLater: Object.keys(library.watchLaterVideos).length
}))
const hasLocalData = computed(() => Object.values(localStats.value).some((value) => value > 0))
const uploadStats = computed(() => ({
  drafts: uploadDrafts.draftCount,
  ready: uploadDrafts.readyCount,
  submitted: uploadDrafts.submittedCount
}))
const hasUploadDrafts = computed(() => uploadStats.value.drafts > 0)
const followingStats = computed(() => ({
  creators: following.followedCount,
  videos: following.latestVideos.length
}))
const hasFollowingData = computed(() => followingStats.value.creators > 0)
const commentStats = computed(() => ({
  author: comments.authorName
}))
const hasCommentIdentity = computed(() => commentStats.value.author !== defaultCommentAuthor)
const playerStats = computed(() => ({
  muted: playerSettings.muted,
  playbackRate: playerSettings.playbackRate,
  theaterMode: playerSettings.theaterMode,
  volume: Math.round(playerSettings.volume * 100)
}))
const hasPlayerSettings = computed(() => {
  return playerSettings.volume !== 0.8
    || playerSettings.muted
    || playerSettings.playbackRate !== 1
    || playerSettings.theaterMode
})
const apiStatusStats = computed(() => apiStatus.value
  ? [
      { label: t("settings.advanced.connection.mode"), value: apiStatus.value.mode },
      { label: "Base Path", value: apiStatus.value.basePath },
      { label: "Endpoint", value: apiStatus.value.endpoints.length },
      { label: t("settings.advanced.connection.setup"), value: apiStatus.value.setup.completed ? t("settings.advanced.connection.completed") : t("settings.advanced.connection.inProgress") },
      { label: t("settings.advanced.connection.updatedAt"), value: new Date(apiStatus.value.generatedAt).toLocaleTimeString(dateLocale.value) }
    ]
  : [])

const {
  data: apiStatus,
  error: apiStatusError,
  pending: apiStatusPending,
  refresh: refreshApiStatus
} = useAsyncData("api-status", () => api.getApiStatus())

function askConfirm(title: string, body: string, action: () => Promise<void> | void, danger = false) {
  pendingAction.value = { action, body, danger, title }
  confirmOpen.value = true
}

async function runPendingAction() {
  if (!pendingAction.value) {
    return
  }

  await pendingAction.value.action()
  confirmOpen.value = false
  pendingAction.value = null
}

function cancelPendingAction() {
  confirmOpen.value = false
  pendingAction.value = null
}
</script>

<template>
  <div class="settings-page">
    <SettingsPageHeader
      :title="t('settings.advanced.page.title')"
      :description="t('settings.advanced.page.description')"
    />

    <SettingsPanel
      icon="server"
      :title="t('settings.advanced.dataSource.title')"
      :description="t('settings.advanced.dataSource.description')"
    >
      <AoiStatGrid :items="dataSourceStats" :columns="4" />
    </SettingsPanel>

    <SettingsPanel
      icon="cloud"
      :title="t('settings.advanced.connection.title')"
      :description="t('settings.advanced.connection.description')"
    >
      <template #actions>
        <AoiButton tone="accent"
          variant="outlined"
          size="sm"
          icon="refresh-cw"
          :loading="apiStatusPending"
          @click="refreshApiStatus()"
        >
          {{ t("settings.advanced.connection.refresh") }}
        </AoiButton>
      </template>

      <PageState
        v-if="!apiStatusPending && apiStatusError"
        icon="cloud-alert"
        :title="t('settings.advanced.connection.errorTitle')"
        :description="t('settings.advanced.connection.errorDescription')"
        action-icon="refresh-cw"
        :action-label="t('settings.advanced.connection.retry')"
        @action="refreshApiStatus()"
      />

      <template v-else-if="!apiStatusPending && apiStatus">
        <AoiStatGrid :items="apiStatusStats" />

        <p v-if="setupBlocked" class="settings-note settings-note--warning">
          {{ t("settings.advanced.connection.setupBlockedDescription") }}
        </p>

        <div v-if="apiStatus.endpoints.length" class="settings-endpoint-list" :aria-label="t('settings.advanced.connection.endpointsAria')">
          <code v-for="endpoint in apiStatus.endpoints" :key="endpoint">{{ endpoint }}</code>
        </div>
      </template>
    </SettingsPanel>

    <SettingsPanel
      icon="cloud-alert"
      title="最近连接错误"
      description="页面请求失败时保留最近 8 条，便于调试。"
    >
      <template #actions>
        <AoiButton
          size="sm"
          icon="trash-2"
          :disabled="telemetry.recentErrors.value.length === 0"
          @click="telemetry.clearErrors()"
        >
          清空
        </AoiButton>
      </template>

      <p v-if="telemetry.recentErrors.value.length === 0" class="settings-note">
        暂无错误记录。
      </p>

      <ul v-else class="settings-api-errors">
        <li v-for="item in telemetry.recentErrors.value" :key="`${item.requestId}-${item.occurredAt}`">
          <strong>{{ item.statusCode }} · {{ item.code }}</strong>
          <span>{{ item.endpoint }}</span>
          <small>{{ item.message }} / {{ item.requestId }}</small>
        </li>
      </ul>
    </SettingsPanel>

    <SettingsPanel
      icon="archive"
      title="本地数据"
      description="这些缓存和偏好写入当前浏览器；评论显示名称只会在你发布评论时随评论内容一起发送。"
    >
      <div class="settings-data-panels">
        <SettingsDataActionCard
          title="播放器偏好"
          :description="`${playerStats.volume}% · ${playerStats.playbackRate}x · ${playerStats.theaterMode ? '剧场' : '标准'}`"
        >
          <template #actions>
            <AoiButton tone="accent"
              variant="outlined"
              size="sm"
              icon="rotate-ccw"
              :disabled="!playerSettings.hydrated || !hasPlayerSettings"
              @click="askConfirm('重置播放器偏好', '将恢复音量、静音、倍速和剧场模式默认值。', () => playerSettings.resetPlayerSettings())"
            >
              重置
            </AoiButton>
          </template>
        </SettingsDataActionCard>

        <SettingsDataActionCard
          title="本地互动缓存"
          :description="`历史 ${localStats.history} · 收藏缓存 ${localStats.favorites} · 稍后看缓存 ${localStats.watchLater} · 点赞缓存 ${localStats.liked}`"
        >
          <template #actions>
            <AoiButton tone="accent"
              variant="outlined"
              size="sm"
              icon="rotate-ccw"
              :disabled="!library.hydrated || !hasLocalData"
              @click="askConfirm('重置本地互动缓存', '将清空观看历史和浏览器互动缓存；收藏、稍后看和点赞会在下次同步时重新加载。', () => library.resetLibrary())"
            >
              重置
            </AoiButton>
          </template>
        </SettingsDataActionCard>

        <SettingsDataActionCard
          title="评论身份"
          :description="`显示名称 ${commentStats.author}`"
        >
          <template #actions>
            <AoiButton tone="accent"
              variant="outlined"
              size="sm"
              icon="message-circle"
              :disabled="!comments.hydrated || !hasCommentIdentity"
              @click="askConfirm('重置评论身份', '将恢复评论显示名称；已发布的社区评论不会被删除。', () => comments.resetCommentIdentity())"
            >
              重置
            </AoiButton>
          </template>
        </SettingsDataActionCard>

        <SettingsDataActionCard
          title="投稿草稿"
          :description="`草稿 ${uploadStats.drafts} · 可提交 ${uploadStats.ready} · 已提交 ${uploadStats.submitted}`"
        >
          <template #actions>
            <AoiButton tone="accent"
              variant="outlined"
              size="sm"
              icon="trash-2"
              :disabled="!uploadDrafts.hydrated || !hasUploadDrafts"
              @click="askConfirm('清空投稿草稿', '将删除当前浏览器中的投稿草稿元数据。真实文件不会被保存或删除。', () => uploadDrafts.resetDrafts())"
            >
              清空
            </AoiButton>
          </template>
        </SettingsDataActionCard>

        <SettingsDataActionCard
          title="关注缓存"
          :description="`本地缓存创作者 ${followingStats.creators} · 关注更新 ${followingStats.videos}`"
        >
          <template #actions>
            <AoiButton tone="accent"
              variant="outlined"
              size="sm"
              icon="user-minus"
              :disabled="!following.hydrated || !hasFollowingData"
              @click="askConfirm('清空本地关注缓存', '只删除当前浏览器缓存；匿名关注关系会在下次同步时重新加载。', () => following.resetFollowing())"
            >
              清空
            </AoiButton>
          </template>
        </SettingsDataActionCard>

        <SettingsDataActionCard
          title="应用设置"
          description="重置主题、色板、背景和偏好设置。"
          tone="danger"
        >
          <template #actions>
            <AoiButton
              tone="danger"
              variant="outlined"
              size="sm"
              icon="rotate-ccw"
              :disabled="!settings.hydrated"
              @click="askConfirm('重置应用设置', '将恢复外观、背景、语言和偏好的默认值，但不会清除互动、投稿、关注缓存或评论身份。', () => settings.resetAllAppSettings(), true)"
            >
              重置
            </AoiButton>
          </template>
        </SettingsDataActionCard>
      </div>
    </SettingsPanel>

    <AoiDialog v-model:open="confirmOpen">
      <template #headline>{{ pendingAction?.title }}</template>
      <p class="settings-note">{{ pendingAction?.body }}</p>
      <template #actions>
        <AoiButton @click="cancelPendingAction">取消</AoiButton>
        <AoiButton
          variant="filled"
          :tone="pendingAction?.danger ? 'danger' : 'accent'"
          :icon="pendingAction?.danger ? 'trash-2' : 'check'"
          @click="runPendingAction"
        >
          确认
        </AoiButton>
      </template>
    </AoiDialog>
  </div>
</template>

<style scoped>
.settings-endpoint-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.settings-endpoint-list code {
  border: 1px solid var(--aoi-border);
  border-radius: var(--aoi-radius-sm);
  background: var(--aoi-bg);
  color: var(--aoi-accent-60);
  font-size: 12px;
  padding: 5px 8px;
}

.settings-api-errors {
  display: grid;
  gap: 8px;
  margin: 0;
  padding: 0;
}

.settings-api-errors li {
  display: grid;
  gap: 4px;
  border: 1px solid var(--aoi-border);
  border-radius: var(--aoi-radius-sm);
  background: var(--aoi-card-bg);
  list-style: none;
  padding: 11px;
}

.settings-api-errors span,
.settings-api-errors small {
  color: var(--aoi-text-muted);
}

.settings-note--warning {
  border: 1px solid var(--aoi-intent-warning-border);
  border-radius: var(--aoi-radius-sm);
  background: var(--aoi-intent-warning-soft-bg);
  color: var(--aoi-text);
  padding: 10px 12px;
}

.settings-data-panels {
  display: grid;
  gap: 10px;
}

</style>
