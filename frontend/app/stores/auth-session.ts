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
  let refreshPromise: Promise<CommunityAuthSession | null> | null = null

  const authenticated = computed(() => Boolean(session.value?.sessionId))

  let refreshTimer: any = null

  function scheduleTokenRefresh(expiresAt: string | null | undefined) {
    if (refreshTimer) {
      clearTimeout(refreshTimer)
      refreshTimer = null
    }

    if (!expiresAt || !import.meta.client) {
      return
    }

    const expiryTime = new Date(expiresAt).getTime()
    const nowTime = Date.now()
    const delay = expiryTime - nowTime - 120 * 1000 // refresh 2 minutes before expiration

    // If it has already expired or expires in less than 2 minutes, refresh in 2 seconds
    const safeDelay = delay > 0 ? delay : 2000

    // Set a max safety limit of 24h
    const maxDelay = 24 * 3600 * 1000
    const finalDelay = Math.min(safeDelay, maxDelay)

    refreshTimer = setTimeout(async () => {
      await silentRefresh()
    }, finalDelay)
  }

  async function silentRefresh() {
    const authApi = useAoiAuthApi()
    try {
      const nextSession = await authApi.refresh()
      acceptSession(nextSession)
    } catch (err) {
      console.warn("Silent refresh failed, fallback to getSession", err)
      try {
        const fallbackSession = await authApi.getSession({ suppressTelemetry: true })
        if (fallbackSession) {
          acceptSession(fallbackSession)
        } else {
          clearSession()
        }
      } catch {
        clearSession()
      }
    }
  }

  function acceptSession(nextSession: CommunityAuthSession | null | undefined) {
    session.value = nextSession || null
    error.value = null
    hydrated.value = true
    if (nextSession && nextSession.accessExpiresAt) {
      scheduleTokenRefresh(nextSession.accessExpiresAt)
    } else {
      if (refreshTimer) {
        clearTimeout(refreshTimer)
        refreshTimer = null
      }
    }
  }

  function acceptSignupResult(result: CommunitySignupResult) {
    acceptSession(result.session)
  }

  function clearSession() {
    session.value = null
    error.value = null
    hydrated.value = true
    if (refreshTimer) {
      clearTimeout(refreshTimer)
      refreshTimer = null
    }
  }


  async function refreshSession(options: { silent?: boolean } = {}) {
    if (!import.meta.client) {
      return session.value
    }

    if (refreshPromise) {
      return await refreshPromise
    }

    const authApi = useAoiAuthApi()

    if (!options.silent) {
      pending.value = true
      error.value = null
    }

    refreshPromise = (async () => {
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
        refreshPromise = null
      }
    })()

    return await refreshPromise
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
