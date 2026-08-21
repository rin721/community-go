import { requestJSON, type Manifest, type WebUISession } from "@webui/contracts";

export const loadManifest = () => requestJSON<Manifest>("/api/v1/webui/manifest");
export const loadSession = () => requestJSON<WebUISession>("/api/v1/webui/auth/session");
export const logout = (csrfToken: string) => requestJSON<void>("/api/v1/webui/auth/logout", { method: "POST", headers: { Origin: window.location.origin, "X-CSRF-Token": csrfToken }, body: "{}" });
