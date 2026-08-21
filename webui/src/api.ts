import { requestJSON } from "@webui/sdk/http";
import type { Manifest } from "@webui/sdk/runtime";

export type IAMIdentity = { accountId: string; username: string; displayName: string; permissions: string[]; mustChangePassword: boolean; securityRevision: number };
export type WebUISession = { identity: IAMIdentity; csrfToken: string; createdAt: string; idleExpiresAt: string; absoluteExpiresAt: string };

export const loadManifest = () => requestJSON<Manifest>("/api/v1/webui/manifest");
export const loadSession = () => requestJSON<WebUISession>("/api/v1/iam/session");
export const logout = (csrfToken: string) => requestJSON<void>("/api/v1/iam/logout", { method: "POST", headers: { Origin: window.location.origin, "X-CSRF-Token": csrfToken }, body: "{}" });
