// 宿主管辖的 mock 数据源（骨架数据）：manifest 使用生成器从 Go catalog 投影的
// webuiMockManifest（catalogRevision 与 webuiRevision 天然一致），session/logout
// 提供固定管理员会话。仅供显式声明 mock 环境时使用，不冒充真实服务状态。
import { webuiMockManifest } from "../generated/webui-registry";
import type { WebUIMockRoute } from "@webui/sdk/mock";

const createdAt = "2026-01-01T00:00:00.000Z";
const expiresAt = "2026-01-31T00:00:00.000Z";

const mockSession = {
  identity: {
    accountId: "mock-admin",
    username: "admin",
    displayName: "Mock Administrator",
    permissions: ["*"],
    mustChangePassword: false,
    securityRevision: 1,
  },
  csrfToken: "mock-csrf-token",
  createdAt,
  idleExpiresAt: expiresAt,
  absoluteExpiresAt: expiresAt,
};

export const hostMockRoutes: ReadonlyArray<WebUIMockRoute> = [
  { method: "GET", pattern: "/api/v1/webui/manifest", handler: () => webuiMockManifest },
  { method: "GET", pattern: "/api/v1/iam/session", handler: () => mockSession },
  { method: "POST", pattern: "/api/v1/iam/logout", handler: () => undefined },
];