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

// 085 Rev.2：标签资格不再由 route 显式声明（WorkspaceTabPolicy 已从契约移除）。
// 宿主对【所有正式路由】自动判定：layout=app + implemented + loadable + access
// allowed 的页面均生成并保留标签；Drawer/Modal/Popover 等临时交互不生成标签，
// 因为它们不是路由。Dashboard（default route）作为固定首页标签。

// ZoneID 是宿主骨架分区的稳定枚举（与 Go 侧 internal/webui.ZoneID 一致）。
// 085 起移除 workspace-tabs 分区：当前无真实贡献方，host Workspace Tabs 由宿主
// registry/outlet 单轨承载，不再提供万能 zone 注入面（REQ-085-012）。
export type ZoneID = "header-actions" | "sidebar-panels" | "page-header" | "footer-status";

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

// WorkspaceSession 是宿主暴露给 workspace 页面模块的窄生命周期契约（085 REQ-085-006）：
// 页面只能报告 dirty/active 状态并请求关闭，宿主统一处理关闭、批量关闭、logout 与
// browser unload；模块不得读取全 registry，也不得访问其他 workspace 的会话。
export type WorkspaceSession = {
  workspaceID: string;
  /** active=false 是资源边界：非活动面板不可聚焦/交互，模块应暂停轮询、订阅与高成本绘制。 */
  active: boolean;
  /** setDirty 报告该工作区是否仍保留未保存的真实工作状态（不是只画视觉标记）。 */
  setDirty: (dirty: boolean) => void;
  /** requestClose 向宿主请求关闭本工作区；宿主执行 dirty/beforeClose 决策后决定是否卸载。 */
  requestClose: () => void;
  /**
   * registerBeforeClose 注册关闭前决策：返回 true 表示允许关闭，false/抛错表示拒绝
   * （原因由宿主低敏展示）。返回解绑函数。页面不得先自行卸载再通知宿主。
   */
  registerBeforeClose: (handler: () => boolean | Promise<boolean>) => () => void;
};

// WorkspaceSessionLookup 由宿主 WorkspaceOutlet 注入：按 workspaceID 返回窄会话。
// 页面组件通过 useWorkspaceSession() 消费，不接触宿主 registry 内部。
export type WorkspaceSessionLookup = (workspaceID: string) => WorkspaceSession | undefined;

const WorkspaceSessionLookupContext = createContext<WorkspaceSessionLookup | undefined>(undefined);

export function WorkspaceSessionLookupProvider({ value, children }: { value: WorkspaceSessionLookup; children: ReactNode }) {
  return <WorkspaceSessionLookupContext.Provider value={value}>{children}</WorkspaceSessionLookupContext.Provider>;
}

// useWorkspaceSession 返回当前 mounted workspace 的窄会话；非 workspace 页面返回
// undefined，页面据此优雅降级（例如普通 route 不注册 dirty）。
export function useWorkspaceSession(): WorkspaceSession | undefined {
  const lookup = useContext(WorkspaceSessionLookupContext);
  if (!lookup) return undefined;
  const workspaceID = useContext(WorkspaceScopeContext);
  if (!workspaceID) return undefined;
  return lookup(workspaceID);
}

// WorkspaceScopeContext 标记当前组件树属于哪个 workspace（WorkspaceOutlet 注入）。
export const WorkspaceScopeContext = createContext<string | undefined>(undefined);

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
