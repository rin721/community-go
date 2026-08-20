export type Access = "allowed" | "authentication-required" | "denied";
export type ManifestRoute = { moduleId: string; id: string; path: string; entryId: string; titleMessageId: string; viewOperationId?: string; state: "available" | "preview"; default: boolean; access: Access };
export type Manifest = { revision: string; routes: ManifestRoute[]; menu: Array<{ moduleId: string; id: string; routeId: string; titleMessageId: string; iconId: string; order: number }> };
export type AdminUser = { id: string; username: string; scopes: string[] };
export type AdminSession = { user: AdminUser; csrfToken: string; createdAt: string; idleExpiresAt: string; absoluteExpiresAt: string };

export async function requestJSON<T>(input: RequestInfo, init?: RequestInit): Promise<T> {
  const response = await fetch(input, { credentials: "include", ...init, headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) } });
  if (!response.ok) { const body = await response.json().catch(() => ({ code: "request_failed" })); throw new Error(body.code ?? "request_failed"); }
  return response.status === 204 ? (undefined as T) : response.json();
}
export async function requestText(input: RequestInfo, init?: RequestInit): Promise<string> {
  const response = await fetch(input, { credentials: "include", ...init });
  if (!response.ok) { throw new Error(`request_failed_${response.status}`); }
  return response.text();
}
export const loadManifest = () => requestJSON<Manifest>("/api/v1/admin/manifest");
export const login = (username: string, password: string) => requestJSON<AdminSession>("/api/v1/admin/auth/login", { method: "POST", body: JSON.stringify({ username, password }), headers: { Origin: window.location.origin } });
export const setup = (setupToken: string, username: string, password: string) => requestJSON<AdminSession>("/api/v1/admin/auth/setup", { method: "POST", body: JSON.stringify({ setupToken, username, password }), headers: { Origin: window.location.origin } });
export const session = () => requestJSON<AdminSession>("/api/v1/admin/auth/session");
export const logout = (csrfToken: string) => requestJSON<void>("/api/v1/admin/auth/logout", { method: "POST", headers: { Origin: window.location.origin, "X-CSRF-Token": csrfToken }, body: "{}" });
