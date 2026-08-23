import { requestJSON } from "@webui/sdk/http";

// IAM capabilities reused by the settings module through cross-module HTTP calls
// (precedent: organization calls the IAM accounts endpoint).
export type IAMSession = {
  identity: { accountId: string; username: string; displayName: string; permissions: string[]; mustChangePassword: boolean; securityRevision: number };
  csrfToken: string;
  createdAt: string;
  idleExpiresAt: string;
  absoluteExpiresAt: string;
  revokedAt?: string;
};

export const loadSession = () => requestJSON<IAMSession>("/api/v1/iam/session");
export const changePassword = (currentPassword: string, newPassword: string) => requestJSON<void>("/api/v1/iam/self/password", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ currentPassword, newPassword }),
});