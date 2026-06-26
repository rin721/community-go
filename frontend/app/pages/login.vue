<script setup lang="ts">
import type { AoiApiErrorPayload } from "~/types/api"

const { t } = useI18n()
const authApi = useAoiAuthApi()
const identifier = ref("")
const orgCode = ref("")
const password = ref("")
const pending = ref(false)
const errorMessage = ref("")
const successMessage = ref("")

const canSubmit = computed(() => identifier.value.trim().length > 0 && password.value.length > 0 && !pending.value)

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
      orgCode: orgCode.value.trim() || undefined,
      password: password.value
    })

    successMessage.value = t("auth.login.success", { sessionId: session.sessionId || "-" })
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
  title: t("auth.login.headTitle")
}))
</script>

<template>
  <div class="aoi-page auth-page">
    <AuthShell labelledby="login-title">
      <template #visual>
        <AuthMotionVisual title="Login" />
      </template>

      <AuthPanel
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
            v-model="orgCode"
            :label="t('auth.login.orgCode')"
            :placeholder="t('auth.login.orgCodePlaceholder')"
            :supporting-text="t('auth.login.orgCodeHelp')"
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

@media (max-width: 639px) {
  .auth-page {
    min-height: calc(100vh - var(--aoi-mobile-nav-height));
  }
}
</style>
