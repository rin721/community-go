import { lazy, Suspense, useCallback, useEffect, useState, type ComponentType } from "react";
import { Navigate, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { HostRuntimeProvider, type HostRuntime, type Manifest, type ManifestRoute, type WebUISession } from "@webui/contracts";
import { AppShell, BlankLayout } from "./components/AppShell";
import { webuiEntryRegistry, webuiRevision } from "./generated/webui-registry";
import { translateMessage } from "./i18n";
import { loadManifest, loadSession, logout } from "./api";
import { SystemStatePage } from "./pages/SystemStatePage";

type EntryModule = { default: ComponentType };
const entryLoaders = webuiEntryRegistry as Record<string, () => Promise<EntryModule>>;
const entryComponents = Object.fromEntries(Object.entries(entryLoaders).map(([entryID, load]) => [entryID, lazy(load)]));

export function App() {
  const navigate = useNavigate();
  const [manifest, setManifest] = useState<Manifest>();
  const [webuiSession, setWebUISession] = useState<WebUISession>();
  const [error, setError] = useState<string>();
  const refreshManifest = useCallback(async () => {
    const value = await loadManifest();
    setManifest(value);
    return value;
  }, []);
  useEffect(() => {
    void Promise.all([refreshManifest(), loadSession().then(setWebUISession).catch(() => undefined)]).catch((reason: Error) => setError(reason.message));
  }, [refreshManifest]);
  const navigateToDefault = useCallback((catalog = manifest) => {
    const route = catalog?.routes.find((candidate) => candidate.default && candidate.access === "allowed" && candidate.deliveryState === "implemented")
      ?? catalog?.routes.find((candidate) => candidate.unauthenticatedDefault && candidate.deliveryState === "implemented");
    navigate(route?.path ?? "/404", { replace: true });
  }, [manifest, navigate]);
  const completeAuthentication = useCallback(async (value: WebUISession) => {
    setWebUISession(value);
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
  if (manifest.revision !== webuiRevision) return <StartupState title={translateMessage("webui.host.revision.title")} detail={translateMessage("webui.host.revision.detail")} />;
  const runtime: HostRuntime = { manifest, session: webuiSession, completeAuthentication, navigateToDefault: () => navigateToDefault() };
  return <HostRuntimeProvider value={runtime}><Routes><Route element={<BlankLayout />}>{manifest.routes.filter((route) => route.layout === "blank").map((route) => <Route key={route.id} path={route.path} element={<ManifestPage route={route} manifest={manifest} />} />)}</Route><Route element={<AppShell manifest={manifest} session={webuiSession} onLogout={handleLogout} />}>{manifest.routes.filter((route) => route.layout === "app").map((route) => <Route key={route.id} path={route.path} element={<ManifestPage route={route} manifest={manifest} />} />)}<Route path="/403" element={<SystemStatePage kind="forbidden" />} /><Route path="/404" element={<SystemStatePage kind="notFound" />} /></Route><Route path="/" element={<RootRedirect manifest={manifest} />} /><Route path="*" element={<StandaloneNotFound />} /></Routes></HostRuntimeProvider>;
}

function ManifestPage({ route, manifest }: { route: ManifestRoute; manifest: Manifest }) {
  if (route.access === "authentication-required") {
    const loginRoute = manifest.routes.find((candidate) => candidate.unauthenticatedDefault);
    return loginRoute ? <Navigate to={loginRoute.path} replace /> : <SystemStatePage kind="unauthorized" />;
  }
  if (route.access === "denied") return <Navigate to="/403" replace />;
  if (route.deliveryState === "not-implemented") return <SystemStatePage kind="notImplemented" />;
  const Page = entryComponents[route.entryId];
  if (!Page) return <SystemStatePage kind="missingEntry" />;
  return <Suspense fallback={<PageLoading />}><Page /></Suspense>;
}

function RootRedirect({ manifest }: { manifest: Manifest }) {
  const route = manifest.routes.find((candidate) => candidate.default && candidate.access === "allowed" && candidate.deliveryState === "implemented")
    ?? manifest.routes.find((candidate) => candidate.unauthenticatedDefault && candidate.deliveryState === "implemented");
  return <Navigate to={route?.path ?? "/404"} replace />;
}

function PageLoading() { return <div className="page-loading" aria-label={translateMessage("webui.host.loading.label")}><span /><span /><span /></div>; }

function StandaloneNotFound() {
  const location = useLocation();
  return <div className="standalone-state"><SystemStatePage kind="notFound" detail={location.pathname} /></div>;
}

function StartupState({ title, detail }: { title: string; detail: string }) {
  return <div className="startup-state"><span className="startup-logo">CG</span><h1>{title}</h1><p>{detail}</p></div>;
}
