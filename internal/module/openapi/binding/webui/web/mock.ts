// OpenAPI module browser-side mock data source: the docs page renders the
// generated contract snapshot imported at build time (openapi-spec.ts) and
// issues no requests, so the mock route table is intentionally empty
// (settings module precedent). All three data-source environments render
// the same snapshot with zero backend calls.
import type { WebUIMockRoute } from "@webui/sdk/mock";

export const webuiMockRoutes: ReadonlyArray<WebUIMockRoute> = [];

export default webuiMockRoutes;