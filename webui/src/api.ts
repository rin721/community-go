import { requestJSON } from "@webui/sdk/http";
import type { Manifest } from "@webui/sdk/runtime";

export type WebUIUser = { id: string; username: string; scopes: string[] };
export type WebUISession = { user: WebUIUser; csrfToken: string; createdAt: string; idleExpiresAt: string; absoluteExpiresAt: string };

export const loadManifest = () => requestJSON<Manifest>("/api/v1/webui/manifest");
export const loadSession = () => requestJSON<WebUISession>("/api/v1/webui/auth/session");
export const logout = (csrfToken: string) => requestJSON<void>("/api/v1/webui/auth/logout", { method: "POST", headers: { Origin: window.location.origin, "X-CSRF-Token": csrfToken }, body: "{}" });
