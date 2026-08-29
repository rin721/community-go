import type { AoiApiErrorPayload } from "~/types/api"

export interface AoiApiTelemetryEvent extends AoiApiErrorPayload {
  occurredAt: string
}

export function useAoiApiTelemetry() {
  const recentErrors = useState<AoiApiTelemetryEvent[]>("aoi-api-errors", () => [])

  function recordError(error: AoiApiErrorPayload) {
    recentErrors.value = [
      {
        ...error,
        occurredAt: new Date().toISOString()
      },
      ...recentErrors.value
    ].slice(0, 8)
  }

  function clearErrors() {
    recentErrors.value = []
  }

  return {
    clearErrors,
    recentErrors,
    recordError
  }
}
