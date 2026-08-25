// Settings module browser-side mock data source: IAM session/self endpoints are
// already provided by the host mock router and the IAM module mock (including
// API tokens, 080); this module keeps only its own page-specific stubs.
import type { WebUIMockRoute } from "@webui/sdk/mock";

export const webuiMockRoutes: ReadonlyArray<WebUIMockRoute> = [
  { method: "GET", pattern: "/api/v1/iam/self/mfa", handler: () => ({ registered: false }) },
  { method: "POST", pattern: "/api/v1/iam/self/mfa", handler: () => ({ secret: "MOCKMFA000000000000000000000000000", uri: "otpauth://totp/community-go:mock-admin?secret=MOCKMFA000000000000000000000000000&issuer=community-go&algorithm=SHA1&digits=6&period=30" }) },
  { method: "POST", pattern: "/api/v1/iam/self/mfa/confirm", handler: () => ({ recoveryCodes: ["ABCDEF-GHIJKL", "MNOPQR-STUVWX"] }) },
  { method: "POST", pattern: "/api/v1/iam/self/mfa/disable", handler: () => undefined },
];

export default webuiMockRoutes;