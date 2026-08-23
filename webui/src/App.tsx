import { Component, lazy, Suspense, useCallback, useEffect, useState, type ComponentType, type ReactNode } from "react";
import { Navigate, Outlet, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { HostRuntimeProvider, type HostRuntime, type Manifest, type ManifestRoute, type PrincipalView } from "@webui/sdk/runtime";
import { ToastProvider } from "@webui/sdk/ui";
import { ensureRouteLocale, translateMessage } from "./i18n";
import { AppShell, BlankLayout } from "./components/AppShell";
import { PageSkeleton } from "./components/shell/ShellSkeleton";
import { ZoneRendererProvider } from "./zone/ZoneRenderer";
import { webuiEntryRegistry, webuiRevision } from "./generated/webui-registry";
import { loadManifest, loadSession, logout, type WebUISession } from "./api";
import { SystemStatePage } from "./pages/SystemStatePage";

type EntryModule = { default: ComponentType };
const entryLoaders = webuiEntryRegistry as unknown as Record<string, () => Promise<EntryModule>>;
const entryComponents = Object.fromEntries(Object.entries(entryLoaders).map(([entryID, load]) => [entryID, lazy(load)]));

export function App() {
  const navigate = useNavigate();
  const [manifest, setManifest] = useState<Manifest>();
  const [webuiSession, setWebUISession] = useState<WebUISession>();
  const [principal, setPrincipal] = useState<PrincipalView>();
  const [error, setError] = useState<string>();
  const refreshManifest = useCallback(async () => {
    const value = await loadManifest();
    setManifest(value);
    return value;
  }, []);
  useEffect(() => {
    void Promise.all([refreshManifest(), loadSession().then((value) => { setWebUISession(value); setPrincipal(toPrincipal(value)); }).catch(() => undefined)]).catch((reason: Error) => setError(reason.message));
  }, [refreshManifest]);
  const navigateToDefault = useCallback((catalog = manifest) => {
    const route = catalog?.routes.find((candidate) => candidate.default && candidate.access === "allowed" && candidate.deliveryState === "implemented" && routeIsLoadable(candidate))
      ?? catalog?.routes.find((candidate) => candidate.unauthenticatedDefault && candidate.deliveryState === "implemented" && routeIsLoadable(candidate));
    navigate(route?.path ?? "/404", { replace: true });
  }, [manifest, navigate]);
  const completeAuthentication = useCallback(async (value: PrincipalView) => {
    setPrincipal(value);
    const session = await loadSession();
    setWebUISession(session);
    const nextManifest = await refreshManifest();
    navigateToDefault(nextManifest);
  }, [navigateToDefault, refreshManifest]);
  const handleLogout = useCallback(async () => {
    if (webuiSession) await logout(webuiSession.csrfToken);
    setWebUISession(undefined);
    const nextManifest = await refreshManifest();
    navigate(nextManifest.routes.find((candidate) => candidate.unauthenticatedDefault)?.path ?? "/", { replace: true });
  }, [navigate, refreshManifest, webuiSession]);
  if (error) return <StartupState title={translateMessage("webui.host.assembly.title")} detail={translateMessage("webui.host.assembly.detail")} />;
  if (!manifest) return <StartupState title={translateMessage("webui.host.loading.title")} detail={translateMessage("webui.host.loading.detail")} />;
  if (manifest.catalogRevision !== webuiRevision) return <StartupState title={translateMessage("webui.host.revision.title")} detail={translateMessage("webui.host.revision.detail")} />;
  const runtime: HostRuntime = { manifest, principal, completeAuthentication, refreshManifest: async () => { await refreshManifest(); }, navigateToDefault: () => navigateToDefault(), navigate: (path: string) => navigate(path) };
  return <HostRuntimeProvider value={runtime}><ToastProvider placement="top-right" maxVisibleToasts={3} /><ZoneRendererProvider><Routes><Route element={<BlankLayout />}>{manifest.routes.filter((route) => route.layout === "blank").map((route) => <Route key={route.id} path={route.path} element={<ManifestPage route={route} manifest={manifest} />} />)}</Route><Route element={<AppShell manifest={manifest} principal={principal} onLogout={handleLogout} />}>{renderAppRoutes(manifest)}<Route path="/403" element={<SystemStatePage kind="forbidden" />} /><Route path="/404" element={<SystemStatePage kind="notFound" />} /></Route><Route path="/" element={<RootRedirect manifest={manifest} />} /><Route path="*" element={<StandaloneNotFound />} /></Routes></ZoneRendererProvider></HostRuntimeProvider>;
}

// renderAppRoutes 渲染 app 布局路由；带 groupLayoutId 的一族路由由共享模块布局
// （ModuleGroupLayout：固定布局 + 内容 Outlet）承载，切换分区时布局不卸载重挂（073）。
function renderAppRoutes(manifest: Manifest) {
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
    {standalone.map((route) => <Route key={route.id} path={route.path} element={<ManifestPage route={route} manifest={manifest} />} />)}
    {[...grouped.entries()].map(([layoutId, routes]) => {
      const first = routes[0];
      return <Route key={layoutId} element={<ModuleGroupLayout route={first} manifest={manifest} />}>
        {routes.map((route) => <Route key={route.id} path={route.path} element={<ManifestPage route={route} manifest={manifest} />} />)}
      </Route>;
    })}
  </>;
}

// ModuleGroupLayout 懒加载模块布局入口并把内容区（<Outlet />）作为 children 注入；
// 布局组件只接收 children，不依赖 react-router（模块边界保持）。
function ModuleGroupLayout({ route, manifest }: { route: ManifestRoute; manifest: Manifest }) {
  const Layout = route.groupLayoutId ? (entryComponents[route.groupLayoutId] as unknown as ComponentType<{ children?: ReactNode }>) : undefined;
  if (!Layout) return <SystemStatePage kind="missingEntry" />;
  return <RouteResourceBoundary route={route}><Suspense fallback={<PageSkeleton />}><Layout><Outlet /></Layout></Suspense></RouteResourceBoundary>;
}

function toPrincipal(session: WebUISession): PrincipalView {
  return { id: session.identity.accountId, username: session.identity.username, scopes: [...session.identity.permissions] };
}

function ManifestPage({ route, manifest }: { route: ManifestRoute; manifest: Manifest }) {
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

function routeIsLoadable(route: ManifestRoute): boolean {
  return route.availability === "available"
    || (route.availability === "degraded" && (route.availableCapabilities?.length ?? 0) > 0);
}

function RouteResourceBoundary({ route, children }: { route: ManifestRoute; children: ReactNode }) {
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

class RouteErrorBoundary extends Component<{ children: ReactNode }, RouteErrorBoundaryState> {
  state: RouteErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): RouteErrorBoundaryState {
    return { hasError: true };
  }

  render() {
    return this.state.hasError ? <SystemStatePage kind="routeError" /> : this.props.children;
  }
}

function RootRedirect({ manifest }: { manifest: Manifest }) {
  const route = manifest.routes.find((candidate) => candidate.default && candidate.access === "allowed" && candidate.deliveryState === "implemented" && routeIsLoadable(candidate))
    ?? manifest.routes.find((candidate) => candidate.unauthenticatedDefault && candidate.deliveryState === "implemented" && routeIsLoadable(candidate));
  return <Navigate to={route?.path ?? "/404"} replace />;
}

function StandaloneNotFound() {
  const location = useLocation();
  return <div className="standalone-state"><SystemStatePage kind="notFound" detail={location.pathname} /></div>;
}

function StartupState({ title, detail }: { title: string; detail: string }) {
  return <div className="startup-state"><span className="startup-logo">CG</span><h1>{title}</h1><p>{detail}</p></div>;
}
