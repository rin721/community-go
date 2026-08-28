import { requestJSON } from "@webui/sdk/http";

// IAM capabilities reused by the settings module through cross-module HTTP calls
// (precedent: organization calls the IAM accounts endpoint). Mutations require
// the session-bound CSRF token (078), remembered like the iam module pages.
export type IAMSession = {
  identity: { accountId: string; username: string; displayName: string; nickname: string; bio: string; birthDate: string; permissions: string[]; mustChangePassword: boolean; securityRevision: number };
  csrfToken: string;
  createdAt: string;
  idleExpiresAt: string;
  absoluteExpiresAt: string;
  revokedAt?: string;
};
export type SelfProfile = { username: string; nickname: string; bio: string; birthDate: string; version: number };
export type ApiTokenView = { id: string; name: string; scopes: string[]; expiresAt?: string; revokedAt?: string; createdAt: string; lastUsedAt?: string };
export type ApiTokenIssued = ApiTokenView & { secret: string };

let csrfToken = "";
const mutationHeaders = () => ({ Origin: window.location.origin, "X-CSRF-Token": csrfToken });
const remember = (session: IAMSession) => { csrfToken = session.csrfToken; return session; };

export const loadSession = () => requestJSON<IAMSession>("/api/v1/iam/session").then(remember);
export const changePassword = (currentPassword: string, newPassword: string) => requestJSON<void>("/api/v1/iam/self/password", {
  method: "POST",
  headers: mutationHeaders(),
  body: JSON.stringify({ currentPassword, newPassword }),
});
export const updateSelfProfile = (profile: { nickname: string; bio: string; birthDate: string }, expectedVersion: number) => requestJSON<SelfProfile>("/api/v1/iam/self/profile", {
  method: "PATCH",
  headers: mutationHeaders(),
  body: JSON.stringify({ ...profile, expectedVersion }),
});
export const beginSelfArchive = () => requestJSON<{ confirmationId: string }>("/api/v1/iam/self/archive", { method: "POST", headers: mutationHeaders(), body: JSON.stringify({}) });
export const confirmSelfArchive = (confirmationId: string) => requestJSON<void>("/api/v1/iam/self/archive/confirm", { method: "POST", headers: mutationHeaders(), body: JSON.stringify({ confirmationId }) });


export const mfaStatus = () => requestJSON<{ registered: boolean }>("/api/v1/iam/self/mfa");
export const beginMFAEnroll = () => requestJSON<{ secret: string; uri: string }>("/api/v1/iam/self/mfa", { method: "POST", headers: mutationHeaders(), body: JSON.stringify({}) });
export const confirmMFAEnroll = (code: string) => requestJSON<{ recoveryCodes: string[] }>("/api/v1/iam/self/mfa/confirm", { method: "POST", headers: mutationHeaders(), body: JSON.stringify({ code }) });
export const disableMFA = (code: string) => requestJSON<void>("/api/v1/iam/self/mfa/disable", { method: "POST", headers: mutationHeaders(), body: JSON.stringify({ code }) });

// 090 BE-090-005: cross-device user preferences (self-service) persisted server-side.
export type UserPreferences = { language: string; timeZone?: string; themeMode: "system" | "light" | "dark"; themePreset: "blue" | "cyan" | "green" | "violet" | "orange"; density: "comfortable" | "compact"; reduceMotion: boolean; notifications: { emailDigest: boolean; inApp: boolean; showSummaries: boolean; dailySummary: boolean } };
export const selfPreferences = () => requestJSON<UserPreferences>("/api/v1/iam/self/preferences");
export const updateSelfPreferences = (patch: Partial<Pick<UserPreferences, "language" | "timeZone" | "themeMode" | "themePreset" | "density">> & { reduceMotion?: boolean; notifications?: Partial<UserPreferences["notifications"]> }) => requestJSON<UserPreferences>("/api/v1/iam/self/preferences", { method: "PATCH", headers: mutationHeaders(), body: JSON.stringify(patch) });



export const listApiTokens = (offset = 0, limit = 50) => requestJSON<{ items: ApiTokenView[]; offset: number; limit: number; total: number }>(`/api/v1/iam/api-tokens?offset=${offset}&limit=${limit}`);