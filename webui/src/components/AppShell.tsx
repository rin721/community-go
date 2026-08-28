import { useEffect, useCallback, useMemo, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { Languages, Moon, Palette, Sun } from "lucide-react";
import type { Manifest, ManifestRoute, PrincipalView } from "@webui/sdk/runtime";
import { useWebUITranslation } from "@webui/sdk/i18n";
import { ConfirmDialog, IconButton, Toast } from "@webui/sdk/ui";
import { changeLanguage, ensureRouteLocale, getAvailableLanguages, languageLabelMessageID, translateMessage } from "../i18n";
import { effectiveReduceMotion, useThemePreferences, type ThemePreferences } from "../theme";
import { ScrollExperience } from "../scroll/ScrollExperience";
import { ContentViewport, type ContentWidth } from "./ContentViewport";
import { RouteSearch } from "./RouteSearch";
import { ThemeDrawer } from "./ThemeDrawer";
import { AppSidebar, shouldIsolateMobileSidebar } from "./shell/AppSidebar";
import { AppHeader } from "./shell/AppHeader";
import { buildMenuTree, findMenuAncestors, type SidebarMenuEntry } from "./shell/SidebarMenu";
import { WorkspaceTabs } from "./shell/WorkspaceTabs";
import { WorkspaceOutlet } from "../workspace/WorkspaceOutlet";
import { useWorkspaceHost, workspaceLocationOf } from "../workspace/WorkspaceProvider";
import type { WorkspaceTabView } from "../workspace/registry";
import { buildRouteCommands, projectActionCommands, type CommandDefinition } from "../commands/registry";

export { buildMenuTree, findMenuAncestors, shouldIsolateMobileSidebar };
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
  const host = useWorkspaceHost();
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
  const currentRoute: ManifestRoute | undefined = manifest.routes.find((route) => route.path === location.pathname);
  // 普通 Outlet 也必须沿用 Settings 的宽度语义；此前该页面在 mounted workspace
  // 中由 WorkspaceOutlet 选择 settings，087 收回普通 Outlet 后由宿主补齐同一档位。
  const pageWidth: ContentWidth = currentRoute?.path.startsWith("/settings/") ? "settings" : "wide";
  // 087：只有 route 显式声明 singleton workspace 才由宿主导航打开/激活标签；
  // 普通页面（包括 Settings 分区与 Accounts 列表）始终走普通 Router Outlet。
  // contextual workspace 必须由模块以稳定 contextID 显式打开，不能由 pathname 猜测。
  const hostRef = useRef(host);
  hostRef.current = host;
  useEffect(() => {
    if (!currentRoute) return;
    if (currentRoute.workspaceTab?.mode === "singleton") {
      hostRef.current.openWorkspace({
        routeID: currentRoute.id,
        policy: currentRoute.workspaceTab,
        location: workspaceLocationOf(location.pathname, location.search),
      });
      return;
    }
    // contextual workspace 只能由显式 openContextual 建立；通过已有标签导航时保留
    // 活动面板，手动进入没有对应 workspace 的 contextual route 则回到普通 Outlet。
    const active = hostRef.current.activeTab;
    if (currentRoute.workspaceTab?.mode === "contextual"
      && active?.routeID === currentRoute.id
      && active.location.pathname === location.pathname) return;
    // disabled、未加载或被门禁拒绝的路由不生成标签，清空活动标签。
    hostRef.current.deactivateWorkspace();
  }, [currentRoute, location.pathname, location.search]);
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

  const toggleFullscreen = () => document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen();
  const toggleSidebar = () => { const next = !collapsed; setCollapsed(next); setTheme({ ...theme, layout: { ...theme.layout, sidebarCollapsed: next } }); };
  const toggleColorScheme = () => setTheme({ ...theme, mode: theme.mode === "dark" ? "light" : "dark" });
  const confirmLogout = () => {
    setLogoutOpen(false);
    void onLogout().catch(() => setLogoutFailed(true));
  };
  const commandRegistry = useMemo<CommandDefinition[]>(() => projectActionCommands([
    { id: "action:theme", kind: "action", titleMessageId: "webui.host.theme", keywords: ["theme", "主题"], execute: () => setThemeOpen(true) },
    { id: "action:theme-mode", kind: "action", titleMessageId: "webui.host.theme.toggle", keywords: ["theme", "dark", "light", "主题", "深色", "浅色"], execute: toggleColorScheme },
    { id: "action:logout", kind: "action", titleMessageId: "webui.host.logout", keywords: ["logout", "sign out", "退出", "注销"], dangerous: true, execute: () => setLogoutOpen(true) },
  ], manifest.actionPermissions), [manifest.actionPermissions, theme]);
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

  return <div className={`app-shell ${collapsed ? "sidebar-collapsed" : ""}`}>
    <button type="button" className={`mobile-backdrop ${mobileOpen ? "visible" : ""}`} onClick={() => setMobileOpen(false)} aria-label={translateMessage("webui.host.menu.close")} disabled={!mobileOpen} tabIndex={mobileOpen ? 0 : -1} />
    <AppSidebar sidebarRef={mobileSidebarRef} mobileOpen={mobileOpen} isMobileViewport={isMobileViewport} collapsed={collapsed} menu={menu} currentRouteID={currentRoute?.id} expandedMenuIDs={expandedMenuIDs} onToggleMenu={(menuID) => setExpandedMenuIDs((current) => { const next = new Set(current); next.has(menuID) ? next.delete(menuID) : next.add(menuID); return next; })} onClose={() => setMobileOpen(false)} onKeyDown={handleMobileSidebarKeyDown} revision={manifest.catalogRevision} principal={principal} />
    <div className="app-workspace">
      <AppHeader collapsed={collapsed} onToggleSidebar={toggleSidebar} mobileMenuButtonRef={mobileMenuButtonRef} onOpenMobileMenu={() => setMobileOpen(true)} showBreadcrumb={theme.layout.showBreadcrumb} currentRoute={currentRoute} pathname={location.pathname} hostLanguage={hostI18n.language} availableLanguages={availableLanguages} onLanguageChange={(language) => void changeLanguage(language)} theme={theme} onToggleColorScheme={toggleColorScheme} onOpenTheme={() => setThemeOpen(true)} onOpenSearch={() => setSearchOpen(true)} onToggleFullscreen={toggleFullscreen} principal={principal} onRequestLogout={() => setLogoutOpen(true)} />
      <WorkspaceArea manifest={manifest} navigate={navigate} theme={theme} reducedMotion={effectiveReduceMotion(theme.reduceMotion)} pageWidth={pageWidth} />
    </div>
    <RouteSearch open={searchOpen} routes={accessibleRoutes} commands={[...commandRegistry, ...buildRouteCommands(accessibleRoutes)]} onClose={() => setSearchOpen(false)} />
    <ThemeDrawer open={themeOpen} theme={theme} onChange={setTheme} onReset={resetTheme} onClose={() => setThemeOpen(false)} />
    <ConfirmDialog open={logoutOpen} title={translateMessage("webui.host.logout.confirm.title")} description={translateMessage("webui.host.logout.confirm.detail")} confirmLabel={translateMessage("webui.host.logout.confirm.confirm")} cancelLabel={translateMessage("webui.host.logout.confirm.cancel")} closeLabel={translateMessage("webui.host.logout.confirm.close")} onConfirm={confirmLogout} onCancel={() => setLogoutOpen(false)} />
    <Toast open={logoutFailed} tone="danger" title={translateMessage("webui.host.logout.failed.title")} detail={translateMessage("webui.host.logout.failed.detail")} closeLabel={translateMessage("webui.host.logout.failed.close")} onClose={() => setLogoutFailed(false)} />
  </div>;
}

// WorkspaceArea 是 087 主内容区分流：显式 workspace 使用标签栏与 mounted panels；
// 普通 route 不激活 workspace 时只渲染唯一的 Router Outlet。隐藏 workspace panel
// 保留真实工作状态，但普通页面不会因为访问历史进入标签栏。
function WorkspaceArea({ manifest, navigate, theme, reducedMotion, pageWidth }: { manifest: Manifest; navigate: (path: string) => void; theme: ThemePreferences; reducedMotion: boolean; pageWidth: ContentWidth }) {
  const host = useWorkspaceHost();
  const activeWorkspace = host.activeTab;
  const resolveTitle = useCallback((tab: WorkspaceTabView) => host.resolveTabTitle(tab), [host]);

  const activateAndNavigate = useCallback((tab: WorkspaceTabView) => {
    host.activateWorkspace(tab.id);
    const search = tab.location?.search ?? "";
    navigate(`${tab.location?.pathname ?? ""}${search}`);
  }, [host, navigate]);

  return (
    <div className="workspace-content">
      {host.tabs.length > 0 && <WorkspaceTabs
        tabs={host.tabs}
        activeID={host.state.activeWorkspaceID}
        canRestore={host.state.closed.length > 0}
        resolveTitle={resolveTitle}
        onActivateAndNavigate={activateAndNavigate}
        onClose={host.requestCloseWorkspace}
        onCloseOthers={host.requestCloseOthers}
        onCloseRight={host.requestCloseRight}
        onPin={host.pinWorkspace}
        onUnpin={host.unpinWorkspace}
        onRestore={host.requestRestoreClosed}
      />}
      <div className="workspace-content-stage">
        <WorkspaceOutlet manifest={manifest} theme={theme.experience} reducedMotion={reducedMotion} />
        {!activeWorkspace && <ContentViewport pageWidth={pageWidth} experience={theme.experience} reducedMotion={reducedMotion} panelProps={{ id: "webui-workspace-panel" }}><Outlet /></ContentViewport>}
      </div>
    </div>
  );
}
