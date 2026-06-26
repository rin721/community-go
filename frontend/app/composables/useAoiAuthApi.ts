import type {
  AoiApiErrorPayload,
  ApiResultEnvelope,
  ErrorResponse,
  AuthSessionSnapshot,
  LoginRequest,
  SignupResult
} from "~/types/api"

type AuthRequestOptions = {
  body?: unknown
  method?: "GET" | "POST"
  suppressTelemetry?: boolean
}

type AuthLogoutResult = {
  loggedOut?: boolean
}

type CommunitySignupRequest = {
  username: string
  email: string
  displayName?: string
  password: string
}

type BackendSignupRequest = CommunitySignupRequest & {
  orgCode: string
  orgName: string
}

const COMMUNITY_SIGNUP_ACCOUNT_PREFIX = "community"
const COMMUNITY_SIGNUP_FALLBACK_HANDLE = "member"
const COMMUNITY_SIGNUP_FALLBACK_NAME = "Community member"

export function useAoiAuthApi() {
  const config = useRuntimeConfig()
  const telemetry = useAoiApiTelemetry()
  const baseURL = computed(() => config.public.authApiBaseURL || "/api/v1")

  async function request<T>(endpoint: string, options: AuthRequestOptions = {}): Promise<T> {
    try {
      const response = await $fetch<unknown>(endpoint, {
        baseURL: baseURL.value,
        body: options.body as BodyInit | Record<string, unknown> | null | undefined,
        credentials: "include",
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

  async function login(body: LoginRequest): Promise<AuthSessionSnapshot> {
    return await request<AuthSessionSnapshot>("/auth/login", {
      body,
      method: "POST"
    })
  }

  async function getSession(options: { suppressTelemetry?: boolean } = {}): Promise<AuthSessionSnapshot> {
    return await request<AuthSessionSnapshot>("/me/session", {
      method: "GET",
      suppressTelemetry: options.suppressTelemetry
    })
  }

  async function logout(): Promise<boolean> {
    const result = await request<AuthLogoutResult>("/auth/logout", {
      method: "POST"
    })

    return result.loggedOut === true
  }

  async function signup(body: CommunitySignupRequest): Promise<SignupResult> {
    return await request<SignupResult>("/auth/signup", {
      body: toSignupRequest(body),
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

function toSignupRequest(body: CommunitySignupRequest): BackendSignupRequest {
  const handle = communityAccountHandle(body.username, body.email)
  const name = body.displayName?.trim() || body.username.trim() || COMMUNITY_SIGNUP_FALLBACK_NAME

  return {
    displayName: body.displayName,
    email: body.email,
    orgCode: `${COMMUNITY_SIGNUP_ACCOUNT_PREFIX}-${handle}`,
    orgName: name,
    password: body.password,
    username: body.username
  }
}

function communityAccountHandle(username: string, email: string) {
  const source = username.trim() || email.trim().split("@")[0] || COMMUNITY_SIGNUP_FALLBACK_HANDLE

  return source
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48) || COMMUNITY_SIGNUP_FALLBACK_HANDLE
}

function unwrapAuthResponse<T>(response: unknown, endpoint: string): T {
  if (!isApiResultEnvelope<T>(response)) {
    return response as T
  }

  if (response.code !== 0) {
    throw {
      code: String(response.code),
      endpoint,
      message: response.message || response.messageKey || "请求暂时失败，请稍后重试。",
      requestId: response.traceId || `aoi-auth-${Date.now()}`,
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
  const statusCode = fetchError.statusCode || fetchError.status || 500
  const code = responseError?.code || (resultError ? String(resultError.code) : null) || fetchError.statusMessage || "AOI_AUTH_API_ERROR"

  return {
    code,
    endpoint,
    message: responseError?.message || resultError?.message || fetchError.message || "请求暂时失败，请稍后重试。",
    requestId: responseError?.requestId || resultError?.traceId || `aoi-auth-${Date.now()}`,
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

function isAoiApiErrorPayload(value: unknown): value is AoiApiErrorPayload {
  return Boolean(
    value &&
    typeof value === "object" &&
    "endpoint" in value &&
    "statusCode" in value &&
    "requestId" in value
  )
}
