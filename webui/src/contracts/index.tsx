import { createContext, useContext, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { mockRequestJSON, mockRequestText } from "../mock/router";

// WebUIDataSource 声明当前 WebUI 运行的数据源环境；默认为服务托管构建产物
// （server-hosted，对应 config.yaml 的 webui.hosting.enabled: true）。
export type WebUIDataSource = "server-hosted" | "separated" | "mock";

// readWebUIDataSource 读取显式环境声明（VITE_WEBUI_DATA_SOURCE）；缺失或非法值
// 保守回退默认 server-hosted（tooling 侧的枚举校验在 052 typed 配置解析器中负责）。
export function readWebUIDataSource(env: { VITE_WEBUI_DATA_SOURCE?: string } = import.meta.env): WebUIDataSource {
  const declared = env.VITE_WEBUI_DATA_SOURCE;
  return declared === "server-hosted" || declared === "separated" || declared === "mock" ? declared : "server-hosted";
}

export type Access = "allowed" | "authentication-required" | "denied";
export type DeliveryState = "implemented" | "not-implemented";
export type RouteLayout = "app" | "blank";
export type CapabilityState = "available" | "degraded" | "unavailable" | "not-implemented";

// ZoneID 是宿主骨架分区的稳定枚举（与 Go 侧 internal/webui.ZoneID 一致）。
export type ZoneID = "header-actions" | "sidebar-panels" | "page-header" | "workspace-tabs" | "footer-status";

export type ManifestZone = {
  moduleId: string;
  zone: ZoneID;
  id: string;
  entryId: string;
  titleMessageId: string;
  iconId?: string;
  kind?: "action" | "status" | "meta";
  order: number;
  access: Access;
};

// ManifestActionPermission 是动作级权限钩子的运行时视图（服务端投影，前端只控呈现）。
export type ManifestActionPermission = { operationId: string; access: Access };

export type ManifestRoute = {
  moduleId: string;
  id: string;
  path: string;
  entryId: string;
  titleMessageId: string;
  viewOperationId?: string;
  layout: RouteLayout;
  // groupLayoutId 是共享分组布局入口（073）：同组路由由模块布局承载（固定导航 + 内容区）。
  groupLayoutId?: string;
  deliveryState: DeliveryState;
  default: boolean;
  unauthenticatedDefault: boolean;
  access: Access;
  availability?: CapabilityState;
  availableCapabilities?: string[];
};

export type ManifestMenu = {
  moduleId: string;
  id: string;
  parentId?: string;
  routeId: string;
  titleMessageId: string;
  iconId: string;
  order: number;
};

export type Manifest = { catalogRevision: string; navigationRevision: string; routes: ManifestRoute[]; menu: ManifestMenu[]; zones?: ManifestZone[]; actionPermissions?: ManifestActionPermission[] };
export type PrincipalView = { id: string; username: string; scopes: string[] };

export type HostRuntime = {
  manifest: Manifest;
  principal?: PrincipalView;
  completeAuthentication: (principal: PrincipalView) => Promise<void>;
  refreshManifest: () => Promise<void>;
  navigateToDefault: () => void;
  // navigate 是宿主提供的 SPA 内路由跳转（072）：模块页面用它做页内分区/页面切换，
  // 避免整页刷新；宿主未注入时可选（向后兼容）。
  navigate?: (path: string) => void;
};

const HostRuntimeContext = createContext<HostRuntime | undefined>(undefined);

export function HostRuntimeProvider({ value, children }: { value: HostRuntime; children: ReactNode }) {
  return <HostRuntimeContext.Provider value={value}>{children}</HostRuntimeContext.Provider>;
}

export function useHostRuntime(): HostRuntime {
  const runtime = useContext(HostRuntimeContext);
  if (!runtime) throw new Error("webui_host_runtime_missing");
  return runtime;
}

// useOptionalHostRuntime 返回 undefined 而非抛错：骨架分区/作用域组件在宿主运行时
// 缺失时（如独立组件测试、无 Provider 的静态渲染）应优雅降级为空，而不是拖垮渲染。
export function useOptionalHostRuntime(): HostRuntime | undefined {
  return useContext(HostRuntimeContext);
}

/** useWebUITranslation 约束业务模块只能通过宿主公开的 namespace 翻译契约取文案。 */
export function useWebUITranslation(namespace: `webui.${string}`) {
  if (!namespace.startsWith("webui.")) throw new Error("webui_i18n_namespace_invalid");
  return useTranslation(namespace);
}

export async function requestJSON<T>(input: RequestInfo | URL, init?: RequestInit): Promise<T> {
  if (readWebUIDataSource() === "mock") {
    return mockRequestJSON<T>(input, init);
  }
  const response = await fetch(input, {
    credentials: "include",
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({ code: "request_failed" }));
    throw new Error(typeof body.code === "string" ? body.code : "request_failed");
  }
  return response.status === 204 ? (undefined as T) : response.json();
}

export async function requestText(input: RequestInfo | URL, init?: RequestInit): Promise<string> {
  if (readWebUIDataSource() === "mock") {
    return mockRequestText(input, init);
  }
  const response = await fetch(input, { credentials: "include", ...init });
  if (!response.ok) throw new Error(`request_failed_${response.status}`);
  return response.text();
}
