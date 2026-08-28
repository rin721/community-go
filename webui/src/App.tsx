import { useCallback, useEffect, useState } from "react";
import { Navigate, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { HostRuntimeProvider, type HostRuntime, type Manifest, type PrincipalView } from "@webui/sdk/runtime";
import { ToastProvider } from "@webui/sdk/ui";
import { translateMessage } from "./i18n";
import { AppShell, BlankLayout } from "./components/AppShell";
import { ZoneRendererProvider } from "./zone/ZoneRenderer";
import { webuiRevision } from "./generated/webui-registry";
import { loadManifest, loadSession, logout, type WebUISession } from "./api";
import { SystemStatePage } from "./pages/SystemStatePage";
import { ManifestRouteView, renderAppRoutes, routeIsLoadable } from "./routes";
import { WorkspaceProvider } from "./workspace/WorkspaceProvider";

export function App() {
  const navigate = useNavigate();
  const location = useLocation();
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
    setPrincipal(undefined);
    const nextManifest = await refreshManifest();
    navigate(nextManifest.routes.find((candidate) => candidate.unauthenticatedDefault)?.path ?? "/", { replace: true });
  }, [navigate, refreshManifest, webuiSession]);
  if (error) return <StartupState title={translateMessage("webui.host.assembly.title")} detail={translateMessage("webui.host.assembly.detail")} />;
  if (!manifest) return <StartupState title={translateMessage("webui.host.loading.title")} detail={translateMessage("webui.host.loading.detail")} />;
  if (manifest.catalogRevision !== webuiRevision) return <StartupState title={translateMessage("webui.host.revision.title")} detail={translateMessage("webui.host.revision.detail")} />;
  const runtime: HostRuntime = { manifest, principal, location: { pathname: location.pathname, search: location.search }, completeAuthentication, refreshManifest: async () => { await refreshManifest(); }, navigateToDefault: () => navigateToDefault(), navigate: (path: string) => navigate(path) };
  return <HostRuntimeProvider value={runtime}><ToastProvider placement="top-right" maxVisibleToasts={3} /><WorkspaceProvider manifest={manifest} principalID={principal?.id} navigateToDefault={() => navigateToDefault()}><ZoneRendererProvider><Routes><Route element={<BlankLayout />}>{manifest.routes.filter((route) => route.layout === "blank").map((route) => <Route key={route.id} path={route.path} element={<ManifestRouteView route={route} manifest={manifest} />} />)}</Route><Route element={<AppShell manifest={manifest} principal={principal} onLogout={handleLogout} />}>{renderAppRoutes(manifest)}<Route path="/403" element={<SystemStatePage kind="forbidden" />} /><Route path="/404" element={<SystemStatePage kind="notFound" />} /></Route><Route path="/" element={<RootRedirect manifest={manifest} />} /><Route path="*" element={<StandaloneNotFound />} /></Routes></ZoneRendererProvider></WorkspaceProvider></HostRuntimeProvider>;
}

export { ManifestRouteView };

function toPrincipal(session: WebUISession): PrincipalView {
  return { id: session.identity.accountId, username: session.identity.username, scopes: [...session.identity.permissions] };
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
