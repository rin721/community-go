<script setup lang="ts">
import type { AccountProfileResponse } from "~/types/api"

const props = defineProps<{
  profile: AccountProfileResponse
}>()

const emit = defineEmits<{
  update: [profile: AccountProfileResponse]
}>()

const api = useAoiApi()
const authSession = useAuthSessionStore()
const { t } = useI18n()

const fileInputRef = ref<HTMLInputElement | null>(null)
const uploading = ref(false)
const errorMessage = ref<string | null>(null)
const successMessage = ref<string | null>(null)

// History state
const historyOpen = ref(false)
const historyAvatars = ref<string[]>([])

// Load history avatars on mount
const historyKey = computed(() => `aoi_avatar_history_${props.profile.handle}`)

function loadHistory() {
  if (import.meta.client) {
    try {
      const stored = localStorage.getItem(historyKey.value)
      if (stored) {
        historyAvatars.value = JSON.parse(stored).filter((url: string) => typeof url === "string" && url.trim())
      }
    } catch {
      historyAvatars.value = []
    }
  }
}

function saveHistory(urls: string[]) {
  if (import.meta.client) {
    try {
      localStorage.setItem(historyKey.value, JSON.stringify(urls))
    } catch {}
  }
}

function addToHistory(url: string) {
  if (!url) return
  // Filter out duplicate and keep max 8 records
  const list = [url, ...historyAvatars.value.filter(u => u !== url)].slice(0, 8)
  historyAvatars.value = list
  saveHistory(list)
}

function removeFromHistory(url: string) {
  const list = historyAvatars.value.filter(u => u !== url)
  historyAvatars.value = list
  saveHistory(list)
}

function triggerFileSelect() {
  fileInputRef.value?.click()
}

async function handleFileChange(event: Event) {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (!file) return

  // Basic validation
  if (!file.type.startsWith("image/")) {
    errorMessage.value = "请选择有效的图片文件"
    return
  }

  // Max 5MB
  if (file.size > 5 * 1024 * 1024) {
    errorMessage.value = "图片大小不能超过 5MB"
    return
  }

  uploading.value = true
  errorMessage.value = null
  successMessage.value = null

  try {
    const res = await api.uploadAccountAvatar(file)
    // Add current avatar to history first if it exists
    if (props.profile.avatarUrl) {
      addToHistory(props.profile.avatarUrl)
    }

    // Update profile
    const updatedProfile = { ...props.profile, avatarUrl: res.avatarUrl }
    emit("update", updatedProfile)

    // Update auth store
    if (authSession.session && authSession.session.account) {
      (authSession.session.account as any).avatarUrl = res.avatarUrl
    }

    // Add new avatar to history
    addToHistory(res.avatarUrl)
    successMessage.value = "头像上传并更新成功"
  } catch (err: any) {
    errorMessage.value = err.message || "头像上传失败，请重试"
  } finally {
    uploading.value = false
    // Clear input
    target.value = ""
  }
}

async function deleteAvatar() {
  if (uploading.value) return
  uploading.value = true
  errorMessage.value = null
  successMessage.value = null

  try {
    // Add to history before deleting so they can revert if they want
    if (props.profile.avatarUrl) {
      addToHistory(props.profile.avatarUrl)
    }

    await api.deleteAccountAvatar()

    const updatedProfile = { ...props.profile, avatarUrl: "" }
    emit("update", updatedProfile)

    if (authSession.session && authSession.session.account) {
      (authSession.session.account as any).avatarUrl = ""
    }

    successMessage.value = "头像已成功清除"
  } catch (err: any) {
    errorMessage.value = err.message || "头像删除失败，请重试"
  } finally {
    uploading.value = false
  }
}

async function selectFromHistory(url: string) {
  if (uploading.value) return
  uploading.value = true
  errorMessage.value = null
  successMessage.value = null
  historyOpen.value = false

  try {
    // Call creator profile update to set new avatar URL
    const updated = await api.updateAccountCreatorProfile({
      avatarUrl: url
    })

    emit("update", updated)

    if (authSession.session && authSession.session.account) {
      (authSession.session.account as any).avatarUrl = url
    }

    successMessage.value = "已切换为选中的历史头像"
  } catch (err: any) {
    errorMessage.value = err.message || "切换头像失败，请重试"
  } finally {
    uploading.value = false
  }
}

onMounted(() => {
  loadHistory()
})

watch(() => props.profile.handle, () => {
  loadHistory()
})
</script>

<template>
  <div class="aoi-avatar-manager">
    <!-- Hidden File Input -->
    <input
      ref="fileInputRef"
      type="file"
      accept="image/*"
      style="display: none"
      @change="handleFileChange"
    />

    <div class="avatar-manager__layout">
      <!-- Big interactive avatar container -->
      <div
        class="avatar-manager__preview"
        :class="{ 'avatar-manager__preview--uploading': uploading }"
        @click="triggerFileSelect"
      >
        <img
          v-if="props.profile.avatarUrl"
          :src="props.profile.avatarUrl"
          :alt="props.profile.displayName"
          class="avatar-manager__image"
        />
        <div v-else class="avatar-manager__fallback">
          {{ props.profile.displayName.charAt(0).toUpperCase() }}
        </div>

        <!-- Hover overlay -->
        <div class="avatar-manager__overlay">
          <AoiIcon v-if="!uploading" name="camera" :size="24" decorative />
          <AoiProgress v-else indeterminate />
          <span class="avatar-manager__overlay-text">
            {{ uploading ? '正在上传...' : '上传新头像' }}
          </span>
        </div>
      </div>

      <!-- Action buttons -->
      <div class="avatar-manager__actions">
        <div class="avatar-manager__buttons-row">
          <AoiButton
            variant="filled"
            tone="accent"
            icon="upload"
            :loading="uploading"
            @click="triggerFileSelect"
          >
            选择图片文件
          </AoiButton>

          <AoiButton
            v-if="historyAvatars.length > 0"
            variant="outlined"
            tone="accent"
            icon="history"
            :disabled="uploading"
            @click="historyOpen = true"
          >
            选择历史头像 ({{ historyAvatars.length }})
          </AoiButton>

          <AoiButton
            v-if="props.profile.avatarUrl"
            variant="outlined"
            tone="danger"
            icon="trash-2"
            :disabled="uploading"
            @click="deleteAvatar"
          >
            删除当前头像
          </AoiButton>
        </div>

        <p class="avatar-manager__tips">
          支持 JPG, PNG, WEBP 格式，大小不超过 5MB。点击上方头像或选择按钮直接上传。
        </p>

        <!-- Messages -->
        <AoiStatusMessage
          v-if="errorMessage"
          intent="danger"
          icon="alert-circle"
          class="avatar-manager__status"
        >
          {{ errorMessage }}
        </AoiStatusMessage>

        <AoiStatusMessage
          v-if="successMessage"
          intent="success"
          icon="check-circle"
          class="avatar-manager__status"
        >
          {{ successMessage }}
        </AoiStatusMessage>
      </div>
    </div>

    <!-- History Dialog -->
    <AoiDialog v-model:open="historyOpen">
      <template #headline>
        <span class="history-dialog__title">选择历史头像</span>
      </template>

      <div class="history-dialog__grid">
        <div
          v-for="url in historyAvatars"
          :key="url"
          class="history-dialog__item"
        >
          <div class="history-dialog__img-wrapper" @click="selectFromHistory(url)">
            <img :src="url" alt="Historical Avatar" class="history-dialog__img" />
            <div class="history-dialog__img-overlay">
              <AoiIcon name="check" :size="16" decorative />
              <span>使用此头像</span>
            </div>
          </div>
          <button
            class="history-dialog__remove-btn"
            title="从历史记录删除"
            @click.stop="removeFromHistory(url)"
          >
            <AoiIcon name="x" :size="12" decorative />
          </button>
        </div>
      </div>

      <template #actions>
        <AoiButton variant="plain" tone="neutral" @click="historyOpen = false">
          关闭
        </AoiButton>
      </template>
    </AoiDialog>
  </div>
</template>

<style scoped>
.aoi-avatar-manager {
  display: grid;
  gap: 16px;
}

.avatar-manager__layout {
  display: flex;
  align-items: center;
  gap: 24px;
}

.avatar-manager__preview {
  position: relative;
  width: 120px;
  height: 120px;
  border-radius: var(--aoi-radius-round);
  overflow: hidden;
  cursor: pointer;
  background: var(--aoi-accent-10);
  border: 3px solid var(--aoi-surface-border);
  box-shadow: var(--aoi-shadow-sm);
  flex-shrink: 0;
  transition: transform var(--aoi-duration-fast) var(--aoi-ease-out), border-color var(--aoi-duration-fast) var(--aoi-ease-out);
}

.avatar-manager__preview:hover {
  transform: scale(1.02);
  border-color: var(--aoi-accent-40);
}

.avatar-manager__image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.avatar-manager__fallback {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 2.5rem;
  font-weight: 750;
  color: var(--aoi-accent-60);
  background: linear-gradient(135deg, var(--aoi-accent-10) 0%, var(--aoi-accent-20) 100%);
}

.avatar-manager__overlay {
  position: absolute;
  inset: 0;
  background: color-mix(in srgb, var(--aoi-neutral-10) 65%, transparent);
  color: var(--aoi-surface-solid);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  opacity: 0;
  pointer-events: none;
  transition: opacity var(--aoi-duration-fast) var(--aoi-ease-out);
}

.avatar-manager__preview:hover .avatar-manager__overlay,
.avatar-manager__preview--uploading .avatar-manager__overlay {
  opacity: 1;
  pointer-events: auto;
}

.avatar-manager__overlay-text {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.05em;
}

.avatar-manager__actions {
  display: flex;
  flex-direction: column;
  gap: 12px;
  flex: 1;
}

.avatar-manager__buttons-row {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.avatar-manager__tips {
  font-size: 0.8rem;
  color: var(--aoi-text-muted);
  margin: 0;
}

.avatar-manager__status {
  margin-top: 4px;
}

/* History Dialog Styles */
.history-dialog__title {
  font-size: 1.1rem;
  font-weight: 750;
  color: var(--aoi-text);
}

.history-dialog__grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  padding: 12px 4px;
  max-width: 440px;
}

.history-dialog__item {
  position: relative;
  aspect-ratio: 1;
  border-radius: var(--aoi-radius-sm);
  overflow: hidden;
  border: 2px solid var(--aoi-border);
  background: var(--aoi-surface-muted);
  transition: border-color var(--aoi-duration-fast) var(--aoi-ease-out);
}

.history-dialog__item:hover {
  border-color: var(--aoi-accent-40);
}

.history-dialog__img-wrapper {
  position: relative;
  width: 100%;
  height: 100%;
  cursor: pointer;
}

.history-dialog__img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.history-dialog__img-overlay {
  position: absolute;
  inset: 0;
  background: color-mix(in srgb, var(--aoi-neutral-10) 50%, transparent);
  color: var(--aoi-surface-solid);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  opacity: 0;
  transition: opacity var(--aoi-duration-fast) var(--aoi-ease-out);
}

.history-dialog__img-wrapper:hover .history-dialog__img-overlay {
  opacity: 1;
}

.history-dialog__img-overlay span {
  font-size: 9px;
  font-weight: 700;
}

.history-dialog__remove-btn {
  position: absolute;
  top: 4px;
  right: 4px;
  width: 20px;
  height: 20px;
  border-radius: var(--aoi-radius-round);
  background: color-mix(in srgb, var(--aoi-neutral-10) 70%, transparent);
  color: var(--aoi-surface-solid);
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity var(--aoi-duration-fast) var(--aoi-ease-out), scale var(--aoi-duration-fast) var(--aoi-ease-out);
}

.history-dialog__item:hover .history-dialog__remove-btn {
  opacity: 1;
}

.history-dialog__remove-btn:hover {
  scale: 1.1;
  background: var(--aoi-danger-solid);
}

@media (max-width: 639px) {
  .avatar-manager__layout {
    flex-direction: column;
    align-items: center;
    text-align: center;
  }
  .avatar-manager__buttons-row {
    justify-content: center;
  }
  .history-dialog__grid {
    grid-template-columns: repeat(3, 1fr);
  }
}
</style>
