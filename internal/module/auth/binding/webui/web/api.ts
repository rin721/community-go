import { requestJSON, type WebUISession } from "@webui/contracts";

export const login = (username: string, password: string) => requestJSON<WebUISession>("/api/v1/webui/auth/login", {
  method: "POST", body: JSON.stringify({ username, password }), headers: { Origin: window.location.origin },
});

export const setup = (setupToken: string, username: string, password: string) => requestJSON<WebUISession>("/api/v1/webui/auth/setup", {
  method: "POST", body: JSON.stringify({ setupToken, username, password }), headers: { Origin: window.location.origin },
});
