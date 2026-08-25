// Settings module browser-side mock data source: IAM session/self endpoints are
// already provided by the host mock router; MFA and API-Token endpoints are
// stubbed here module-owned, matching the real service shapes (078).
import type { WebUIMockRoute } from "@webui/sdk/mock";

export const webuiMockRoutes: ReadonlyArray<WebUIMockRoute> = [
  { method: "GET", pattern: "/api/v1/iam/self/mfa", handler: () => ({ registered: false }) },
  { method: "POST", pattern: "/api/v1/iam/self/mfa", handler: () => ({ secret: "MOCKMFA000000000000000000000000000", uri: "otpauth://totp/community-go:mock-admin?secret=MOCKMFA000000000000000000000000000&issuer=community-go&algorithm=SHA1&digits=6&period=30" }) },
  { method: "POST", pattern: "/api/v1/iam/self/mfa/confirm", handler: () => ({ recoveryCodes: ["ABCDEF-GHIJKL", "MNOPQR-STUVWX"] }) },
  { method: "POST", pattern: "/api/v1/iam/self/mfa/disable", handler: () => undefined },
  { method: "GET", pattern: "/api/v1/iam/api-tokens", handler: () => ({ items: [], offset: 0, limit: 50, total: 0 }) },
  { method: "POST", pattern: "/api/v1/iam/api-tokens", handler: () => ({ id: "mock-token-1", name: "mock", scopes: ["management:read"], createdAt: "2026-01-01T00:00:00.000Z", secret: "iam_mock-token-secret" }) },
  { method: "POST", pattern: "/api/v1/iam/api-tokens/:id/rotate", handler: () => ({ id: "mock-token-1", name: "mock", scopes: ["management:read"], createdAt: "2026-01-01T00:00:00.000Z", secret: "iam_mock-rotated-secret" }) },
  { method: "POST", pattern: "/api/v1/iam/api-tokens/:id/revoke", handler: () => undefined },
];

export default webuiMockRoutes;