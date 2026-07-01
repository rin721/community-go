<script setup lang="ts">
import type { AccountProfileResponse, CommunitySubmissionItem } from "~/types/api"
import type { AoiSegmentedItem } from "~/components/aoi/AoiSegmentedControl.vue"

const api = useAoiApi()
const authSession = useAuthSessionStore()
const { locale, t } = useI18n()
const router = useRouter()
const library = useLibraryStore()

const authenticated = computed(() => authSession.authenticated)

watchEffect(() => {
  if (authSession.hydrated && !authenticated.value) {
    router.replace("/login")
  }
})

useHead({ title: `${t("me.headTitle")} - Aoi` })

type MeTab = "profile" | "following" | "collections" | "history" | "submissions" | "security" | "sessions"
const activeTab = ref<MeTab>("profile")

const profile = ref<AccountProfileResponse | null>(null)
const profileError = ref<string | null>(null)
const profilePending = ref(false)

const submissionsList = ref<CommunitySubmissionItem[] | null>(null)
const submissionsError = ref<string | null>(null)
const submissionsPending = ref(false)

const followingList = ref<any[] | null>(null)
const followingPending = ref(false)
const followingError = ref<string | null>(null)

const sessionsList = ref<any[] | null>(null)
const sessionsPending = ref(false)
const sessionsError = ref<string | null>(null)

const collectionsPending = ref(false)
const collectionsError = ref<string | null>(null)

const historyPending = ref(false)
const historyError = ref<string | null>(null)

const dateLocale = computed(() => {
  if (locale.value === "ja") return "ja-JP"
  if (locale.value === "en") return "en-US"
  return "zh-CN"
})

async function loadProfile() {
  if (!authenticated.value) return
  profilePending.value = true
  profileError.value = null
  try {
    profile.value = await api.getAccountProfile()
  } catch {
    profileError.value = t("me.loadError")
  } finally {
    profilePending.value = false
  }
}

watch(authenticated, (val) => { if (val) void loadProfile() }, { immediate: true })

const editingDisplayName = ref(false)
const displayNameInput = ref("")
const displayNameSaving = ref(false)
const displayNameMessage = ref<{ type: "success" | "error"; text: string } | null>(null)

function startEditDisplayName() {
  displayNameInput.value = profile.value?.displayName ?? ""
  editingDisplayName.value = true
  displayNameMessage.value = null
}
function cancelEditDisplayName() {
  editingDisplayName.value = false
  displayNameMessage.value = null
}
async function saveDisplayName() {
  const name = displayNameInput.value.trim()
  if (!name || displayNameSaving.value) return
  displayNameSaving.value = true
  displayNameMessage.value = null
  try {
    profile.value = await api.updateAccountProfile({ displayName: name })
    editingDisplayName.value = false
    displayNameMessage.value = { type: "success", text: t("me.saveSuccess") }
  } catch (err) {
    displayNameMessage.value = { type: "error", text: t("me.saveError") }
  } finally {
    displayNameSaving.value = false
  }
}

const editingCreatorProfile = ref(false)
const creatorBioInput = ref("")
const creatorAvatarInput = ref("")
const creatorSaving = ref(false)
const creatorMessage = ref<{ type: "success" | "error"; text: string } | null>(null)
const isCreator = computed(() => profile.value?.role === "creator")
const uploadingAvatar = ref(false)

function startEditCreatorProfile() {
  creatorBioInput.value = profile.value?.bio ?? ""
  creatorAvatarInput.value = profile.value?.avatarUrl ?? ""
  editingCreatorProfile.value = true
  creatorMessage.value = null
}
function cancelEditCreatorProfile() {
  editingCreatorProfile.value = false
  creatorMessage.value = null
}
async function saveCreatorProfile() {
  if (creatorSaving.value) return
  creatorSaving.value = true
  creatorMessage.value = null
  try {
    profile.value = await api.updateAccountCreatorProfile({
      bio: creatorBioInput.value.trim() || null,
      avatarUrl: creatorAvatarInput.value.trim() || null
    })
    editingCreatorProfile.value = false
    creatorMessage.value = { type: "success", text: t("me.saveSuccess") }
  } catch (err) {
    creatorMessage.value = { type: "error", text: t("me.saveError") }
  } finally {
    creatorSaving.value = false
  }
}

async function onAvatarCropped(result: any) {
  const file = new File([result.blob], "avatar.webp", { type: "image/webp" })
  uploadingAvatar.value = true
  creatorMessage.value = null
  try {
    const res = await api.uploadAccountAvatar(file)
    creatorAvatarInput.value = res.avatarUrl
    if (profile.value) {
      profile.value.avatarUrl = res.avatarUrl
    }
    // Update local session cache if applicable
    if (authSession.session && authSession.session.account) {
      (authSession.session.account as any).avatarUrl = res.avatarUrl
    }
    creatorMessage.value = { type: "success", text: "头像上传并保存成功" }
  } catch (err) {
    creatorMessage.value = { type: "error", text: "头像上传失败，请重试" }
  } finally {
    uploadingAvatar.value = false
  }
}

const currentPasswordInput = ref("")
const newPasswordInput = ref("")
const passwordSaving = ref(false)
const passwordMessage = ref<{ type: "success" | "error"; text: string } | null>(null)

async function changePassword() {
  const currentPassword = currentPasswordInput.value.trim()
  const newPassword = newPasswordInput.value.trim()
  if (!currentPassword || newPassword.length < 8 || passwordSaving.value) return
  passwordSaving.value = true
  passwordMessage.value = null
  try {
    await api.changeAccountPassword({ currentPassword, newPassword })
    currentPasswordInput.value = ""
    newPasswordInput.value = ""
    passwordMessage.value = { type: "success", text: t("me.passwordSuccess") }
  } catch (err) {
    passwordMessage.value = { type: "error", text: t("me.passwordError") }
  } finally {
    passwordSaving.value = false
  }
}

const loggingOut = ref(false)
async function logout() {
  if (loggingOut.value) return
  loggingOut.value = true
  try {
    await authSession.logout()
    router.replace("/")
  } finally {
    loggingOut.value = false
  }
}

function roleLabel(role: string) {
  return role === "creator" ? t("me.roleCreator") : t("me.roleRegistered")
}
function formatDate(iso: string | null | undefined) {
  if (!iso) return "-"
  try { return new Date(iso).toLocaleDateString() } catch { return iso }
}

async function loadSubmissions() {
  if (!authenticated.value) return
  submissionsPending.value = true
  submissionsError.value = null
  try {
    const payload = await api.getCommunityAccountSubmissions()
    submissionsList.value = payload.items?.items || []
  } catch (err) {
    submissionsError.value = t("me.loadError")
  } finally {
    submissionsPending.value = false
  }
}

async function loadFollowing() {
  if (!authenticated.value) return
  followingPending.value = true
  followingError.value = null
  try {
    const payload = await api.getAccountFollowingFeed()
    followingList.value = payload.creators || []
  } catch {
    followingError.value = t("me.loadError")
  } finally {
    followingPending.value = false
  }
}

async function loadSessions() {
  if (!authenticated.value) return
  sessionsPending.value = true
  sessionsError.value = null
  try {
    const payload = await api.getAccountSessions()
    sessionsList.value = payload.items || []
  } catch {
    sessionsError.value = t("me.loadError")
  } finally {
    sessionsPending.value = false
  }
}

async function loadCollections() {
  collectionsPending.value = true
  collectionsError.value = null
  try {
    await library.syncWithBackend()
  } catch {
    collectionsError.value = t("me.loadError")
  } finally {
    collectionsPending.value = false
  }
}

async function loadHistory() {
  historyPending.value = true
  historyError.value = null
  try {
    await library.syncHistoryWithBackend()
  } catch {
    historyError.value = t("me.loadError")
  } finally {
    historyPending.value = false
  }
}

watch(activeTab, (tab) => {
  if (tab === "submissions" && !submissionsList.value) {
    void loadSubmissions()
  } else if (tab === "following" && !followingList.value) {
    void loadFollowing()
  } else if (tab === "sessions" && !sessionsList.value) {
    void loadSessions()
  } else if (tab === "history") {
    void loadHistory()
  } else if (tab === "collections") {
    void loadCollections()
  }
})

function formatBytes(bytes: number) {
  if (bytes <= 0) return "0 B"
  const k = 1024
  const sizes = ["B", "KB", "MB", "GB", "TB"]
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`
}

function statusIntent(status: string): "success" | "warning" | "danger" | "info" {
  if (status === "published") return "success"
  if (status === "approved") return "info"
  if (status === "rejected") return "danger"
  return "warning"
}

function statusText(status: string): string {
  if (status === "published") return "已发布"
  if (status === "approved") return "已通过 (转码中)"
  if (status === "rejected") return "被驳回"
  return "审核中"
}

function formatViewedAt(entry: any) {
  return new Intl.DateTimeFormat(dateLocale.value, {
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    month: "2-digit"
  }).format(new Date(entry.lastViewedAt))
}

function progressPercent(entry: any) {
  if (!entry.video || entry.video.durationSeconds <= 0) return 0
  return Math.min(100, Math.round(entry.progressSeconds / entry.video.durationSeconds * 100))
}

function formatProgress(entry: any) {
  const percent = progressPercent(entry)
  if (percent >= 95) return t("history.progress.done")
  if (entry.progressSeconds <= 0) return t("history.progress.opened")
  const minutes = Math.floor(entry.progressSeconds / 60)
  const seconds = String(entry.progressSeconds % 60).padStart(2, "0")
  return t("history.progress.continue", { time: `${minutes}:${seconds}` })
}

const tabItems = computed<AoiSegmentedItem[]>(() => [
  { value: "profile", label: t("me.tabs.profile"), icon: "circle-user-round" },
  { value: "following", label: t("me.tabs.following"), icon: "users" },
  { value: "collections", label: t("me.tabs.collections"), icon: "star" },
  { value: "history", label: t("me.tabs.history"), icon: "clock-3" },
  { value: "submissions", label: t("me.tabs.submissions"), icon: "upload" },
  { value: "security", label: t("me.tabs.security"), icon: "shield-alert" },
  { value: "sessions", label: t("me.tabs.sessions"), icon: "smartphone" }
])
</script>

<template>
  <div class="aoi-page me-page">
    <PageHeader
      icon="circle-user-round"
      :title="t('me.headTitle')"
      :description="profile ? `@${profile.handle} • ${roleLabel(profile.role)}` : null"
    >
      <template #actions>
        <AoiButton
          variant="outlined"
          tone="neutral"
          icon="log-out"
          :disabled="loggingOut"
          @click="logout"
        >
          {{ loggingOut ? t("me.loggingOut") : t("me.logout") }}
        </AoiButton>
      </template>
    </PageHeader>

    <div v-if="!authSession.hydrated || profilePending" class="me-loading-wrapper">
      <AoiProgress indeterminate />
      <span class="me-loading-text">{{ t("me.loading") }}</span>
    </div>

    <div v-else-if="profileError && !profile" class="me-error-wrapper">
      <AoiStatusMessage intent="danger" icon="alert-circle">
        {{ profileError }}
      </AoiStatusMessage>
      <AoiButton variant="filled" tone="accent" @click="loadProfile">
        {{ t("me.saveChanges") }}
      </AoiButton>
    </div>

    <div v-else-if="profile" class="me-layout">
      <!-- Left sidebar -->
      <aside class="me-sidebar">
        <AoiSurface surface="panel" padding="md" class="me-profile-card">
          <div class="me-profile-avatar-container">
            <img
              v-if="profile.avatarUrl"
              :src="profile.avatarUrl"
              :alt="profile.displayName"
              class="me-profile-avatar"
            />
            <div v-else class="me-profile-avatar-fallback">
              {{ profile.displayName.charAt(0).toUpperCase() }}
            </div>
          </div>
          <div class="me-profile-meta">
            <h3>{{ profile.displayName }}</h3>
            <p>@{{ profile.handle }}</p>
            <span class="me-role-pill">{{ roleLabel(profile.role) }}</span>
          </div>
        </AoiSurface>

        <AoiSegmentedControl
          v-model="activeTab"
          :items="tabItems"
          selection-role="tab"
        />
      </aside>

      <!-- Main Panel content -->
      <main class="me-main-content">
        <!-- Tab: Profile -->
        <div v-if="activeTab === 'profile'" class="me-tab-pane">
          <!-- Info display -->
          <AoiSurface surface="panel" padding="lg">
            <h2 class="me-pane-title">
              <AoiIcon name="info" :size="18" decorative />
              {{ t("me.profileSection") }}
            </h2>
            <div class="me-info-grid">
              <div class="me-info-field">
                <span class="me-field-name">{{ t("me.handle") }}</span>
                <span class="me-field-value">@{{ profile.handle }}</span>
              </div>
              <div class="me-info-field">
                <span class="me-field-name">{{ t("me.email") }}</span>
                <span class="me-field-value">{{ profile.email }}</span>
              </div>
              <div class="me-info-field">
                <span class="me-field-name">{{ t("me.role") }}</span>
                <span class="me-field-value">{{ roleLabel(profile.role) }}</span>
              </div>
              <div class="me-info-field">
                <span class="me-field-name">{{ t("me.createdAt") }}</span>
                <span class="me-field-value">{{ formatDate(profile.createdAt) }}</span>
              </div>
              <div v-if="profile.lastLoginAt" class="me-info-field">
                <span class="me-field-name">{{ t("me.lastLoginAt") }}</span>
                <span class="me-field-value">{{ formatDate(profile.lastLoginAt) }}</span>
              </div>
              <div v-if="profile.bio" class="me-info-field me-info-field--full">
                <span class="me-field-name">{{ t("me.bio") }}</span>
                <span class="me-field-value me-bio-text">{{ profile.bio }}</span>
              </div>
            </div>
          </AoiSurface>

          <!-- Edit Display Name -->
          <AoiSurface surface="panel" padding="lg">
            <h2 class="me-pane-title">
              <AoiIcon name="user" :size="18" decorative />
              {{ t("me.editProfile") }}
            </h2>
            <div v-if="!editingDisplayName" class="me-trigger-row">
              <p class="me-trigger-desc">
                {{ t("me.displayName") }}: <strong>{{ profile.displayName }}</strong>
              </p>
              <AoiButton variant="outlined" tone="accent" @click="startEditDisplayName">
                {{ t("me.editProfile") }}
              </AoiButton>
            </div>
            <div v-else class="me-edit-form-content">
              <AoiTextField
                v-model="displayNameInput"
                appearance="outlined"
                :label="t('me.displayName')"
                :max-length="120"
                @enter="saveDisplayName"
              />
              <div class="me-form-actions">
                <AoiButton
                  variant="filled"
                  tone="accent"
                  :disabled="displayNameSaving || !displayNameInput.trim()"
                  @click="saveDisplayName"
                >
                  {{ displayNameSaving ? t("me.saving") : t("me.saveChanges") }}
                </AoiButton>
                <AoiButton variant="plain" tone="neutral" @click="cancelEditDisplayName">
                  {{ t("me.cancel") }}
                </AoiButton>
              </div>
            </div>
            <AoiStatusMessage
              v-if="displayNameMessage"
              :intent="displayNameMessage.type === 'success' ? 'success' : 'danger'"
              icon="info"
              class="me-form-feedback"
            >
              {{ displayNameMessage.text }}
            </AoiStatusMessage>
          </AoiSurface>

          <!-- Edit Creator Profile -->
          <AoiSurface v-if="isCreator" surface="panel" padding="lg">
            <h2 class="me-pane-title">
              <AoiIcon name="sparkles" :size="18" decorative />
              {{ t("me.editCreatorProfile") }}
            </h2>
            <div v-if="!editingCreatorProfile" class="me-trigger-row">
              <div class="me-trigger-desc">
                <p><strong>{{ t("me.bio") }}:</strong> {{ profile.bio || "-" }}</p>
                <p class="me-avatar-url-desc">
                  <strong>{{ t("me.avatarUrl") }}:</strong> <span class="me-url-text">{{ profile.avatarUrl || "-" }}</span>
                </p>
              </div>
              <AoiButton variant="outlined" tone="accent" @click="startEditCreatorProfile">
                {{ t("me.editCreatorProfile") }}
              </AoiButton>
            </div>
            <div v-else class="me-edit-form-content">
              <div class="me-avatar-uploader">
                <AoiImageClipboard
                  label="剪切并上传头像 (WebP)"
                  aspect-ratio="1:1"
                  :aspect-ratios="[{ value: '1:1', label: '1:1 正方形' }]"
                  @result="onAvatarCropped"
                />
              </div>
              <AoiTextField
                v-model="creatorBioInput"
                appearance="outlined"
                :label="t('me.bio')"
                multiline
                :rows="3"
                :max-length="640"
              />
              <AoiTextField
                v-model="creatorAvatarInput"
                appearance="outlined"
                :label="t('me.avatarUrl')"
                :max-length="512"
              />
              <div class="me-form-actions">
                <AoiButton
                  variant="filled"
                  tone="accent"
                  :disabled="creatorSaving"
                  @click="saveCreatorProfile"
                >
                  {{ creatorSaving ? t("me.saving") : t("me.saveChanges") }}
                </AoiButton>
                <AoiButton variant="plain" tone="neutral" @click="cancelEditCreatorProfile">
                  {{ t("me.cancel") }}
                </AoiButton>
              </div>
            </div>
            <AoiStatusMessage
              v-if="creatorMessage"
              :intent="creatorMessage.type === 'success' ? 'success' : 'danger'"
              icon="info"
              class="me-form-feedback"
            >
              {{ creatorMessage.text }}
            </AoiStatusMessage>
          </AoiSurface>
        </div>

        <!-- Tab: Following -->
        <div v-else-if="activeTab === 'following'" class="me-tab-pane">
          <div v-if="followingPending" class="me-loading-wrapper">
            <AoiProgress indeterminate />
            <span class="me-loading-text">正在加载关注列表...</span>
          </div>
          <div v-else-if="followingError" class="me-error-wrapper">
            <AoiStatusMessage intent="danger" icon="alert-circle">
              {{ followingError }}
            </AoiStatusMessage>
            <AoiButton variant="filled" tone="accent" @click="loadFollowing">
              重新加载
            </AoiButton>
          </div>
          <template v-else>
            <div v-if="followingList && followingList.length > 0" class="me-creators-grid">
              <CreatorCard
                v-for="creator in followingList"
                :key="creator.id"
                :creator="creator"
                density="compact"
              />
            </div>
            <AoiSurface v-else surface="panel" padding="lg">
              <PageState
                icon="users"
                title="暂无关注"
                description="你还没关注任何社区创作者。去首页发现有趣的创作团队吧。"
                action-icon="search"
                action-label="发现创作者"
                @action="navigateTo('/')"
              />
            </AoiSurface>
          </template>
        </div>

        <!-- Tab: Collections -->
        <div v-else-if="activeTab === 'collections'" class="me-tab-pane">
          <div v-if="collectionsPending" class="me-loading-wrapper">
            <AoiProgress indeterminate />
            <span class="me-loading-text">正在同步收藏列表...</span>
          </div>
          <div v-else-if="collectionsError" class="me-error-wrapper">
            <AoiStatusMessage intent="danger" icon="alert-circle">
              {{ collectionsError }}
            </AoiStatusMessage>
            <AoiButton variant="filled" tone="accent" @click="loadCollections">
              重新同步
            </AoiButton>
          </div>
          <template v-else>
            <div v-if="library.favoriteList && library.favoriteList.length > 0" class="me-collections-list">
              <VideoGrid :videos="library.favoriteList" />
            </div>
            <AoiSurface v-else surface="panel" padding="lg">
              <PageState
                icon="star"
                title="暂无收藏"
                description="你的收藏列表是空的。在播放视频时点击收藏，内容就会出现在这里。"
                action-icon="search"
                action-label="浏览视频"
                @action="navigateTo('/')"
              />
            </AoiSurface>
          </template>
        </div>

        <!-- Tab: History -->
        <div v-else-if="activeTab === 'history'" class="me-tab-pane">
          <div v-if="historyPending" class="me-loading-wrapper">
            <AoiProgress indeterminate />
            <span class="me-loading-text">正在加载历史记录...</span>
          </div>
          <div v-else-if="historyError" class="me-error-wrapper">
            <AoiStatusMessage intent="danger" icon="alert-circle">
              {{ historyError }}
            </AoiStatusMessage>
            <AoiButton variant="filled" tone="accent" @click="loadHistory">
              重新加载
            </AoiButton>
          </div>
          <template v-else>
            <div v-if="library.history && library.history.length > 0" class="me-history-grid">
              <AoiContentGrid min-width="224px" gap="video" :mobile-columns="2">
                <HistoryEntryCard
                  v-for="(entry, index) in library.history"
                  :key="entry.video.id"
                  :entry="entry"
                  :index="index"
                  :viewed-label="formatViewedAt(entry)"
                  :progress-label="formatProgress(entry)"
                  :progress-percent="progressPercent(entry)"
                  :progress-aria-label="t('history.progress.aria')"
                />
              </AoiContentGrid>
            </div>
            <AoiSurface v-else surface="panel" padding="lg">
              <PageState
                icon="clock"
                title="没有播放历史"
                description="最近播放过的视频会记录在这里，方便你随时继续观看。"
                action-icon="search"
                action-label="去播放视频"
                @action="navigateTo('/')"
              />
            </AoiSurface>
          </template>
        </div>

        <!-- Tab: Security -->
        <div v-else-if="activeTab === 'security'" class="me-tab-pane">
          <AoiSurface surface="panel" padding="lg">
            <h2 class="me-pane-title">
              <AoiIcon name="key-round" :size="18" decorative />
              {{ t("me.changePassword") }}
            </h2>
            <div class="me-password-form">
              <AoiTextField
                v-model="currentPasswordInput"
                appearance="outlined"
                type="password"
                :label="t('me.currentPassword')"
              />
              <AoiTextField
                v-model="newPasswordInput"
                appearance="outlined"
                type="password"
                :label="t('me.newPassword')"
              />
              <div class="me-form-actions">
                <AoiButton
                  variant="filled"
                  tone="accent"
                  :disabled="passwordSaving || !currentPasswordInput.trim() || newPasswordInput.length < 8"
                  @click="changePassword"
                >
                  {{ passwordSaving ? t("me.saving") : t("me.changePassword") }}
                </AoiButton>
              </div>
            </div>
            <AoiStatusMessage
              v-if="passwordMessage"
              :intent="passwordMessage.type === 'success' ? 'success' : 'danger'"
              icon="info"
              class="me-form-feedback"
            >
              {{ passwordMessage.text }}
            </AoiStatusMessage>
          </AoiSurface>
        </div>

        <!-- Tab: Sessions -->
        <div v-else-if="activeTab === 'sessions'" class="me-tab-pane">
          <div v-if="sessionsPending" class="me-loading-wrapper">
            <AoiProgress indeterminate />
            <span class="me-loading-text">正在加载活跃会话...</span>
          </div>
          <div v-else-if="sessionsError" class="me-error-wrapper">
            <AoiStatusMessage intent="danger" icon="alert-circle">
              {{ sessionsError }}
            </AoiStatusMessage>
            <AoiButton variant="filled" tone="accent" @click="loadSessions">
              重新加载
            </AoiButton>
          </div>
          <template v-else>
            <div v-if="sessionsList && sessionsList.length > 0" class="me-sessions-list">
              <AoiSurface
                v-for="s in sessionsList"
                :key="s.id"
                surface="card"
                padding="md"
                class="me-session-card"
              >
                <div class="me-session-card__header">
                  <div class="me-session-card__title">
                    <AoiIcon :name="s.clientType.includes('mobile') ? 'smartphone' : 'monitor'" :size="18" decorative />
                    <strong>{{ s.clientType }}</strong>
                    <span v-if="s.id === authSession.session?.sessionId" class="me-current-session-badge">当前设备</span>
                  </div>
                  <span class="me-session-card__date">创建于 {{ formatDate(s.createdAt) }}</span>
                </div>
                <div class="me-session-card__body">
                  <div class="me-session-detail">
                    <span>IP 地址:</span>
                    <strong>{{ s.ipAddress }}</strong>
                  </div>
                  <div class="me-session-detail">
                    <span>User Agent:</span>
                    <span class="me-ua-text">{{ s.userAgent }}</span>
                  </div>
                </div>
              </AoiSurface>
            </div>
            <div v-else class="me-empty-sessions">
              没有找到活跃会话记录。
            </div>
          </template>
        </div>

        <!-- Tab: Submissions -->
        <div v-else-if="activeTab === 'submissions'" class="me-tab-pane">
          <!-- Loading -->
          <div v-if="submissionsPending" class="me-loading-wrapper">
            <AoiProgress indeterminate />
            <span class="me-loading-text">正在加载投稿列表...</span>
          </div>

          <!-- Error -->
          <div v-else-if="submissionsError" class="me-error-wrapper">
            <AoiStatusMessage intent="danger" icon="alert-circle">
              {{ submissionsError }}
            </AoiStatusMessage>
            <AoiButton variant="filled" tone="accent" @click="loadSubmissions">
              重新加载
            </AoiButton>
          </div>

          <!-- Content -->
          <template v-else>
            <div v-if="submissionsList && submissionsList.length > 0" class="me-submissions-grid">
              <AoiSurface
                v-for="sub in submissionsList"
                :key="sub.id"
                surface="card"
                padding="md"
                class="me-sub-card"
              >
                <div class="me-sub-card__header">
                  <div class="me-sub-card__title-row">
                    <h3 class="me-sub-card__title">{{ sub.title }}</h3>
                    <span class="me-sub-card__date">{{ formatDate(sub.createdAt) }}</span>
                  </div>
                  <p class="me-sub-card__desc">{{ sub.description || "无简介" }}</p>
                </div>

                <div class="me-sub-card__meta">
                  <div class="me-meta-item">
                    <span class="me-meta-label">分区</span>
                    <span class="me-meta-val">{{ sub.categorySlug }}</span>
                  </div>
                  <div class="me-meta-item">
                    <span class="me-meta-label">源文件</span>
                    <span class="me-meta-val me-sub-card__file">{{ sub.sourceName }} ({{ formatBytes(sub.sourceSize) }})</span>
                  </div>
                </div>

                <div class="me-sub-card__status">
                  <AoiStatusMessage
                    :intent="statusIntent(sub.status)"
                    icon="info"
                    class="me-sub-status-msg"
                  >
                    <div class="me-status-body">
                      <strong>{{ statusText(sub.status) }}</strong>
                      <span v-if="sub.status === 'rejected' && sub.reviewNote" class="me-reject-note">
                        原因: {{ sub.reviewNote }}
                      </span>
                    </div>
                  </AoiStatusMessage>
                </div>

                <div class="me-sub-card__actions" v-if="sub.status === 'published' && sub.publishedVideoId">
                  <AoiButton
                    variant="outlined"
                    tone="accent"
                    icon="play"
                    @click="navigateTo(`/video/${sub.publishedVideoId}`)"
                  >
                    播放视频
                  </AoiButton>
                </div>
              </AoiSurface>
            </div>

            <!-- Empty State -->
            <AoiSurface v-else surface="panel" padding="lg">
              <PageState
                icon="video"
                title="暂无投稿"
                description="您还没有发布过任何视频投稿，现在就可以上传您的第一个视频作品。"
                action-icon="upload"
                action-label="前往投稿"
                @action="navigateTo('/upload')"
              />
            </AoiSurface>
          </template>
        </div>
      </main>
    </div>
  </div>
</template>

<style scoped>
.me-page {
  max-width: var(--aoi-content-max-width);
}

.me-loading-wrapper {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 60px 0;
  color: var(--aoi-text-muted);
}

.me-loading-text {
  font-size: 0.95rem;
}

.me-error-wrapper {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  padding: 40px 0;
}

.me-layout {
  display: grid;
  grid-template-columns: 260px 1fr;
  gap: var(--aoi-grid-gap);
  align-items: start;
}

.me-sidebar :deep(.aoi-segmented) {
  grid-template-columns: 1fr;
}

.me-sidebar {
  display: flex;
  flex-direction: column;
  gap: var(--aoi-grid-gap-compact);
}

.me-profile-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
}

.me-profile-avatar-container {
  width: 88px;
  height: 88px;
  border-radius: var(--aoi-radius-round);
  overflow: hidden;
  margin-bottom: var(--aoi-grid-gap-compact);
  background: var(--aoi-accent-10);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.05);
  border: 2px solid var(--aoi-surface-solid);
}

.me-profile-avatar {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.me-profile-avatar-fallback {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 2rem;
  font-weight: 700;
  color: var(--aoi-accent-60);
}

.me-profile-meta h3 {
  margin: 0 0 4px;
  font-size: 1.1rem;
  font-weight: 750;
  color: var(--aoi-text);
}

.me-profile-meta p {
  margin: 0 0 var(--aoi-grid-gap-compact);
  font-size: 0.85rem;
  color: var(--aoi-text-muted);
}

.me-role-pill {
  display: inline-block;
  padding: 3px 12px;
  border-radius: var(--aoi-radius-round);
  background: var(--aoi-accent-10);
  color: var(--aoi-accent-60);
  font-size: 0.72rem;
  font-weight: 750;
}

.me-main-content {
  min-width: 0;
}

.me-tab-pane {
  display: grid;
  gap: var(--aoi-grid-gap);
}

.me-pane-title {
  margin: 0 0 var(--aoi-grid-gap);
  font-size: 1.1rem;
  font-weight: 750;
  color: var(--aoi-text);
  display: flex;
  align-items: center;
  gap: 8px;
}

.me-info-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
}

.me-info-field {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.me-info-field--full {
  grid-column: span 2;
}

.me-field-name {
  font-size: 0.72rem;
  font-weight: 750;
  color: var(--aoi-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.me-field-value {
  font-size: 0.95rem;
  font-weight: 600;
  color: var(--aoi-text);
}

.me-bio-text {
  line-height: 1.6;
  white-space: pre-wrap;
}

.me-trigger-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.me-trigger-desc {
  font-size: 0.95rem;
  color: var(--aoi-text);
  margin: 0;
}

.me-trigger-desc p {
  margin: 4px 0;
}

.me-avatar-url-desc {
  color: var(--aoi-text-muted);
  font-size: 0.85rem;
}

.me-url-text {
  font-family: monospace;
  background: var(--aoi-surface-muted);
  padding: 2px 6px;
  border-radius: var(--aoi-radius-xs);
  word-break: break-all;
}

.me-edit-form-content {
  display: grid;
  gap: 14px;
}

.me-form-actions {
  display: flex;
  gap: 8px;
}

.me-form-feedback {
  margin-top: 12px;
}

.me-password-form {
  display: grid;
  gap: 16px;
  max-width: 480px;
}

.me-submissions-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: var(--aoi-grid-gap);
}

.me-sub-card {
  display: flex;
  flex-direction: column;
  gap: var(--aoi-grid-gap-compact);
  height: 100%;
}

.me-sub-card__header {
  display: grid;
  gap: 4px;
}

.me-sub-card__title-row {
  display: flex;
  justify-content: space-between;
  align-items: first baseline;
  gap: 12px;
}

.me-sub-card__title {
  font-size: 1rem;
  font-weight: 750;
  color: var(--aoi-text);
  margin: 0;
  word-break: break-word;
}

.me-sub-card__date {
  font-size: 0.75rem;
  color: var(--aoi-text-muted);
  white-space: nowrap;
}

.me-sub-card__desc {
  font-size: 0.85rem;
  color: var(--aoi-text-muted);
  margin: 4px 0 0;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  line-height: 1.5;
}

.me-sub-card__meta {
  display: grid;
  gap: 6px;
  border-top: 1px solid var(--aoi-border);
  padding-top: 8px;
}

.me-meta-item {
  display: flex;
  justify-content: space-between;
  font-size: 0.8rem;
}

.me-meta-label {
  color: var(--aoi-text-muted);
}

.me-meta-val {
  font-weight: 600;
  color: var(--aoi-text);
}

.me-sub-card__file {
  font-family: monospace;
  max-width: 200px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.me-sub-card__status {
  margin-top: auto;
}

.me-sub-status-msg {
  padding: var(--aoi-row-padding) !important;
}

.me-status-body {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.me-reject-note {
  font-size: 0.75rem;
  opacity: 0.9;
}

.me-sub-card__actions {
  display: flex;
  justify-content: flex-end;
  border-top: 1px solid var(--aoi-border);
  padding-top: 8px;
}

.me-creators-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: var(--aoi-grid-gap);
}

.me-sessions-list {
  display: grid;
  gap: var(--aoi-grid-gap-compact);
}

.me-session-card {
  display: grid;
  gap: 8px;
}

.me-session-card__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.me-session-card__title {
  display: flex;
  align-items: center;
  gap: 6px;
  color: var(--aoi-text);
}

.me-current-session-badge {
  font-size: 11px;
  background: var(--aoi-accent-10);
  color: var(--aoi-accent-60);
  padding: 2px 8px;
  border-radius: var(--aoi-radius-round);
  font-weight: 750;
}

.me-session-card__date {
  font-size: 12px;
  color: var(--aoi-text-muted);
}

.me-session-card__body {
  font-size: 13px;
  display: grid;
  gap: 4px;
  border-top: 1px solid var(--aoi-border);
  padding-top: 8px;
}

.me-session-detail {
  display: flex;
  gap: 8px;
}

.me-session-detail span {
  color: var(--aoi-text-muted);
}

.me-session-detail strong {
  color: var(--aoi-text);
}

.me-ua-text {
  color: var(--aoi-text-muted);
  font-family: monospace;
  font-size: 11px;
  word-break: break-all;
}

.me-avatar-uploader {
  display: grid;
  gap: 12px;
  border: 1px dashed var(--aoi-border);
  padding: 16px;
  border-radius: var(--aoi-radius-sm);
  background: var(--aoi-surface-muted);
}

@media (max-width: 760px) {
  .me-layout {
    grid-template-columns: 1fr;
  }
  .me-info-grid {
    grid-template-columns: 1fr;
  }
  .me-info-field--full {
    grid-column: span 1;
  }
  .me-submissions-grid {
    grid-template-columns: 1fr;
  }
}
</style>