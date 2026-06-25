import { ApiError } from "~/lib/api/client";

type ErrorStateTranslate = (key: string, options?: Record<string, unknown>) => string;

export type AdminErrorStateCopy = {
  defaultTitle: string;
  permissionDescription?: string;
  permissionTitle?: string;
  storageUnavailableDescription?: string;
  storageUnavailableTitle?: string;
};

export function adminErrorTitle(
  error: unknown,
  t: ErrorStateTranslate,
  copy: AdminErrorStateCopy,
): string {
  const normalized = normalizeAdminError(error);
  if (hasApiStatus(normalized, 403) && copy.permissionTitle) {
    return t(copy.permissionTitle);
  }
  if (hasApiStatus(normalized, 401)) {
    return t("errors.api.unauthorized");
  }
  if (hasApiStatus(normalized, 503) && copy.storageUnavailableTitle) {
    return t(copy.storageUnavailableTitle);
  }
  return t(copy.defaultTitle);
}

export function adminErrorDescription(
  error: unknown,
  t: ErrorStateTranslate,
  copy: AdminErrorStateCopy,
): string {
  const normalized = normalizeAdminError(error);
  if (hasApiStatus(normalized, 403) && copy.permissionDescription) {
    return t(copy.permissionDescription);
  }
  if (hasApiStatus(normalized, 503) && copy.storageUnavailableDescription) {
    return t(copy.storageUnavailableDescription);
  }
  return normalized?.message || t("errors.api.requestFailed");
}

export function normalizeAdminError(error: unknown): Error | null {
  if (error instanceof Error) {
    return error;
  }
  if (error === null || typeof error === "undefined") {
    return null;
  }
  if (
    typeof error === "string" ||
    typeof error === "number" ||
    typeof error === "boolean" ||
    typeof error === "bigint"
  ) {
    return new Error(String(error));
  }
  return null;
}

function hasApiStatus(error: Error | null, status: number): error is ApiError {
  return error instanceof ApiError && error.status === status;
}
