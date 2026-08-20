import type { TFunction } from "i18next";
import { describe, expect, it } from "vitest";

import { ApiError } from "~/lib/api/client";

import {
  adminErrorDescription,
  adminErrorTitle,
  normalizeAdminError,
  type AdminErrorStateCopy,
} from "./error-state";

const copy: AdminErrorStateCopy = {
  defaultTitle: "admin.example.states.errorTitle",
  permissionDescription: "admin.example.states.permissionDescription",
  permissionTitle: "admin.example.states.permissionTitle",
  storageUnavailableDescription: "admin.example.states.storageUnavailableDescription",
  storageUnavailableTitle: "admin.example.states.storageUnavailableTitle",
};

const t = ((key: string) => `i18n:${key}`) as TFunction;

describe("admin error state helpers", () => {
  it("maps forbidden API errors to page permission copy", () => {
    const error = new ApiError("Forbidden", 403, "/api/v1/example", "FORBIDDEN");

    expect(adminErrorTitle(error, t, copy)).toBe("i18n:admin.example.states.permissionTitle");
    expect(adminErrorDescription(error, t, copy)).toBe(
      "i18n:admin.example.states.permissionDescription",
    );
  });

  it("maps unauthorized API errors to shared session copy", () => {
    const error = new ApiError("Unauthorized", 401, "/api/v1/example", "UNAUTHORIZED");

    expect(adminErrorTitle(error, t, copy)).toBe("i18n:errors.api.unauthorized");
    expect(adminErrorDescription(error, t, copy)).toBe("Unauthorized");
  });

  it("maps unavailable storage errors to page storage copy", () => {
    const error = new ApiError("Storage unavailable", 503, "/api/v1/example", 5000);

    expect(adminErrorTitle(error, t, copy)).toBe(
      "i18n:admin.example.states.storageUnavailableTitle",
    );
    expect(adminErrorDescription(error, t, copy)).toBe(
      "i18n:admin.example.states.storageUnavailableDescription",
    );
  });

  it("keeps normalized error messages for network and unknown failures", () => {
    expect(adminErrorTitle(new TypeError("Failed to fetch"), t, copy)).toBe(
      "i18n:admin.example.states.errorTitle",
    );
    expect(adminErrorDescription(new TypeError("Failed to fetch"), t, copy)).toBe(
      "Failed to fetch",
    );
    expect(adminErrorDescription(undefined, t, copy)).toBe("i18n:errors.api.requestFailed");
    expect(normalizeAdminError("plain failure")?.message).toBe("plain failure");
  });
});
