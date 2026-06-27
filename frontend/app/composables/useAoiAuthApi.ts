import type {
  AoiApiErrorPayload,
  ApiResultEnvelope,
  ErrorResponse,
  CommunityAuthSession,
  CommunitySetupStatus,
  CommunitySignupRequest,
  LoginRequest,
  CommunitySignupResult
} from "~/types/api"
import { createAoiCredentialHeaders } from "~/utils/apiCredentials"

type AuthRequestOptions = {
  body?: unknown
  method?: "GET" | "POST"
  suppressTelemetry?: boolean
}

type AuthLogoutResult = {
  loggedOut?: boolean
}

export function useAoiAuthApi() {
  const config = useRuntimeConfig()
  const telemetry = useAoiApiTelemetry()
  const apiMock = computed(() => config.public.apiMock)
  const baseURL = computed(() => apiMock.value ? "/api/mock" : config.public.authApiBaseURL || "/api/v1")
  const authPath = computed(() => apiMock.value ? "/auth" : "/public/community/auth")

  async function request<T>(endpoint: string, options: AuthRequestOptions = {}): Promise<T> {
    try {
      const response = await $fetch<unknown>(endpoint, {
        baseURL: baseURL.value,
        body: options.body as BodyInit | Record<string, unknown> | null | undefined,
        credentials: "include",
        headers: createAoiCredentialHeaders(options.method, config),
        method: options.method
      })

      return unwrapAuthResponse<T>(response, endpoint)
    } catch (error) {
      const apiError = isAoiApiErrorPayload(error) ? error : toAoiAuthApiError(error, endpoint)

      if (!options.suppressTelemetry) {
        telemetry.recordError(apiError)
      }
      throw apiError
    }
  }

  async function login(body: LoginRequest): Promise<CommunityAuthSession> {
    return await request<CommunityAuthSession>(`${authPath.value}/login`, {
      body,
      method: "POST"
    })
  }

  async function getSession(options: { suppressTelemetry?: boolean } = {}): Promise<CommunityAuthSession | null> {
    const session = await request<CommunityAuthSession | null>(`${authPath.value}/session`, {
      method: "GET",
      suppressTelemetry: options.suppressTelemetry
    })

    return session || null
  }

  async function logout(): Promise<boolean> {
    const result = await request<AuthLogoutResult>(`${authPath.value}/logout`, {
      method: "POST"
    })

    return result.loggedOut === true
  }

  async function signup(body: CommunitySignupRequest): Promise<CommunitySignupResult> {
    return await request<CommunitySignupResult>(`${authPath.value}/signup`, {
      body,
      method: "POST"
    })
  }

  return {
    getSession,
    login,
    logout,
    signup
  }
}

function unwrapAuthResponse<T>(response: unknown, endpoint: string): T {
  if (!isApiResultEnvelope<T>(response)) {
    return response as T
  }

  if (response.code !== 0) {
    const responseData = response.data

    throw {
      code: String(response.code),
      endpoint,
      message: response.message || response.messageKey || "请求暂时失败，请稍后重试。",
      messageArgs: response.messageArgs,
      messageKey: response.messageKey,
      requestId: response.traceId || `aoi-auth-${Date.now()}`,
      setup: isCommunitySetupStatus(responseData) ? responseData : null,
      statusCode: 200
    } satisfies AoiApiErrorPayload
  }

  return response.data as T
}

function toAoiAuthApiError(error: unknown, endpoint: string): AoiApiErrorPayload {
  const fetchError = error as {
    data?: ErrorResponse | ApiResultEnvelope<unknown>
    message?: string
    status?: number
    statusCode?: number
    statusMessage?: string
  }
  const responseError = isErrorResponse(fetchError.data) ? fetchError.data.error : null
  const resultError = isApiResultEnvelope(fetchError.data) ? fetchError.data : null
  const resultData = resultError?.data
  const statusCode = fetchError.statusCode || fetchError.status || 500
  const code = responseError?.code || (resultError ? String(resultError.code) : null) || fetchError.statusMessage || "AOI_AUTH_API_ERROR"

  return {
    code,
    endpoint,
    message: responseError?.message || resultError?.message || fetchError.message || "请求暂时失败，请稍后重试。",
    messageArgs: resultError?.messageArgs,
    messageKey: resultError?.messageKey,
    requestId: responseError?.requestId || resultError?.traceId || `aoi-auth-${Date.now()}`,
    setup: isCommunitySetupStatus(resultData) ? resultData : null,
    statusCode
  }
}

function isApiResultEnvelope<T = unknown>(value: unknown): value is ApiResultEnvelope<T> {
  return Boolean(
    value &&
    typeof value === "object" &&
    "code" in value &&
    "messageKey" in value &&
    "serverTime" in value
  )
}

function isErrorResponse(value: unknown): value is ErrorResponse {
  return Boolean(
    value &&
    typeof value === "object" &&
    "error" in value
  )
}

function isCommunitySetupStatus(value: unknown): value is CommunitySetupStatus {
  return Boolean(
    value &&
    typeof value === "object" &&
    "required" in value &&
    "completed" in value &&
    "currentStep" in value
  )
}

function isAoiApiErrorPayload(value: unknown): value is AoiApiErrorPayload {
  return Boolean(
    value &&
    typeof value === "object" &&
    "endpoint" in value &&
    "statusCode" in value &&
    "requestId" in value
  )
}
