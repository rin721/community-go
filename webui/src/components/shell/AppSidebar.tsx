import { X } from "lucide-react";
import { Avatar, IconButton } from "@webui/sdk/ui";
import type { KeyboardEvent as ReactKeyboardEvent, RefObject } from "react";
import type { PrincipalView } from "@webui/sdk/runtime";
import { translateMessage } from "../../i18n";
import { ZoneItems } from "../../zone/ZoneItems";
import { SidebarMenu, type SidebarMenuEntry } from "./SidebarMenu";

// shouldIsolateMobileSidebar 决定移动视口下已关闭抽屉是否进入 inert/aria-hidden（避免隐藏内容进入焦点顺序）。
export function shouldIsolateMobileSidebar(isMobileViewport: boolean, mobileOpen: boolean): boolean {
  return isMobileViewport && !mobileOpen;
}

// AppSidebar 承载品牌（HeroUI Avatar）、递归菜单与 revision 元信息；移动端抽屉的开关、
// 焦点与 inert 由宿主协调；collapsed 时叶子菜单经由 RAC Tooltip 展示标题。
export function AppSidebar({ sidebarRef, mobileOpen, isMobileViewport, collapsed, menu, currentRouteID, expandedMenuIDs, onToggleMenu, onClose, onKeyDown, revision, principal }: {
  sidebarRef: RefObject<HTMLElement | null>;
  mobileOpen: boolean;
  isMobileViewport: boolean;
  collapsed: boolean;
  menu: SidebarMenuEntry[];
  currentRouteID?: string;
  expandedMenuIDs: Set<string>;
  onToggleMenu: (menuID: string) => void;
  onClose: () => void;
  onKeyDown: (event: ReactKeyboardEvent<HTMLElement>) => void;
  revision: string;
  principal?: PrincipalView;
}) {
  const isolated = shouldIsolateMobileSidebar(isMobileViewport, mobileOpen);
  const accountLabel = principal?.username ?? translateMessage("webui.host.account");
  return <aside ref={sidebarRef} className={`app-sidebar ${mobileOpen ? "mobile-open" : ""}`} aria-hidden={isolated} inert={isolated} onKeyDown={onKeyDown}>
    <div className="brand-row"><Avatar size="sm" className="brand-avatar" fallback={translateMessage("webui.host.brandSymbol")} /><span className="brand-copy"><strong>{translateMessage("webui.host.brand")}</strong><small>{translateMessage("webui.host.product")}</small></span><IconButton label={translateMessage("webui.host.menu.close")} className="mobile-sidebar-close" onClick={onClose} data={{ "data-mobile-initial-focus": "true" }}><X size={18} /></IconButton></div>
    <nav className="sidebar-nav"><SidebarMenu entries={menu} currentRouteID={currentRouteID} expandedMenuIDs={expandedMenuIDs} collapsed={collapsed} onToggle={onToggleMenu} /></nav>
    <div className="sidebar-zones"><ZoneItems zone="sidebar-panels" /></div>
    <div className="sidebar-account" aria-label={translateMessage("webui.host.account")}>
      <Avatar size="sm" className="sidebar-account-avatar" fallback={accountLabel.slice(0, 1).toUpperCase()} />
      <span className="sidebar-account-copy"><strong>{accountLabel}</strong><small>{principal ? `#${principal.id.slice(0, 8)}` : translateMessage("webui.host.account")}</small></span>
    </div>
    <div className="sidebar-meta"><span>{translateMessage("webui.host.revision.label")}</span><code>{revision.slice(0, 8)}</code></div>
  </aside>;
}
