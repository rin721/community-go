// Settings module browser-side mock data source: IAM session/self endpoints are
// already provided by the host mock router; settings pages consume them directly.
import type { WebUIMockRoute } from "@webui/sdk/mock";

export const webuiMockRoutes: ReadonlyArray<WebUIMockRoute> = [];

export default webuiMockRoutes;