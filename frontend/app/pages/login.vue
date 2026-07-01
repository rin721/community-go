<script setup lang="ts">
import type { AoiApiErrorPayload } from "~/types/api"

definePageMeta({
  layout: "auth"
})

const { t } = useI18n()
const authApi = useAoiAuthApi()
const authSession = useAuthSessionStore()
const identifier = ref("")
const password = ref("")
const pending = ref(false)
const logoutPending = ref(false)
const errorMessage = ref("")
const successMessage = ref("")

const canSubmit = computed(() => identifier.value.trim().length > 0 && password.value.length > 0 && !pending.value)
const currentSession = computed(() => authSession.session)
const currentAccountName = computed(() => {
  return currentSession.value?.account.displayName || currentSession.value?.account.handle || ""
})

async function submitLogin() {
  if (!canSubmit.value) {
    return
  }

  pending.value = true
  errorMessage.value = ""
  successMessage.value = ""

  try {
    const session = await authApi.login({
      identifier: identifier.value.trim(),
      password: password.value
    })

    authSession.acceptSession(session)
    navigateTo("/me")
  } catch (error) {
    errorMessage.value = authErrorMessage(error, t("auth.errors.default"))
  } finally {
    pending.value = false
  }
}

async function submitLogout() {
  if (logoutPending.value) {
    return
  }

  logoutPending.value = true
  errorMessage.value = ""
  successMessage.value = ""

  try {
    await authSession.logout()
    successMessage.value = t("auth.session.logoutSuccess")
  } catch (error) {
    errorMessage.value = authErrorMessage(error, t("auth.errors.default"))
  } finally {
    logoutPending.value = false
  }
}

function authErrorMessage(error: unknown, fallback: string) {
  const apiError = error as Partial<AoiApiErrorPayload>

  return apiError.message || fallback
}

useHead(() => ({
  title: t("auth.login.headTitle")
}))
</script>

<template>
  <div class="aoi-page auth-page">
    <AuthShell labelledby="login-title">
      <template #visual>
        <AuthMotionVisual title="Login" />
      </template>

      <div v-if="currentSession" class="auth-session-card">
        <AoiStatusMessage as="div" icon="circle-user-round" intent="success">
          <span>
            <strong>{{ t("auth.session.title") }}</strong>
            {{ t("auth.session.description", { account: currentAccountName }) }}
          </span>
        </AoiStatusMessage>
        <AoiActionBar>
          <AoiButton
            icon="log-out"
            tone="accent"
            variant="outlined"
            :loading="logoutPending"
            :disabled="logoutPending"
            @click="submitLogout"
          >
            {{ logoutPending ? t("auth.session.loggingOut") : t("auth.session.logout") }}
          </AoiButton>
        </AoiActionBar>
      </div>

      <AuthPanel
        v-else
        title-id="login-title"
        :title="t('auth.login.title')"
        :description="t('auth.login.description')"
        :submit-label="pending ? t('auth.login.submitting') : t('auth.login.submit')"
        submit-icon="log-in"
        :disabled="!canSubmit"
        :loading="pending"
        :error-message="errorMessage || undefined"
        :success-message="successMessage || undefined"
        @submit="submitLogin"
      >
        <template #fields>
          <AoiTextField
            v-model="identifier"
            :label="t('auth.login.identifier')"
            :placeholder="t('auth.login.identifierPlaceholder')"
            appearance="outlined"
            @enter="submitLogin"
          />
          <AoiTextField
            v-model="password"
            :label="t('auth.login.password')"
            :supporting-text="t('auth.login.passwordHelp')"
            type="password"
            appearance="outlined"
            @enter="submitLogin"
          />
        </template>

        <template #switch>
          <span>{{ t("auth.login.noAccount") }}</span>
          <AoiLink to="/register">{{ t("auth.login.registerAction") }}</AoiLink>
        </template>
      </AuthPanel>
    </AuthShell>
  </div>
</template>

<style scoped>
.auth-page {
  display: grid;
  min-height: calc(100vh - 36px);
  align-items: center;
}

.auth-session-card {
  display: grid;
  gap: 12px;
}

.auth-session-card strong {
  margin-right: 6px;
}

@media (max-width: 639px) {
  .auth-page {
    min-height: calc(100vh - var(--aoi-mobile-nav-height));
  }
}
</style>
