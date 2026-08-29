<script setup lang="ts">
const api = useAoiApi()
const { t } = useI18n()

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
</script>

<template>
  <div class="me-security-subpage">
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
</template>

<style scoped>
.me-security-subpage {
  display: grid;
  gap: 16px;
}
.me-password-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
  max-width: 480px;
}
.me-form-actions {
  display: flex;
  justify-content: flex-start;
}
.me-form-feedback {
  margin-top: 16px;
}
</style>
