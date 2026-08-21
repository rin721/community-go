import { requestJSON } from "@webui/sdk/http";
import type { PrincipalView } from "@webui/sdk/runtime";
export type WebUIUser = { id: string; username: string; scopes: string[] };
export type WebUISession = { user: WebUIUser; csrfToken: string; createdAt: string; idleExpiresAt: string; absoluteExpiresAt: string };

export const loadSession = () => requestJSON<WebUISession>("/api/v1/webui/auth/session");

export const login = (username: string, password: string) => requestJSON<WebUISession>("/api/v1/webui/auth/login", {
  method: "POST", body: JSON.stringify({ username, password }), headers: { Origin: window.location.origin },
});

export const setup = (setupToken: string, username: string, password: string) => requestJSON<WebUISession>("/api/v1/webui/auth/setup", {
  method: "POST", body: JSON.stringify({ setupToken, username, password }), headers: { Origin: window.location.origin },
});

export function principalFromSession(session: WebUISession): PrincipalView {
  return { id: session.user.id, username: session.user.username, scopes: [...session.user.scopes] };
}
