<script setup lang="ts">
import type { AoiApiErrorPayload } from "~/types/api"

definePageMeta({
  layout: "auth"
})

const { t } = useI18n()
const authApi = useAoiAuthApi()
const authSession = useAuthSessionStore()
const username = ref("")
const displayName = ref("")
const email = ref("")
const password = ref("")
const pending = ref(false)
const errorMessage = ref("")
const successMessage = ref("")

const canSubmit = computed(() => {
  return username.value.trim().length >= 2
    && email.value.trim().length > 0
    && password.value.length > 0
    && !pending.value
})

async function submitRegister() {
  if (!canSubmit.value) {
    return
  }

  pending.value = true
  errorMessage.value = ""
  successMessage.value = ""

  try {
    const result = await authApi.signup({
      displayName: displayName.value.trim() || undefined,
      email: email.value.trim(),
      password: password.value,
      username: username.value.trim()
    })

    authSession.acceptSignupResult(result)
    if (result.status === "authenticated") {
      const redirectTo = sessionStorage.getItem("last_non_auth_route") || "/me"
      navigateTo(redirectTo)
    } else {
      successMessage.value = t("auth.register.verificationPending")
    }
  } catch (error) {
    errorMessage.value = authErrorMessage(error, t("auth.errors.default"))
  } finally {
    pending.value = false
  }
}

function authErrorMessage(error: unknown, fallback: string) {
  const apiError = error as Partial<AoiApiErrorPayload>

  return apiError.message || fallback
}

useHead(() => ({
  title: t("auth.register.headTitle")
}))
</script>

<template>
  <div class="aoi-page auth-page">
    <AuthShell labelledby="register-title" visual-position="end">
      <AuthPanel
        title-id="register-title"
        :title="t('auth.register.title')"
        :description="t('auth.register.description')"
        :submit-label="pending ? t('auth.register.submitting') : t('auth.register.submit')"
        submit-icon="user-plus"
        :disabled="!canSubmit"
        :loading="pending"
        :error-message="errorMessage || undefined"
        :success-message="successMessage || undefined"
        @submit="submitRegister"
      >
        <template #fields>
          <AoiTextField
            v-model="username"
            :label="t('auth.register.username')"
            :placeholder="t('auth.register.usernamePlaceholder')"
            :supporting-text="t('auth.register.usernameHelp')"
            appearance="outlined"
            @enter="submitRegister"
          />
          <AoiTextField
            v-model="displayName"
            :label="t('auth.register.displayName')"
            :placeholder="t('auth.register.displayNamePlaceholder')"
            appearance="outlined"
            @enter="submitRegister"
          />
          <AoiTextField
            v-model="email"
            :label="t('auth.register.email')"
            :placeholder="t('auth.register.emailPlaceholder')"
            type="email"
            appearance="outlined"
            @enter="submitRegister"
          />
          <AoiTextField
            v-model="password"
            :label="t('auth.register.password')"
            :supporting-text="t('auth.register.passwordHelp')"
            type="password"
            appearance="outlined"
            @enter="submitRegister"
          />
        </template>

        <template #switch>
          <span>{{ t("auth.register.hasAccount") }}</span>
          <AoiLink to="/login">{{ t("auth.register.loginAction") }}</AoiLink>
        </template>
      </AuthPanel>

      <template #visual>
        <AuthMotionVisual title="Join" variant="register" />
      </template>
    </AuthShell>
  </div>
</template>

<style scoped>
.auth-page {
  display: grid;
  min-height: calc(100vh - 36px);
  align-items: center;
}

@media (max-width: 639px) {
  .auth-page {
    min-height: calc(100vh - var(--aoi-mobile-nav-height));
  }
}
</style>
