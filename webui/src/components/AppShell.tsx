import { Activity, ChevronDown, ChevronRight, CircleUserRound, Expand, Languages, LogOut, Menu, Moon, Palette, PanelLeftClose, PanelLeftOpen, RefreshCw, Search, Sun, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useWebUITranslation, type Manifest, type ManifestMenu, type ManifestRoute, type WebUISession } from "@webui/contracts";
import { ConfirmDialog, Toast } from "@webui/ui";
import { changeLanguage, getAvailableLanguages, languageLabelMessageID, translateMessage } from "../i18n";
import { useThemePreferences } from "../theme";
import { RouteSearch } from "./RouteSearch";
import { ThemeDrawer } from "./ThemeDrawer";

export function AppShell({ manifest, session, onLogout }: { manifest: Manifest; session?: WebUISession; onLogout: () => Promise<void> }) {
  // 订阅公开 i18n 契约，确保语言切换会刷新宿主壳层及其下的公共 overlay。
  const { i18n: hostI18n } = useWebUITranslation("webui.host");
  const location = useLocation();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isMobileViewport, setIsMobileViewport] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [themeOpen, setThemeOpen] = useState(false);
  const [logoutOpen, setLogoutOpen] = useState(false);
  const [logoutFailed, setLogoutFailed] = useState(false);
  const { theme, setTheme, resetTheme } = useThemePreferences();
  const mobileMenuButtonRef = useRef<HTMLButtonElement>(null);
  const mobileSidebarRef = useRef<HTMLElement>(null);
  const mobileRestoreFocusRef = useRef<HTMLElement | null>(null);
  const accessibleRoutes = useMemo(() => manifest.routes.filter((route) => route.layout === "app" && route.access === "allowed" && route.deliveryState === "implemented"), [manifest]);
  const menu = useMemo(() => buildMenuTree(manifest.menu.map((item) => ({ item, route: accessibleRoutes.find((route) => route.id === item.routeId) })).filter((value): value is { item: ManifestMenu; route: ManifestRoute } => Boolean(value.route))), [accessibleRoutes, manifest.menu]);
  const currentRoute = manifest.routes.find((route) => route.path === location.pathname);
  const [visitedRouteIDs, setVisitedRouteIDs] = useState<string[]>(() => currentRoute?.layout === "app" ? [currentRoute.id] : []);
  useEffect(() => setCollapsed(theme.layout.sidebarCollapsed), [theme.layout.sidebarCollapsed]);
  useEffect(() => {
    const media = window.matchMedia("(max-width: 720px)");
    const update = () => setIsMobileViewport(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);
  useEffect(() => {
    if (!mobileOpen) return;
    mobileRestoreFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const focusFrame = requestAnimationFrame(() => mobileSidebarRef.current?.querySelector<HTMLElement>("[data-mobile-initial-focus]")?.focus());
    return () => {
      cancelAnimationFrame(focusFrame);
      const target = mobileRestoreFocusRef.current ?? mobileMenuButtonRef.current;
      mobileRestoreFocusRef.current = null;
      target?.focus();
    };
  }, [mobileOpen]);
  const [expandedMenuIDs, setExpandedMenuIDs] = useState<Set<string>>(() => new Set());

  useEffect(() => {
    if (currentRoute?.layout === "app" && currentRoute.access === "allowed") {
      setVisitedRouteIDs((current) => current.includes(currentRoute.id) ? current : [...current, currentRoute.id]);
    }
    setMobileOpen(false);
  }, [currentRoute]);
  useEffect(() => {
    const activeAncestors = findMenuAncestors(menu, currentRoute?.id);
    if (activeAncestors.length === 0) return;
    setExpandedMenuIDs((current) => new Set([...current, ...activeAncestors]));
  }, [currentRoute?.id, menu]);
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
    if (!isWorkspaceTabClosable(route)) return;
    const next = visitedRoutes.filter((value) => value.id !== route.id);
    setVisitedRouteIDs(next.map((value) => value.id));
    if (route.id === currentRoute?.id) navigate((next.at(-1) ?? accessibleRoutes.find((value) => value.default) ?? accessibleRoutes[0])?.path ?? "/404");
  };
  const refreshCurrentRoute = () => navigate(0);
  const toggleFullscreen = () => document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen();
  const toggleSidebar = () => { const next = !collapsed; setCollapsed(next); setTheme({ ...theme, layout: { ...theme.layout, sidebarCollapsed: next } }); };
  const toggleColorScheme = () => setTheme({ ...theme, mode: theme.mode === "dark" ? "light" : "dark" });
  const confirmLogout = () => {
    setLogoutOpen(false);
    void onLogout().catch(() => setLogoutFailed(true));
  };
  const availableLanguages = getAvailableLanguages();
  const handleMobileSidebarKeyDown = (event: ReactKeyboardEvent<HTMLElement>) => {
    if (!isMobileViewport) return;
    if (event.key === "Escape") {
      event.preventDefault();
      setMobileOpen(false);
      return;
    }
    if (event.key !== "Tab") return;
    const focusable = Array.from(mobileSidebarRef.current?.querySelectorAll<HTMLElement>("a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex=\"-1\"])") ?? []);
    if (focusable.length === 0) return;
    const currentIndex = focusable.indexOf(document.activeElement as HTMLElement);
    const nextIndex = event.shiftKey
      ? currentIndex <= 0 ? focusable.length - 1 : currentIndex - 1
      : currentIndex === focusable.length - 1 ? 0 : currentIndex + 1;
    event.preventDefault();
    focusable[nextIndex]?.focus();
  };
  const handleWorkspaceTabKeyDown = (event: ReactKeyboardEvent<HTMLButtonElement>, index: number) => {
    const targetIndex = getWorkspaceTabTargetIndex(event.key, index, visitedRoutes.length);
    if (targetIndex === undefined) return;
    event.preventDefault();
    const target = visitedRoutes[targetIndex];
    if (!target) return;
    navigate(target.path);
    requestAnimationFrame(() => document.getElementById(workspaceTabID(target.id))?.focus());
  };
  const activeWorkspaceTabID = currentRoute?.id ?? visitedRoutes[0]?.id;

  return <div className={`app-shell ${collapsed ? "sidebar-collapsed" : ""}`}>
    <button type="button" className={`mobile-backdrop ${mobileOpen ? "visible" : ""}`} onClick={() => setMobileOpen(false)} aria-label={translateMessage("webui.host.menu.close")} disabled={!mobileOpen} tabIndex={mobileOpen ? 0 : -1} />
    <aside ref={mobileSidebarRef} className={`app-sidebar ${mobileOpen ? "mobile-open" : ""}`} aria-hidden={shouldIsolateMobileSidebar(isMobileViewport, mobileOpen)} inert={shouldIsolateMobileSidebar(isMobileViewport, mobileOpen)} onKeyDown={handleMobileSidebarKeyDown}>
      <div className="brand-row"><span className="brand-mark">{translateMessage("webui.host.brandSymbol")}</span><span className="brand-copy"><strong>{translateMessage("webui.host.brand")}</strong><small>{translateMessage("webui.host.product")}</small></span><button type="button" data-mobile-initial-focus className="mobile-sidebar-close" onClick={() => setMobileOpen(false)} aria-label={translateMessage("webui.host.menu.close")}><X size={18} /></button></div>
      <nav className="sidebar-nav"><SidebarMenu entries={menu} currentRouteID={currentRoute?.id} expandedMenuIDs={expandedMenuIDs} onToggle={(menuID) => setExpandedMenuIDs((current) => { const next = new Set(current); next.has(menuID) ? next.delete(menuID) : next.add(menuID); return next; })} /></nav>
      <div className="sidebar-meta"><span>{translateMessage("webui.host.revision.label")}</span><code>{manifest.revision.slice(0, 8)}</code></div>
    </aside>
    <div className="app-workspace">
      <header className="topbar"><div className="topbar-left"><button type="button" className="icon-button desktop-sidebar-toggle" onClick={toggleSidebar} aria-label={translateMessage(collapsed ? "webui.host.sidebar.expand" : "webui.host.sidebar.collapse")}>{collapsed ? <PanelLeftOpen size={19} /> : <PanelLeftClose size={19} />}</button><button type="button" ref={mobileMenuButtonRef} className="icon-button mobile-menu-button" onClick={() => setMobileOpen(true)} aria-label={translateMessage("webui.host.menu.open")}><Menu size={20} /></button>{theme.layout.showBreadcrumb && <div className="breadcrumb"><span>{translateMessage("webui.host.breadcrumb.home")}</span><ChevronRight size={14} /> <strong>{currentRoute ? translateMessage(currentRoute.titleMessageId) : location.pathname}</strong></div>}</div><div className="topbar-actions"><button type="button" className="search-trigger" onClick={() => setSearchOpen(true)}><Search size={17} /><span>{translateMessage("webui.host.search")}</span><kbd>{translateMessage("webui.host.search.shortcut")}</kbd></button><button type="button" className="icon-button" onClick={() => void toggleFullscreen()} title={translateMessage("webui.host.fullscreen")}><Expand size={18} /></button><label className="language-button" title={translateMessage("webui.host.language")}><Languages size={18} /><select aria-label={translateMessage("webui.host.language")} value={hostI18n.language} onChange={(event) => void changeLanguage(event.target.value)}>{availableLanguages.map((language) => <option value={language} key={language}>{translateMessage(languageLabelMessageID(language))}</option>)}</select></label><button type="button" className="icon-button" onClick={toggleColorScheme} title={translateMessage("webui.host.theme.toggle")} aria-label={translateMessage("webui.host.theme.toggle")}>{theme.mode === "dark" ? <Sun size={18} /> : <Moon size={18} />}</button><button type="button" className="icon-button" onClick={() => setThemeOpen(true)} title={translateMessage("webui.host.theme")} aria-label={translateMessage("webui.host.theme")}><Palette size={18} /></button><details className="account-menu"><summary><span className="user-avatar">{session?.user.username.slice(0, 1).toUpperCase() ?? <CircleUserRound size={18} />}</span><span>{session?.user.username ?? translateMessage("webui.host.account")}</span></summary><div><button type="button" onClick={() => setLogoutOpen(true)} disabled={!session}><LogOut size={16} />{translateMessage("webui.host.logout")}</button></div></details></div></header>
      {theme.layout.showTabs && <div className="workspace-tabs"><div className="workspace-tab-scroll" role="tablist" aria-label={translateMessage("webui.host.tabs.list")}>{visitedRoutes.map((route, index) => { const active = route.id === currentRoute?.id; const closable = isWorkspaceTabClosable(route); return <div className={active ? "workspace-tab active" : "workspace-tab"} key={route.id}><button id={workspaceTabID(route.id)} type="button" role="tab" tabIndex={active ? 0 : -1} aria-selected={active} aria-controls="webui-workspace-panel" className="workspace-tab-trigger" onClick={() => navigate(route.path)} onKeyDown={(event) => handleWorkspaceTabKeyDown(event, index)}><span className="tab-dot" />{translateMessage(route.titleMessageId)}</button>{closable && <button type="button" className="tab-close" onClick={() => closeTab(route)} aria-label={translateMessage("webui.host.tabs.close")}><X size={13} /></button>}</div>; })}</div><div className="workspace-tab-actions"><button type="button" className="icon-button" onClick={refreshCurrentRoute} aria-label={translateMessage("webui.host.tabs.refresh")} title={translateMessage("webui.host.tabs.refresh")}><RefreshCw size={16} /></button></div></div>}
      <main id="webui-workspace-panel" className="page-viewport" role={theme.layout.showTabs ? "tabpanel" : undefined} aria-labelledby={theme.layout.showTabs && activeWorkspaceTabID ? workspaceTabID(activeWorkspaceTabID) : undefined}><Outlet /></main>
      {theme.layout.showFooter && <footer className="app-footer"><span>{translateMessage("webui.host.footer")}</span><span>{new Date().getFullYear()}</span></footer>}
    </div>
    <RouteSearch open={searchOpen} routes={accessibleRoutes} onClose={() => setSearchOpen(false)} />
    <ThemeDrawer open={themeOpen} theme={theme} onChange={setTheme} onReset={resetTheme} onClose={() => setThemeOpen(false)} />
    <ConfirmDialog open={logoutOpen} title={translateMessage("webui.host.logout.confirm.title")} description={translateMessage("webui.host.logout.confirm.detail")} confirmLabel={translateMessage("webui.host.logout.confirm.confirm")} cancelLabel={translateMessage("webui.host.logout.confirm.cancel")} closeLabel={translateMessage("webui.host.logout.confirm.close")} onConfirm={confirmLogout} onCancel={() => setLogoutOpen(false)} />
    <Toast open={logoutFailed} tone="danger" title={translateMessage("webui.host.logout.failed.title")} detail={translateMessage("webui.host.logout.failed.detail")} closeLabel={translateMessage("webui.host.logout.failed.close")} onClose={() => setLogoutFailed(false)} />
  </div>;
}

export type SidebarMenuEntry = { item: ManifestMenu; route: ManifestRoute; children: SidebarMenuEntry[] };

export function isWorkspaceTabClosable(route: ManifestRoute): boolean {
  return !route.default;
}

export function workspaceTabID(routeID: string): string {
  return `webui-workspace-tab-${routeID}`;
}

export function getWorkspaceTabTargetIndex(key: string, currentIndex: number, count: number): number | undefined {
  if (count <= 0) return undefined;
  if (key === "Home") return 0;
  if (key === "End") return count - 1;
  if (key === "ArrowRight") return (currentIndex + 1) % count;
  if (key === "ArrowLeft") return (currentIndex - 1 + count) % count;
  return undefined;
}

export function shouldIsolateMobileSidebar(isMobileViewport: boolean, mobileOpen: boolean): boolean {
  return isMobileViewport && !mobileOpen;
}

export function buildMenuTree(entries: Array<{ item: ManifestMenu; route: ManifestRoute }>): SidebarMenuEntry[] {
  const nodes = entries.map(({ item, route }) => ({ item, route, children: [] as SidebarMenuEntry[] }));
  const byID = new Map(nodes.map((node) => [node.item.id, node]));
  const roots: SidebarMenuEntry[] = [];
  for (const node of nodes) {
    const parent = node.item.parentId ? byID.get(node.item.parentId) : undefined;
    if (parent) parent.children.push(node);
    else roots.push(node);
  }
  return roots;
}

function findMenuAncestors(entries: SidebarMenuEntry[], routeID?: string): string[] {
  for (const entry of entries) {
    if (entry.route.id === routeID) return [];
    const childAncestors = findMenuAncestors(entry.children, routeID);
    if (childAncestors.length > 0 || entry.children.some((child) => child.route.id === routeID)) return [entry.item.id, ...childAncestors];
  }
  return [];
}

function menuContainsRoute(entry: SidebarMenuEntry, routeID?: string): boolean {
  return entry.route.id === routeID || entry.children.some((child) => menuContainsRoute(child, routeID));
}

function SidebarMenu({ entries, currentRouteID, expandedMenuIDs, onToggle, level = 0 }: { entries: SidebarMenuEntry[]; currentRouteID?: string; expandedMenuIDs: Set<string>; onToggle: (menuID: string) => void; level?: number }) {
  return <>{entries.map((entry) => {
    const hasChildren = entry.children.length > 0;
    const expanded = expandedMenuIDs.has(entry.item.id);
    const active = menuContainsRoute(entry, currentRouteID);
    return <div className="sidebar-menu-group" key={entry.item.id}><div className={active ? "sidebar-entry active" : "sidebar-entry"}><Link to={entry.route.path} title={translateMessage(entry.item.titleMessageId)} className={entry.route.id === currentRouteID ? "sidebar-link active" : "sidebar-link"} style={{ paddingLeft: `${11 + level * 14}px` }}><MenuIcon iconID={entry.item.iconId} /><span>{translateMessage(entry.item.titleMessageId)}</span></Link>{hasChildren && <button className="sidebar-group-toggle" onClick={() => onToggle(entry.item.id)} aria-expanded={expanded} aria-label={translateMessage(expanded ? "webui.host.menu.collapse" : "webui.host.menu.expand")}><ChevronDown size={14} /></button>}</div>{hasChildren && expanded && <SidebarMenu entries={entry.children} currentRouteID={currentRouteID} expandedMenuIDs={expandedMenuIDs} onToggle={onToggle} level={level + 1} />}</div>;
  })}</>;
}

function MenuIcon({ iconID }: { iconID: string }) {
  if (iconID === "activity") return <Activity size={18} />;
  if (iconID === "user") return <CircleUserRound size={18} />;
  return <span className="menu-icon-fallback" />;
}

export function BlankLayout() {
  const { i18n: hostI18n } = useWebUITranslation("webui.host");
  const [themeOpen, setThemeOpen] = useState(false);
  const { theme, setTheme, resetTheme } = useThemePreferences();
  const availableLanguages = getAvailableLanguages();
  const toggleColorScheme = () => setTheme({ ...theme, mode: theme.mode === "dark" ? "light" : "dark" });
  return <div className="blank-layout"><header className="blank-header"><Link className="blank-brand" to="/"><span className="brand-mark">{translateMessage("webui.host.brandSymbol")}</span><span><strong>{translateMessage("webui.host.brand")}</strong><small>{translateMessage("webui.host.product")}</small></span></Link><div className="blank-actions"><label className="language-button" title={translateMessage("webui.host.language")}><Languages size={18} /><select aria-label={translateMessage("webui.host.language")} value={hostI18n.language} onChange={(event) => void changeLanguage(event.target.value)}>{availableLanguages.map((language) => <option value={language} key={language}>{translateMessage(languageLabelMessageID(language))}</option>)}</select></label><button type="button" className="icon-button" onClick={toggleColorScheme} title={translateMessage("webui.host.theme.toggle")} aria-label={translateMessage("webui.host.theme.toggle")}>{theme.mode === "dark" ? <Sun size={18} /> : <Moon size={18} />}</button><button type="button" className="icon-button" onClick={() => setThemeOpen(true)} title={translateMessage("webui.host.theme")} aria-label={translateMessage("webui.host.theme")}><Palette size={18} /></button></div></header><main className="blank-content"><Outlet /></main><p className="blank-footer">{translateMessage("webui.host.footer")}</p><ThemeDrawer open={themeOpen} theme={theme} onChange={setTheme} onReset={resetTheme} onClose={() => setThemeOpen(false)} /></div>;
}
