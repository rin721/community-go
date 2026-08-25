// Module runtime access (R075-004): the workspace only needs the session CSRF
// snapshot to sign webuiSession mutations; everything else comes from the
// generated contract snapshot (openapi-spec.ts). The page issues no requests
// while browsing; execution is user-initiated.
import { requestJSON } from "@webui/sdk/http";

export type SessionSnapshot = { csrfToken: string };

export const loadSessionSnapshot = () => requestJSON<SessionSnapshot>("/api/v1/iam/session");