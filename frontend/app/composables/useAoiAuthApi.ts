import type {
  AoiApiErrorPayload,
  ApiResultEnvelope,
  ErrorResponse,
  LoginRequest,
  SignupRequest,
  SignupResult,
  AuthTokenPair
} from "~/types/api"

type AuthRequestOptions = {
  body?: unknown
  method?: "GET" | "POST"
}

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

      telemetry.recordError(apiError)
      throw apiError
    }
  }

  async function login(body: LoginRequest): Promise<AuthTokenPair> {
    return await request<AuthTokenPair>("/auth/login", {
      body,
      method: "POST"
    })
  }

  async function signup(body: SignupRequest): Promise<SignupResult> {
    return await request<SignupResult>("/auth/signup", {
      body,
      method: "POST"
    })
  }

  return {
    login,
    signup
  }
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
