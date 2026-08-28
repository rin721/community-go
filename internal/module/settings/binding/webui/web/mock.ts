// Settings module browser-side mock data source: IAM session/self endpoints are
// already provided by the host mock router and the IAM module mock (including
// API tokens, 080); this module keeps only its own page-specific stubs.
import type { WebUIMockRoute } from "@webui/sdk/mock";

// 090 BE-090-005: in-memory mock of the cross-device preference endpoint
// (resets to defaults on page refresh).
const defaultPreferences = { language: "en-US", themeMode: "system", themePreset: "blue", density: "comfortable", reduceMotion: false, notifications: { emailDigest: true, inApp: true, showSummaries: true, dailySummary: false } };
let preferences = { ...defaultPreferences, notifications: { ...defaultPreferences.notifications } };

export const webuiMockRoutes: ReadonlyArray<WebUIMockRoute> = [
  { method: "GET", pattern: "/api/v1/iam/self/preferences", handler: () => preferences },
  { method: "PATCH", pattern: "/api/v1/iam/self/preferences", handler: (request) => {
    const body = (request.body ?? {}) as Record<string, unknown>;
    preferences = { ...preferences, ...body, notifications: { ...preferences.notifications, ...((body.notifications ?? {}) as Record<string, unknown>) } };
    return preferences;
  } },
  { method: "GET", pattern: "/api/v1/iam/self/mfa", handler: () => ({ registered: false }) },
  { method: "POST", pattern: "/api/v1/iam/self/mfa", handler: () => ({ secret: "MOCKMFA000000000000000000000000000", uri: "otpauth://totp/community-go:mock-admin?secret=MOCKMFA000000000000000000000000000&issuer=community-go&algorithm=SHA1&digits=6&period=30" }) },
  { method: "POST", pattern: "/api/v1/iam/self/mfa/confirm", handler: () => ({ recoveryCodes: ["ABCDEF-GHIJKL", "MNOPQR-STUVWX"] }) },
  { method: "POST", pattern: "/api/v1/iam/self/mfa/disable", handler: () => undefined },
];

export default webuiMockRoutes;