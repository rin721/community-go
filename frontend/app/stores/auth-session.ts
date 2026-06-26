import type { AoiApiErrorPayload, CommunityAuthSession, CommunitySignupResult } from "~/types/api"

function errorMessage(error: unknown) {
  const apiError = error as Partial<AoiApiErrorPayload>

  return apiError.message || "认证会话接口不可用，请稍后重试。"
}

export const useAuthSessionStore = defineStore("auth-session", () => {
  const error = ref<string | null>(null)
  const hydrated = ref(false)
  const pending = ref(false)
  const session = ref<CommunityAuthSession | null>(null)

  const authenticated = computed(() => Boolean(session.value?.sessionId))

  function acceptSession(nextSession: CommunityAuthSession | null | undefined) {
    session.value = nextSession || null
    error.value = null
    hydrated.value = true
  }

  function acceptSignupResult(result: CommunitySignupResult) {
    acceptSession(result.session)
  }

  function clearSession() {
    session.value = null
    error.value = null
    hydrated.value = true
  }

  async function refreshSession(options: { silent?: boolean } = {}) {
    if (!import.meta.client) {
      return session.value
    }

    const authApi = useAoiAuthApi()

    if (!options.silent) {
      pending.value = true
      error.value = null
    }

    try {
      const currentSession = await authApi.getSession({ suppressTelemetry: options.silent })

      acceptSession(currentSession)

      return currentSession
    } catch (refreshError) {
      session.value = null
      if (!options.silent) {
        error.value = errorMessage(refreshError)
      }

      return null
    } finally {
      pending.value = false
      hydrated.value = true
    }
  }

  async function logout() {
    const authApi = useAoiAuthApi()

    pending.value = true
    error.value = null

    try {
      await authApi.logout()
      clearSession()
    } catch (logoutError) {
      error.value = errorMessage(logoutError)
      throw logoutError
    } finally {
      pending.value = false
      hydrated.value = true
    }
  }

  return {
    acceptSession,
    acceptSignupResult,
    authenticated,
    clearSession,
    error,
    hydrated,
    logout,
    pending,
    refreshSession,
    session
  }
})
