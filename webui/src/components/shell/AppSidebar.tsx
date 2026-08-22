import { X } from "lucide-react";
import type { KeyboardEvent as ReactKeyboardEvent, RefObject } from "react";
import { translateMessage } from "../../i18n";
import { ZoneItems } from "../../zone/ZoneItems";
import { SidebarMenu, type SidebarMenuEntry } from "./SidebarMenu";

// shouldIsolateMobileSidebar 决定移动视口下已关闭抽屉是否进入 inert/aria-hidden（避免隐藏内容进入焦点顺序）。
export function shouldIsolateMobileSidebar(isMobileViewport: boolean, mobileOpen: boolean): boolean {
  return isMobileViewport && !mobileOpen;
}

// AppSidebar 承载品牌、递归菜单与 revision 元信息；移动端抽屉的开关、焦点与 inert 由宿主协调。
export function AppSidebar({ sidebarRef, mobileOpen, isMobileViewport, menu, currentRouteID, expandedMenuIDs, onToggleMenu, onClose, onKeyDown, revision }: {
  sidebarRef: RefObject<HTMLElement | null>;
  mobileOpen: boolean;
  isMobileViewport: boolean;
  menu: SidebarMenuEntry[];
  currentRouteID?: string;
  expandedMenuIDs: Set<string>;
  onToggleMenu: (menuID: string) => void;
  onClose: () => void;
  onKeyDown: (event: ReactKeyboardEvent<HTMLElement>) => void;
  revision: string;
}) {
  const isolated = shouldIsolateMobileSidebar(isMobileViewport, mobileOpen);
  return <aside ref={sidebarRef} className={`app-sidebar ${mobileOpen ? "mobile-open" : ""}`} aria-hidden={isolated} inert={isolated} onKeyDown={onKeyDown}>
    <div className="brand-row"><span className="brand-mark">{translateMessage("webui.host.brandSymbol")}</span><span className="brand-copy"><strong>{translateMessage("webui.host.brand")}</strong><small>{translateMessage("webui.host.product")}</small></span><button type="button" data-mobile-initial-focus className="mobile-sidebar-close" onClick={onClose} aria-label={translateMessage("webui.host.menu.close")}><X size={18} /></button></div>
    <nav className="sidebar-nav"><SidebarMenu entries={menu} currentRouteID={currentRouteID} expandedMenuIDs={expandedMenuIDs} onToggle={onToggleMenu} /></nav>
    <div className="sidebar-zones"><ZoneItems zone="sidebar-panels" /></div>
    <div className="sidebar-meta"><span>{translateMessage("webui.host.revision.label")}</span><code>{revision.slice(0, 8)}</code></div>
  </aside>;
}