import { Activity, ChevronRight, CircleUserRound, Expand, Languages, LogOut, Menu, Moon, Palette, PanelLeftClose, PanelLeftOpen, RefreshCw, Search, Sun, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import type { Manifest, ManifestRoute, WebUISession } from "@webui/contracts";
import { changeLanguage, i18n, translateMessage } from "../i18n";
import { useThemePreferences } from "../theme";
import { RouteSearch } from "./RouteSearch";
import { ThemeDrawer } from "./ThemeDrawer";

export function AppShell({ manifest, session, onLogout }: { manifest: Manifest; session?: WebUISession; onLogout: () => Promise<void> }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [themeOpen, setThemeOpen] = useState(false);
  const { theme, setTheme, resetTheme } = useThemePreferences();
  const accessibleRoutes = useMemo(() => manifest.routes.filter((route) => route.layout === "app" && route.access === "allowed" && route.deliveryState === "implemented"), [manifest]);
  const menu = useMemo(() => manifest.menu.map((item) => ({ item, route: accessibleRoutes.find((route) => route.id === item.routeId) })).filter((value): value is { item: typeof value.item; route: ManifestRoute } => Boolean(value.route)), [accessibleRoutes, manifest.menu]);
  const currentRoute = manifest.routes.find((route) => route.path === location.pathname);
  const [visitedRouteIDs, setVisitedRouteIDs] = useState<string[]>(() => currentRoute?.layout === "app" ? [currentRoute.id] : []);

  useEffect(() => {
    if (currentRoute?.layout === "app" && currentRoute.access === "allowed") {
      setVisitedRouteIDs((current) => current.includes(currentRoute.id) ? current : [...current, currentRoute.id]);
    }
    setMobileOpen(false);
  }, [currentRoute]);
  useEffect(() => {
    const handleKeydown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setSearchOpen(true);
      }
      if (event.key === "Escape") { setSearchOpen(false); setThemeOpen(false); setMobileOpen(false); }
    };
    window.addEventListener("keydown", handleKeydown);
    return () => window.removeEventListener("keydown", handleKeydown);
  }, []);

  const visitedRoutes = visitedRouteIDs.map((id) => manifest.routes.find((route) => route.id === id)).filter((route): route is ManifestRoute => Boolean(route));
  const closeTab = (route: ManifestRoute) => {
    const next = visitedRoutes.filter((value) => value.id !== route.id);
    setVisitedRouteIDs(next.map((value) => value.id));
    if (route.id === currentRoute?.id) navigate((next.at(-1) ?? accessibleRoutes.find((value) => value.default) ?? accessibleRoutes[0])?.path ?? "/404");
  };
  const refreshCurrentRoute = () => navigate(0);
  const toggleFullscreen = () => document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen();
  const toggleColorScheme = () => setTheme({ ...theme, mode: theme.mode === "dark" ? "light" : "dark" });

  return <div className={`app-shell ${collapsed ? "sidebar-collapsed" : ""}`}>
    <button className={`mobile-backdrop ${mobileOpen ? "visible" : ""}`} onClick={() => setMobileOpen(false)} aria-label={translateMessage("webui.host.menu.close")} />
    <aside className={`app-sidebar ${mobileOpen ? "mobile-open" : ""}`}>
      <div className="brand-row"><span className="brand-mark">{translateMessage("webui.host.brandSymbol")}</span><span className="brand-copy"><strong>{translateMessage("webui.host.brand")}</strong><small>{translateMessage("webui.host.product")}</small></span><button className="mobile-sidebar-close" onClick={() => setMobileOpen(false)} aria-label={translateMessage("webui.host.menu.close")}><X size={18} /></button></div>
      <nav className="sidebar-nav">{menu.map(({ item, route }) => <Link key={item.id} to={route.path} title={translateMessage(item.titleMessageId)} className={currentRoute?.id === route.id ? "sidebar-link active" : "sidebar-link"}><MenuIcon iconID={item.iconId} /><span>{translateMessage(item.titleMessageId)}</span></Link>)}</nav>
      <div className="sidebar-meta"><span>{translateMessage("webui.host.revision.label")}</span><code>{manifest.revision.slice(0, 8)}</code></div>
    </aside>
    <div className="app-workspace">
      <header className="topbar"><div className="topbar-left"><button className="icon-button desktop-sidebar-toggle" onClick={() => setCollapsed((value) => !value)} aria-label={translateMessage(collapsed ? "webui.host.sidebar.expand" : "webui.host.sidebar.collapse")}>{collapsed ? <PanelLeftOpen size={19} /> : <PanelLeftClose size={19} />}</button><button className="icon-button mobile-menu-button" onClick={() => setMobileOpen(true)} aria-label={translateMessage("webui.host.menu.open")}><Menu size={20} /></button><div className="breadcrumb"><span>{translateMessage("webui.host.breadcrumb.home")}</span><ChevronRight size={14} /> <strong>{currentRoute ? translateMessage(currentRoute.titleMessageId) : location.pathname}</strong></div></div><div className="topbar-actions"><button className="search-trigger" onClick={() => setSearchOpen(true)}><Search size={17} /><span>{translateMessage("webui.host.search")}</span><kbd>{translateMessage("webui.host.search.shortcut")}</kbd></button><button className="icon-button" onClick={() => void toggleFullscreen()} title={translateMessage("webui.host.fullscreen")}><Expand size={18} /></button><label className="language-button" title={translateMessage("webui.host.language")}><Languages size={18} /><select value={i18n.language} onChange={(event) => void changeLanguage(event.target.value)}><option value="zh-CN">{translateMessage("webui.host.language.zhCN")}</option></select></label><button className="icon-button" onClick={toggleColorScheme} title={translateMessage("webui.host.theme.toggle")} aria-label={translateMessage("webui.host.theme.toggle")}>{theme.mode === "dark" ? <Sun size={18} /> : <Moon size={18} />}</button><button className="icon-button" onClick={() => setThemeOpen(true)} title={translateMessage("webui.host.theme")} aria-label={translateMessage("webui.host.theme")}><Palette size={18} /></button><details className="account-menu"><summary><span className="user-avatar">{session?.user.username.slice(0, 1).toUpperCase() ?? <CircleUserRound size={18} />}</span><span>{session?.user.username ?? translateMessage("webui.host.account")}</span></summary><div><button onClick={() => void onLogout()} disabled={!session}><LogOut size={16} />{translateMessage("webui.host.logout")}</button></div></details></div></header>
      <div className="workspace-tabs">{visitedRoutes.map((route) => <div className={route.id === currentRoute?.id ? "workspace-tab active" : "workspace-tab"} key={route.id}><button onClick={() => navigate(route.path)}><span className="tab-dot" />{translateMessage(route.titleMessageId)}</button>{visitedRoutes.length > 1 && <button className="tab-close" onClick={() => closeTab(route)} aria-label={translateMessage("webui.host.tabs.close")}><X size={13} /></button>}</div>)}<div className="workspace-tab-actions"><button className="icon-button" onClick={refreshCurrentRoute} aria-label={translateMessage("webui.host.tabs.refresh")} title={translateMessage("webui.host.tabs.refresh")}><RefreshCw size={16} /></button></div></div>
      <main className="page-viewport"><Outlet /></main>
      <footer className="app-footer"><span>{translateMessage("webui.host.footer")}</span><span>{new Date().getFullYear()}</span></footer>
    </div>
    <RouteSearch open={searchOpen} routes={accessibleRoutes} onClose={() => setSearchOpen(false)} />
    <ThemeDrawer open={themeOpen} theme={theme} onChange={setTheme} onReset={resetTheme} onClose={() => setThemeOpen(false)} />
  </div>;
}

function MenuIcon({ iconID }: { iconID: string }) {
  if (iconID === "activity") return <Activity size={18} />;
  return <span className="menu-icon-fallback" />;
}

export function BlankLayout() {
  return <div className="blank-layout"><Link className="blank-brand" to="/"><span className="brand-mark">{translateMessage("webui.host.brandSymbol")}</span><span><strong>{translateMessage("webui.host.brand")}</strong><small>{translateMessage("webui.host.product")}</small></span></Link><Outlet /><p className="blank-footer">{translateMessage("webui.host.footer")}</p></div>;
}
