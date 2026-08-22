import { RefreshCw, X } from "lucide-react";
import type { KeyboardEvent as ReactKeyboardEvent } from "react";
import type { ManifestRoute } from "@webui/sdk/runtime";
import { translateMessage } from "../../i18n";

// isWorkspaceTabClosable 判定默认首页不可关闭，其余业务页签可关闭。
export function isWorkspaceTabClosable(route: ManifestRoute): boolean {
  return !route.default;
}

export function workspaceTabID(routeID: string): string {
  return `webui-workspace-tab-${routeID}`;
}

// getWorkspaceTabTargetIndex 实现 workspace tabs 的 roving keyboard 导航目标。
export function getWorkspaceTabTargetIndex(key: string, currentIndex: number, count: number): number | undefined {
  if (count <= 0) return undefined;
  if (key === "Home") return 0;
  if (key === "End") return count - 1;
  if (key === "ArrowRight") return (currentIndex + 1) % count;
  if (key === "ArrowLeft") return (currentIndex - 1 + count) % count;
  return undefined;
}

// WorkspaceTabs 展示已访问业务路由页签；键盘导航目标由宿主通过 onNavigate/onKeyDown 协调。
export function WorkspaceTabs({ routes, currentRouteID, panelLabel, onNavigate, onCloseTab, onRefresh, onKeyDown }: {
  routes: ManifestRoute[];
  currentRouteID?: string;
  panelLabel: string;
  onNavigate: (path: string) => void;
  onCloseTab: (route: ManifestRoute) => void;
  onRefresh: () => void;
  onKeyDown: (event: ReactKeyboardEvent<HTMLButtonElement>, index: number) => void;
}) {
  return <div className="workspace-tabs"><div className="workspace-tab-scroll" role="tablist" aria-label={panelLabel}>{routes.map((route, index) => {
    const active = route.id === currentRouteID;
    const closable = isWorkspaceTabClosable(route);
    return <div className={active ? "workspace-tab active" : "workspace-tab"} key={route.id}><button id={workspaceTabID(route.id)} type="button" role="tab" tabIndex={active ? 0 : -1} aria-selected={active} aria-controls="webui-workspace-panel" className="workspace-tab-trigger" onClick={() => onNavigate(route.path)} onKeyDown={(event) => onKeyDown(event, index)}><span className="tab-dot" />{translateMessage(route.titleMessageId)}</button>{closable && <button type="button" className="tab-close" onClick={() => onCloseTab(route)} aria-label={translateMessage("webui.host.tabs.close")}><X size={13} /></button>}</div>;
  })}</div><div className="workspace-tab-actions"><button type="button" className="icon-button" onClick={onRefresh} aria-label={translateMessage("webui.host.tabs.refresh")} title={translateMessage("webui.host.tabs.refresh")}><RefreshCw size={16} /></button></div></div>;
}