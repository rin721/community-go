type RequestMethod = "DELETE" | "GET" | "PATCH" | "POST"
type RuntimeConfig = ReturnType<typeof useRuntimeConfig>

const csrfProtectedMethods = new Set<RequestMethod>(["DELETE", "PATCH", "POST"])

export function createAoiCredentialHeaders(
  method: RequestMethod | undefined,
  config: RuntimeConfig
): Record<string, string> | undefined {
  if (!import.meta.client || !isCSRFProtectedMethod(method)) {
    return undefined
  }

  const cookieName = String(config.public.csrfCookieName || "console_csrf").trim()
  const headerName = String(config.public.csrfHeaderName || "X-CSRF-Token").trim()
  if (!cookieName || !headerName) {
    return undefined
  }

  const csrfToken = readCookieValue(cookieName)
  return csrfToken ? { [headerName]: csrfToken } : undefined
}

function isCSRFProtectedMethod(method: RequestMethod | undefined): boolean {
  return csrfProtectedMethods.has(String(method || "GET").toUpperCase() as RequestMethod)
}

function readCookieValue(name: string): string {
  const cookies = document.cookie ? document.cookie.split(";") : []
  for (const cookie of cookies) {
    const parts = cookie.trim().split("=")
    const rawName = parts.shift()
    if (!rawName) {
      continue
    }
    if (safeDecode(rawName) === name) {
      return safeDecode(parts.join("="))
    }
  }
  return ""
}

function safeDecode(value: string): string {
  try {
    return decodeURIComponent(value)
  } catch {
    return value
  }
}
