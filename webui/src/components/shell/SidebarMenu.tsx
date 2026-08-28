import { ChevronDown } from "lucide-react";
import { Link } from "react-router-dom";
import { Tooltip as RACTooltip, TooltipTrigger } from "react-aria-components";
import type { ManifestMenu, ManifestRoute } from "@webui/sdk/runtime";
import { translateMessage } from "../../i18n";
import { iconComponent } from "../../icon-catalog";

// SidebarMenuEntry 是宿主菜单树节点：item 是 Manifest 声明，route 是已通过 access/availability 门禁的路由。
export type SidebarMenuEntry = { item: ManifestMenu; route: ManifestRoute; children: SidebarMenuEntry[] };

// buildMenuTree 把扁平菜单声明按 parentId 组装成稳定递归树；无法匹配的节点归入根。
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

// findMenuAncestors 返回当前 route 所属的祖先菜单 id 链；若父级自身承载默认
// route，也保留该父级以确保其兄弟入口可见。
export function findMenuAncestors(entries: SidebarMenuEntry[], routeID?: string): string[] {
  for (const entry of entries) {
    // 顶级菜单可能同时承载默认 route 与子菜单（例如 IAM 组默认打开账号）。
    // 当前 route 命中这种父级时仍需展开它，否则用户会看不到同组的后续入口。
    if (entry.route.id === routeID) return entry.children.length > 0 ? [entry.item.id] : [];
    const childAncestors = findMenuAncestors(entry.children, routeID);
    if (childAncestors.length > 0 || entry.children.some((child) => child.route.id === routeID)) return [entry.item.id, ...childAncestors];
  }
  return [];
}

// menuContainsRoute 判断节点或其后代是否承载当前 route，用于 active 祖先的高亮。
export function menuContainsRoute(entry: SidebarMenuEntry, routeID?: string): boolean {
  return entry.route.id === routeID || entry.children.some((child) => menuContainsRoute(child, routeID));
}

// MenuIcon 按受控图标目录渲染菜单图标；未知 iconId（目录外或模块被移除）回退占位，
// 不扩散任意图标字符串（062 ICON 目录契约）。
export function MenuIcon({ iconID }: { iconID: string }) {
  const Icon = iconComponent(iconID);
  if (!Icon) return <span className="menu-icon-fallback" />;
  return <Icon size={18} />;
}

// SidebarMenu 递归渲染菜单树。子菜单容器常驻 DOM（grid row + opacity 表达 open/closed），
// closed subtree 通过 inert/aria-hidden 移出焦点与可访问树，避免隐藏链接进入键盘路径。
// collapsed 时链接文字隐藏，经 RAC Tooltip 提供标题（069 HeroUI/RAC 拼装）。
export function SidebarMenu({ entries, currentRouteID, expandedMenuIDs, collapsed = false, onToggle, level = 0 }: { entries: SidebarMenuEntry[]; currentRouteID?: string; expandedMenuIDs: Set<string>; collapsed?: boolean; onToggle: (menuID: string) => void; level?: number }) {
  return <>{entries.map((entry) => {
    const hasChildren = entry.children.length > 0;
    const expanded = expandedMenuIDs.has(entry.item.id);
    const active = menuContainsRoute(entry, currentRouteID);
    const label = translateMessage(entry.item.titleMessageId);
    const link = <Link to={entry.route.path} title={label} aria-label={label} className={entry.route.id === currentRouteID ? "sidebar-link active" : "sidebar-link"} style={{ paddingLeft: `calc(var(--menu-indent-base) + ${level} * var(--menu-indent-step))` }}><MenuIcon iconID={entry.item.iconId} /><span aria-hidden="true">{label}</span></Link>;
    return <div className="sidebar-menu-group" key={entry.item.id}><div className={active ? "sidebar-entry active" : "sidebar-entry"}>{collapsed ? <TooltipTrigger>{link}<RACTooltip className="rac-tooltip">{label}</RACTooltip></TooltipTrigger> : link}{hasChildren && <button className="sidebar-group-toggle" onClick={() => onToggle(entry.item.id)} aria-expanded={expanded} aria-label={translateMessage(expanded ? "webui.host.menu.collapse" : "webui.host.menu.expand")}><ChevronDown size={14} /></button>}</div>{hasChildren && <div className={`sidebar-submenu${expanded ? " open" : ""}`} aria-hidden={!expanded} inert={!expanded}><div className="sidebar-submenu-inner"><SidebarMenu entries={entry.children} currentRouteID={currentRouteID} expandedMenuIDs={expandedMenuIDs} collapsed={collapsed} onToggle={onToggle} level={level + 1} /></div></div>}</div>;
  })}</>;
}
