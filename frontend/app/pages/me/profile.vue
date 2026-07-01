<script setup lang="ts">
import type { AccountProfileResponse } from "~/types/api"

const api = useAoiApi()
const { t } = useI18n()

const { profile, loadProfile } = inject("meProfile") as {
  profile: Ref<AccountProfileResponse | null>
  loadProfile: () => Promise<void>
}

// Display Name State
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

// Bio State
const editingBio = ref(false)
const bioInput = ref("")
const bioSaving = ref(false)
const bioMessage = ref<{ type: "success" | "error"; text: string } | null>(null)

function startEditBio() {
  bioInput.value = profile.value?.bio ?? ""
  editingBio.value = true
  bioMessage.value = null
}
function cancelEditBio() {
  editingBio.value = false
  bioMessage.value = null
}
async function saveBio() {
  if (bioSaving.value) return
  bioSaving.value = true
  bioMessage.value = null
  try {
    const updated = await api.updateAccountCreatorProfile({
      bio: bioInput.value.trim() || null,
      avatarUrl: profile.value?.avatarUrl || null
    })
    if (profile.value) {
      profile.value.bio = updated.bio
    }
    editingBio.value = false
    bioMessage.value = { type: "success", text: t("me.saveSuccess") }
  } catch (err) {
    bioMessage.value = { type: "error", text: t("me.saveError") }
  } finally {
    bioSaving.value = false
  }
}

function onProfileUpdate(updated: AccountProfileResponse) {
  if (profile.value) {
    profile.value.avatarUrl = updated.avatarUrl
    profile.value.bio = updated.bio
  }
}
</script>

<template>
  <div v-if="profile" class="me-profile-subpage">
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
        <div class="me-info-field me-info-field--full">
          <span class="me-field-name">{{ t("me.displayName") }}</span>
          <div v-if="!editingDisplayName" class="me-trigger-row">
            <span class="me-field-value">{{ profile.displayName }}</span>
            <AoiButton variant="outlined" tone="accent" @click="startEditDisplayName">
              {{ t("me.editDisplayName") }}
            </AoiButton>
          </div>
          <div v-else class="me-edit-form-content">
            <AoiTextField
              v-model="displayNameInput"
              appearance="outlined"
              :label="t('me.displayName')"
              :max-length="96"
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

    <!-- Avatar & Bio Section -->
    <AoiSurface surface="panel" padding="lg">
      <h2 class="me-pane-title">
        <AoiIcon name="sparkles" :size="18" decorative />
        {{ t("me.avatarAndBio") }}
      </h2>

      <!-- Avatar Manager -->
      <div class="me-avatar-section">
        <AoiAvatarManager
          :profile="profile"
          @update="onProfileUpdate"
        />
      </div>

      <div class="me-divider"></div>

      <!-- Bio Section -->
      <div class="me-bio-section">
        <span class="me-field-name">{{ t("me.bio") }}</span>
        <div v-if="!editingBio" class="me-trigger-row">
          <span class="me-field-value me-bio-text">{{ profile.bio || "暂无简介" }}</span>
          <AoiButton variant="outlined" tone="accent" @click="startEditBio">
            修改简介
          </AoiButton>
        </div>
        <div v-else class="me-edit-form-content">
          <AoiTextField
            v-model="bioInput"
            appearance="outlined"
            :label="t('me.bio')"
            multiline
            :rows="3"
            :max-length="640"
          />
          <div class="me-form-actions">
            <AoiButton
              variant="filled"
              tone="accent"
              :disabled="bioSaving"
              @click="saveBio"
            >
              {{ bioSaving ? t("me.saving") : t("me.saveChanges") }}
            </AoiButton>
            <AoiButton variant="plain" tone="neutral" @click="cancelEditBio">
              {{ t("me.cancel") }}
            </AoiButton>
          </div>
        </div>
      </div>
      <AoiStatusMessage
        v-if="bioMessage"
        :intent="bioMessage.type === 'success' ? 'success' : 'danger'"
        icon="info"
        class="me-form-feedback"
      >
        {{ bioMessage.text }}
      </AoiStatusMessage>
    </AoiSurface>
  </div>
</template>

<style scoped>
.me-profile-subpage {
  display: grid;
  gap: 16px;
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
  font-size: 0.8rem;
  color: var(--aoi-text-muted);
  margin-bottom: 4px;
}
.me-field-value {
  font-size: 1rem;
  color: var(--aoi-text);
  word-break: break-all;
}
.me-bio-text {
  line-height: 1.6;
  white-space: pre-wrap;
  flex: 1;
  margin-right: 16px;
}
.me-trigger-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
}
.me-edit-form-content {
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin-top: 12px;
}
.me-form-actions {
  display: flex;
  gap: 8px;
}
.me-form-feedback {
  margin-top: 16px;
}
.me-avatar-section {
  padding: 8px 0;
}
.me-divider {
  height: 1px;
  background: var(--aoi-border);
  margin: 24px 0;
}
.me-bio-section {
  display: flex;
  flex-direction: column;
}
@media (max-width: 760px) {
  .me-info-grid {
    grid-template-columns: 1fr;
  }
  .me-info-field--full {
    grid-column: span 1;
  }
}
</style>
