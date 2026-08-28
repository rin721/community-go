import { Component, lazy, Suspense, useEffect, useState, type ComponentType, type ReactNode } from "react";
import { Navigate, Outlet, Route, Routes, type Location } from "react-router-dom";
import type { Manifest, ManifestRoute } from "@webui/sdk/runtime";
import { ensureRouteLocale, translateMessage } from "./i18n";
import { InlineAlert } from "./ui";
import { PageSkeleton } from "./components/shell/ShellSkeleton";
import { SystemStatePage } from "./pages/SystemStatePage";
import { webuiEntryRegistry } from "./generated/webui-registry";
import type { WorkspaceLocation } from "./workspace/registry";
import { routeIsFormal, useWorkspaceHost } from "./workspace/WorkspaceProvider";

type EntryModule = { default: ComponentType };
const entryLoaders = webuiEntryRegistry as unknown as Record<string, () => Promise<EntryModule>>;
export const entryComponents = Object.fromEntries(Object.entries(entryLoaders).map(([entryID, load]) => [entryID, lazy(load)]));

// ManifestRouteView 按明确 ManifestRoute + manifest 渲染页面内容：
// 普通 fallback Outlet 与 mounted panel 共用同一视图函数，避免第二套业务 route 声明。
export function ManifestRouteView({ route, manifest }: { route: ManifestRoute; manifest: Manifest }) {
  if (route.access === "authentication-required") {
    const loginRoute = manifest.routes.find((candidate) => candidate.unauthenticatedDefault);
    return loginRoute ? <Navigate to={loginRoute.path} replace /> : <SystemStatePage kind="unauthorized" />;
  }
  if (route.access === "denied") return <Navigate to="/403" replace />;
  if (route.deliveryState === "not-implemented") return <SystemStatePage kind="notImplemented" />;
  if (!routeIsLoadable(route)) return <SystemStatePage kind="unavailable" />;
  const Page = entryComponents[route.entryId];
  if (!Page) return <SystemStatePage kind="missingEntry" />;
  return <RouteResourceBoundary route={route}><RouteErrorBoundary key={route.id}><Suspense fallback={<PageSkeleton />}><Page /></Suspense></RouteErrorBoundary></RouteResourceBoundary>;
}

export function routeIsLoadable(route: ManifestRoute): boolean {
  return route.availability === "available"
    || (route.availability === "degraded" && (route.availableCapabilities?.length ?? 0) > 0);
}

// RouteSlot 是正式路由在普通路由树中的槽位（Rev.2：所有 app 正式路由统一走槽位）：
// 宿主通过 AppShell 的导航效果打开/激活标签（不在这里自动打开，避免关闭后被同一
// 渲染循环重新创建）；页面内容在 WorkspaceOutlet 的 mounted panel 中呈现。access
// 门禁与 ManifestRouteView 完全一致（未登录仍跳转登录页）。Drawer/Modal/Popover 等
// 临时交互不是路由，不经过此槽位，因此不生成标签。
// 086：槽位只渲染内容本身，滚动/宽度容器由外层 ContentViewport 唯一提供。
export function RouteSlot({ route, manifest }: { route: ManifestRoute; manifest: Manifest }) {
  const host = useWorkspaceHost();
  if (route.access === "authentication-required") {
    const loginRoute = manifest.routes.find((candidate) => candidate.unauthenticatedDefault);
    return loginRoute ? <Navigate to={loginRoute.path} replace /> : <SystemStatePage kind="unauthorized" />;
  }
  if (route.access === "denied") return <Navigate to="/403" replace />;
  if (route.deliveryState === "not-implemented") return <SystemStatePage kind="notImplemented" />;
  if (!routeIsLoadable(route)) return <SystemStatePage kind="unavailable" />;
  // 已打开（含恢复/导航打开成功）时由 AppShell 决定渲染 panels；槽位只作为
  // 打开动作前的骨架/上限引导兜底，不让槽位重新创建标签。
  if (host.tabs.some((tab) => tab.routeID === route.id)) {
    return <PageSkeleton />;
  }
  if (host.tabs.length >= 12) {
    return <WorkspaceCapAlert />;
  }
  return <PageSkeleton />;
}

function WorkspaceCapAlert() {
  return <InlineAlert tone="warning" title={translateMessage("webui.host.workspace.cap.title")} detail={translateMessage("webui.host.workspace.cap.detail")} />;
}

// renderAppRoutes 渲染 app 布局路由（fallback 树：每个正式路由渲染 RouteSlot，
// 页面真实内容由 mounted panel 承载）；带 groupLayoutId 的一族路由由共享模块布局
// （ModuleGroupLayout：固定布局 + 内容 Outlet）承载，切换分区时布局不卸载重挂（073）。
// 所有 route 声明来自 manifest，不复制业务 route 树。
export function renderAppRoutes(manifest: Manifest) {
  const grouped = new Map<string, ManifestRoute[]>();
  const standalone: ManifestRoute[] = [];
  for (const route of manifest.routes.filter((candidate) => candidate.layout === "app")) {
    if (route.groupLayoutId) {
      const entries = grouped.get(route.groupLayoutId) ?? [];
      entries.push(route);
      grouped.set(route.groupLayoutId, entries);
    } else {
      standalone.push(route);
    }
  }
  return <>
    {standalone.map((route) => <Route key={route.id} path={route.path} element={<RouteSlot route={route} manifest={manifest} />} />)}
    {[...grouped.entries()].map(([layoutId, routes]) => {
      const first = routes[0];
      return <Route key={layoutId} element={<ModuleGroupLayout route={first} />}>
        {routes.map((route) => <Route key={route.id} path={route.path} element={<RouteSlot route={route} manifest={manifest} />} />)}
      </Route>;
    })}
  </>;
}

// renderPanelRoutes 是 WorkspaceOutlet 面板使用的 route 树：只包含 app 正式路由，
// 且一律渲染 ManifestRouteView（面板内不能再出现 RouteSlot 打开动作）。
// 分组布局逻辑与 renderAppRoutes 共用，避免第二套业务 route 声明。
export function renderPanelRoutes(manifest: Manifest) {
  const formalRoutes = manifest.routes.filter((route) => route.layout === "app" && routeIsFormal(route));
  const grouped = new Map<string, ManifestRoute[]>();
  const standalone: ManifestRoute[] = [];
  for (const route of formalRoutes) {
    if (route.groupLayoutId) {
      const entries = grouped.get(route.groupLayoutId) ?? [];
      entries.push(route);
      grouped.set(route.groupLayoutId, entries);
    } else {
      standalone.push(route);
    }
  }
  return <>
    {standalone.map((route) => <Route key={route.id} path={route.path} element={<ManifestRouteView route={route} manifest={manifest} />} />)}
    {[...grouped.entries()].map(([layoutId, routes]) => {
      const first = routes[0];
      return <Route key={layoutId} element={<ModuleGroupLayout route={first} />}>
        {routes.map((route) => <Route key={route.id} path={route.path} element={<ManifestRouteView route={route} manifest={manifest} />} />)}
      </Route>;
    })}
  </>;
}

// ModuleGroupLayout 懒加载模块布局入口并把内容区（<Outlet />）作为 children 注入；
// 布局组件只接收 children，不依赖 react-router（模块边界保持）。
export function ModuleGroupLayout({ route }: { route: ManifestRoute }) {
  const Layout = route.groupLayoutId ? (entryComponents[route.groupLayoutId] as unknown as ComponentType<{ children?: ReactNode }>) : undefined;
  if (!Layout) return <SystemStatePage kind="missingEntry" />;
  return <RouteResourceBoundary route={route}><Suspense fallback={<PageSkeleton />}><Layout><Outlet /></Layout></Suspense></RouteResourceBoundary>;
}

export function RouteResourceBoundary({ route, children }: { route: ManifestRoute; children: ReactNode }) {
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  useEffect(() => {
    let active = true;
    setState("loading");
    void ensureRouteLocale(route).then(() => { if (active) setState("ready"); }).catch(() => { if (active) setState("error"); });
    return () => { active = false; };
  }, [route]);
  if (state === "loading") return <PageSkeleton />;
  if (state === "error") return <SystemStatePage kind="routeError" />;
  return <>{children}</>;
}

type RouteErrorBoundaryState = { hasError: boolean };

export class RouteErrorBoundary extends Component<{ children: ReactNode }, RouteErrorBoundaryState> {
  state: RouteErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): RouteErrorBoundaryState {
    return { hasError: true };
  }

  render() {
    return this.state.hasError ? <SystemStatePage kind="routeError" /> : this.props.children;
  }
}

// toLocationObject 把 WorkspaceLocation 转成 React Router location 对象（panel 固定挂载）。
export function toLocationObject(location: WorkspaceLocation, key: string): Location {
  return { pathname: location.pathname, search: location.search, hash: "", state: null, key };
}

export { Routes };