import { requestJSON } from "@webui/sdk/http";

// IAM capabilities reused by the settings module through cross-module HTTP calls
// (precedent: organization calls the IAM accounts endpoint).
export type IAMSession = {
  identity: { accountId: string; username: string; displayName: string; nickname: string; bio: string; birthDate: string; permissions: string[]; mustChangePassword: boolean; securityRevision: number };
  csrfToken: string;
  createdAt: string;
  idleExpiresAt: string;
  absoluteExpiresAt: string;
  revokedAt?: string;
};
export type SelfProfile = { username: string; nickname: string; bio: string; birthDate: string; version: number };

export const loadSession = () => requestJSON<IAMSession>("/api/v1/iam/session");
export const changePassword = (currentPassword: string, newPassword: string) => requestJSON<void>("/api/v1/iam/self/password", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ currentPassword, newPassword }),
});
export const updateSelfProfile = (profile: { nickname: string; bio: string; birthDate: string }, expectedVersion: number) => requestJSON<SelfProfile>("/api/v1/iam/self/profile", {
  method: "PATCH",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ ...profile, expectedVersion }),
});
export const beginSelfArchive = () => requestJSON<{ confirmationId: string }>("/api/v1/iam/self/archive", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({}) });
export const confirmSelfArchive = (confirmationId: string) => requestJSON<void>("/api/v1/iam/self/archive/confirm", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ confirmationId }) });