import { useEffect, useMemo, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { Languages, Moon, Palette, Sun } from "lucide-react";
import type { Manifest, ManifestRoute, PrincipalView } from "@webui/sdk/runtime";
import { useWebUITranslation } from "@webui/sdk/i18n";
import { ConfirmDialog, IconButton, Toast } from "@webui/sdk/ui";
import { changeLanguage, ensureRouteLocale, getAvailableLanguages, languageLabelMessageID, translateMessage } from "../i18n";
import { effectiveReduceMotion, useThemePreferences } from "../theme";
import { ScrollExperience } from "../scroll/ScrollExperience";
import { RouteSearch } from "./RouteSearch";
import { ThemeDrawer } from "./ThemeDrawer";
import { AppSidebar, shouldIsolateMobileSidebar } from "./shell/AppSidebar";
import { AppHeader } from "./shell/AppHeader";
import { buildMenuTree, findMenuAncestors, type SidebarMenuEntry } from "./shell/SidebarMenu";
import { getWorkspaceTabTargetIndex, isWorkspaceTabClosable, workspaceTabID, WorkspaceTabs } from "./shell/WorkspaceTabs";
import { ZoneItems } from "../zone/ZoneItems";

export { buildMenuTree, findMenuAncestors, getWorkspaceTabTargetIndex, isWorkspaceTabClosable, shouldIsolateMobileSidebar, workspaceTabID };
export type { SidebarMenuEntry };

export function BlankLayout() {
  const { i18n: hostI18n } = useWebUITranslation("webui.host");
  const [themeOpen, setThemeOpen] = useState(false);
  const { theme, setTheme, resetTheme } = useThemePreferences();
  const availableLanguages = getAvailableLanguages();
  const toggleColorScheme = () => setTheme({ ...theme, mode: theme.mode === "dark" ? "light" : "dark" });
  return <div className="blank-layout"><header className="blank-header"><Link className="blank-brand" to="/"><span className="brand-mark">{translateMessage("webui.host.brandSymbol")}</span><span><strong>{translateMessage("webui.host.brand")}</strong><small>{translateMessage("webui.host.product")}</small></span></Link><div className="blank-actions"><label className="language-button" title={translateMessage("webui.host.language")}><Languages size={18} /><select aria-label={translateMessage("webui.host.language")} value={hostI18n.language} onChange={(event) => void changeLanguage(event.target.value)}>{availableLanguages.map((language) => <option value={language} key={language}>{translateMessage(languageLabelMessageID(language))}</option>)}</select></label><IconButton label={translateMessage("webui.host.theme.toggle")} title={translateMessage("webui.host.theme.toggle")} onClick={toggleColorScheme}>{theme.mode === "dark" ? <Sun size={18} /> : <Moon size={18} />}</IconButton><IconButton label={translateMessage("webui.host.theme")} title={translateMessage("webui.host.theme")} onClick={() => setThemeOpen(true)}><Palette size={18} /></IconButton></div></header><ScrollExperience target="window" experience={theme.experience} reducedMotion={effectiveReduceMotion(theme.reduceMotion)}><main className="blank-content"><Outlet /></main></ScrollExperience><p className="blank-footer">{translateMessage("webui.host.footer")}</p><ThemeDrawer open={themeOpen} theme={theme} onChange={setTheme} onReset={resetTheme} onClose={() => setThemeOpen(false)} /></div>;
}

export function AppShell({ manifest, principal, onLogout }: { manifest: Manifest; principal?: PrincipalView; onLogout: () => Promise<void> }) {
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
  const localeEligibleRoutes = useMemo(() => accessibleRoutes.filter((route) => route.availability === "available" || (route.availability === "degraded" && (route.availableCapabilities?.length ?? 0) > 0)), [accessibleRoutes]);
  const menu = useMemo(() => buildMenuTree(manifest.menu.map((item) => ({ item, route: accessibleRoutes.find((route) => route.id === item.routeId) })).filter((value): value is { item: NonNullable<typeof manifest.menu>[number]; route: ManifestRoute } => Boolean(value.route))), [accessibleRoutes, manifest.menu]);
  const currentRoute = manifest.routes.find((route) => route.path === location.pathname);
  const [visitedRouteIDs, setVisitedRouteIDs] = useState<string[]>(() => currentRoute?.layout === "app" ? [currentRoute.id] : []);
  useEffect(() => setCollapsed(theme.layout.sidebarCollapsed), [theme.layout.sidebarCollapsed]);
  useEffect(() => { void Promise.allSettled(localeEligibleRoutes.map(ensureRouteLocale)); }, [localeEligibleRoutes]);
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
    <AppSidebar sidebarRef={mobileSidebarRef} mobileOpen={mobileOpen} isMobileViewport={isMobileViewport} collapsed={collapsed} menu={menu} currentRouteID={currentRoute?.id} expandedMenuIDs={expandedMenuIDs} onToggleMenu={(menuID) => setExpandedMenuIDs((current) => { const next = new Set(current); next.has(menuID) ? next.delete(menuID) : next.add(menuID); return next; })} onClose={() => setMobileOpen(false)} onKeyDown={handleMobileSidebarKeyDown} revision={manifest.catalogRevision} />
    <div className="app-workspace">
      <AppHeader collapsed={collapsed} onToggleSidebar={toggleSidebar} mobileMenuButtonRef={mobileMenuButtonRef} onOpenMobileMenu={() => setMobileOpen(true)} showBreadcrumb={theme.layout.showBreadcrumb} currentRoute={currentRoute} pathname={location.pathname} hostLanguage={hostI18n.language} availableLanguages={availableLanguages} onLanguageChange={(language) => void changeLanguage(language)} theme={theme} onToggleColorScheme={toggleColorScheme} onOpenTheme={() => setThemeOpen(true)} onOpenSearch={() => setSearchOpen(true)} onToggleFullscreen={toggleFullscreen} principal={principal} onRequestLogout={() => setLogoutOpen(true)} />
      {theme.layout.showTabs && <WorkspaceTabs routes={visitedRoutes} currentRouteID={currentRoute?.id} panelLabel={translateMessage("webui.host.tabs.list")} onNavigate={(path) => navigate(path)} onCloseTab={closeTab} onRefresh={refreshCurrentRoute} onKeyDown={handleWorkspaceTabKeyDown} />}
      <ScrollExperience target="panel" experience={theme.experience} reducedMotion={effectiveReduceMotion(theme.reduceMotion)} panelProps={{ id: "webui-workspace-panel", role: theme.layout.showTabs ? "tabpanel" : undefined, ariaLabelledby: theme.layout.showTabs && activeWorkspaceTabID ? workspaceTabID(activeWorkspaceTabID) : undefined }}><Outlet /></ScrollExperience>
      {theme.layout.showFooter && <footer className="app-footer"><span>{translateMessage("webui.host.footer")}</span><span className="app-footer-zones"><ZoneItems zone="footer-status" /></span><span>{new Date().getFullYear()}</span></footer>}
    </div>
    <RouteSearch open={searchOpen} routes={accessibleRoutes} onClose={() => setSearchOpen(false)} />
    <ThemeDrawer open={themeOpen} theme={theme} onChange={setTheme} onReset={resetTheme} onClose={() => setThemeOpen(false)} />
    <ConfirmDialog open={logoutOpen} title={translateMessage("webui.host.logout.confirm.title")} description={translateMessage("webui.host.logout.confirm.detail")} confirmLabel={translateMessage("webui.host.logout.confirm.confirm")} cancelLabel={translateMessage("webui.host.logout.confirm.cancel")} closeLabel={translateMessage("webui.host.logout.confirm.close")} onConfirm={confirmLogout} onCancel={() => setLogoutOpen(false)} />
    <Toast open={logoutFailed} tone="danger" title={translateMessage("webui.host.logout.failed.title")} detail={translateMessage("webui.host.logout.failed.detail")} closeLabel={translateMessage("webui.host.logout.failed.close")} onClose={() => setLogoutFailed(false)} />
  </div>;
}