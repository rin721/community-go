import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent as ReactKeyboardEvent, type ReactNode, type RefObject } from "react";
import { Button, Menu, MenuItem, MenuTrigger, Popover } from "react-aria-components";
import { Ellipsis, History, Pin, PinOff, X } from "lucide-react";
import { translateMessage } from "../../i18n";
import type { WorkspaceID, WorkspaceTabView } from "../../workspace/registry";
import { tabDOMID } from "../../workspace/WorkspaceOutlet";

// WorkspaceTabsProps 是宿主标签栏的受控契约：不直接读 registry，全部经宿主回调。
type WorkspaceTabsProps = {
  tabs: WorkspaceTabView[];
  activeID?: WorkspaceID;
  canRestore: boolean;
  resolveTitle: (tab: WorkspaceTabView) => string;
  onActivateAndNavigate: (tab: WorkspaceTabView) => void;
  onClose: (id: WorkspaceID) => void;
  onCloseOthers: (anchorID: WorkspaceID) => void;
  onCloseRight: (anchorID: WorkspaceID) => void;
  onPin: (id: WorkspaceID) => void;
  onUnpin: (id: WorkspaceID) => void;
  onRestore: () => void;
  tablistRef?: RefObject<HTMLDivElement | null>;
};

export type { WorkspaceTabsProps };

// WorkspaceTabs 是由 090 Token 驱动的 36px 紧凑文本式标签栏：
// - tablist/tab/tabpanel 关联、aria-selected、roving focus、手动激活；
// - Left/Right、Home/End 移动焦点，Space/Enter 激活，Delete 关闭，Shift+F10 上下文菜单；
// - active 用底部指示线 + 文字强调，无 Card 外框；关闭按钮只在 hover/focus-within/active 显示；
// - pinned/dirty 同时使用图标与可访问名称，不只依赖颜色；
// - 空间不足进入尾部溢出菜单（RAC Menu），不换行、不静默淘汰。
export function WorkspaceTabs({ tabs, activeID, canRestore, resolveTitle, onActivateAndNavigate, onClose, onCloseOthers, onCloseRight, onPin, onUnpin, onRestore, tablistRef }: WorkspaceTabsProps) {
  const [focusedIndex, setFocusedIndex] = useState<number | undefined>(undefined);
  const [overflowVisible, setOverflowVisible] = useState(false);
  const [contextTarget, setContextTarget] = useState<WorkspaceTabView | undefined>();
  const railRef = useRef<HTMLDivElement>(null);

  // 焦点与活动状态同步：活动标签变化时焦点跟随；普通 route 激活（activeID 空）时
  // 焦点悬空，由用户显式操作（roving focus 手动激活模型）。
  useEffect(() => {
    if (!activeID) return;
    const index = tabs.findIndex((tab) => tab.id === activeID);
    if (index >= 0) setFocusedIndex(index);
  }, [activeID, tabs]);

  // 溢出测量：标签轨不换行，超出可见区的尾部标签进入溢出菜单（REQ-085-005）。
  useEffect(() => {
    const rail = railRef.current;
    if (!rail) return;
    const measure = () => {
      const items = Array.from(rail.querySelectorAll<HTMLElement>("[data-workspace-tab]"));
      const railRight = rail.clientWidth;
      let lastVisible = -1;
      for (let index = 0; index < items.length; index += 1) {
        if (items[index].offsetLeft + items[index].offsetWidth <= railRight) lastVisible = index;
        else break;
      }
      setOverflowVisible(lastVisible >= 0 && lastVisible < items.length - 1);
    };
    measure();
    // jsdom 等无 ResizeObserver 环境（组件测试）跳过动态测量，不伪造溢出状态。
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(measure);
    observer.observe(rail);
    return () => observer.disconnect();
  }, [tabs]);

  const moveFocus = useCallback((next: number | undefined) => {
    if (next === undefined || next < 0 || next >= tabs.length) return;
    setFocusedIndex(next);
    const target = railRef.current?.querySelectorAll<HTMLElement>('[role="tab"]')[next];
    target?.focus();
  }, [tabs.length]);

  const currentIndex = focusedIndex ?? tabs.findIndex((tab) => tab.id === activeID);

  const handleTablistKeyDown = useCallback((event: ReactKeyboardEvent<HTMLElement>) => {
    if (event.key === "ArrowRight") {
      event.preventDefault();
      moveFocus((currentIndex + 1) % tabs.length);
    } else if (event.key === "ArrowLeft") {
      event.preventDefault();
      moveFocus((currentIndex - 1 + tabs.length) % tabs.length);
    } else if (event.key === "Home") {
      event.preventDefault();
      moveFocus(0);
    } else if (event.key === "End") {
      event.preventDefault();
      moveFocus(tabs.length - 1);
    }
  }, [currentIndex, moveFocus, tabs.length]);

  const handleTabKeyDown = useCallback((event: ReactKeyboardEvent<HTMLButtonElement>, tab: WorkspaceTabView) => {
    if (event.key === " " || event.key === "Enter") {
      event.preventDefault();
      onActivateAndNavigate(tab);
      return;
    }
    if (event.key === "Delete") {
      event.preventDefault();
      onClose(tab.id);
      return;
    }
    if (event.key === "F10") {
      event.preventDefault();
      setContextTarget(tab);
      return;
    }
    if (event.key === "Escape") {
      setContextTarget(undefined);
    }
  }, [onActivateAndNavigate, onClose]);

  const overflowTabs = useMemo(() => {
    // 溢出清单只在真实存在被遮挡标签时提供；无法精确测量时（jsdom）不伪造。
    void overflowVisible;
    return overflowVisible && railRef.current ? collectOverflowTabs(railRef.current, tabs) : [];
  }, [overflowVisible, tabs]);

  const contextMenu = contextTarget ? (
    <WorkspaceContextMenu
      tab={contextTarget}
      canRestore={canRestore}
      onClose={() => setContextTarget(undefined)}
      onCloseOthers={onCloseOthers}
      onCloseRight={onCloseRight}
      onPin={onPin}
      onUnpin={onUnpin}
      onRestore={onRestore}
    />
  ) : null;

  return (
    <div className="workspace-tabs" role="tablist" aria-label={translateMessage("webui.host.workspace.tabs.label")} onKeyDown={handleTablistKeyDown} ref={tablistRef}>
      <div className="workspace-tab-rail" ref={railRef}>
        {tabs.map((tab, index) => {
          const active = tab.id === activeID;
          const focused = index === focusedIndex;
          const title = resolveTitle(tab);
          return (
            <div key={tab.id} data-workspace-tab className={`workspace-tab ${active ? "active" : ""} ${tab.pinned ? "pinned" : ""} ${tab.dirty ? "dirty" : ""}`}>
              <button
                type="button"
                role="tab"
                id={tabDOMID(tab.id)}
                aria-selected={active}
                aria-controls={`workspace-panel-${tab.id}`}
                tabIndex={focused ? 0 : -1}
                data-testid={`workspace-tab-${tab.routeID}`}
                onKeyDown={(event) => handleTabKeyDown(event, tab)}
                onClick={() => onActivateAndNavigate(tab)}
              >
                <span className="workspace-tab-label">{title}</span>
                {tab.pinned && <Pin size={12} className="workspace-tab-pin" aria-hidden="true" />}
                {tab.dirty && <span className="workspace-tab-dot" role="img" aria-label={translateMessage("webui.host.workspace.dirtyLabel")} />}
              </button>
              <button
                type="button"
                className="workspace-tab-close"
                aria-label={`${translateMessage("webui.host.workspace.close")} ${title}`}
                tabIndex={-1}
                onClick={() => onClose(tab.id)}
              >
                <X size={13} />
              </button>
            </div>
          );
        })}
      </div>
      {overflowTabs.length > 0 && (
        <div className="workspace-overflow">
          <MenuTrigger>
            <Button className="workspace-overflow-trigger rac-icon-only" aria-label={translateMessage("webui.host.workspace.overflow")}>
              <Ellipsis size={16} />
            </Button>
            <Popover className="rac-menu-popover" placement="bottom end">
              <Menu aria-label={translateMessage("webui.host.workspace.overflow")} onAction={(key) => { const tab = overflowTabs.find((candidate) => candidate.id === String(key)); if (tab) onActivateAndNavigate(tab); }} className="rac-menu">
                {overflowTabs.map((tab) => (
                  <MenuItem key={tab.id} id={tab.id} className="rac-menu-item">{resolveTitle(tab)}</MenuItem>
                ))}
              </Menu>
            </Popover>
          </MenuTrigger>
        </div>
      )}
      {contextMenu}
    </div>
  );
}

// collectOverflowTabs 返回真实被遮挡的尾部标签（测量失败时为空数组，不伪造溢出）。
function collectOverflowTabs(rail: HTMLElement, tabs: WorkspaceTabView[]): WorkspaceTabView[] {
  const items = Array.from(rail.querySelectorAll<HTMLElement>("[data-workspace-tab]"));
  const railRight = rail.clientWidth;
  const hidden: WorkspaceTabView[] = [];
  for (let index = 0; index < items.length; index += 1) {
    if (items[index].offsetLeft + items[index].offsetWidth > railRight) hidden.push(tabs[index]);
  }
  return hidden;
}

// WorkspaceContextMenu 是 Shift+F10/溢出的上下文菜单（复用 RAC menu item 视觉）。
function WorkspaceContextMenu({ tab, canRestore, onClose, onCloseOthers, onCloseRight, onPin, onUnpin, onRestore }: {
  tab: WorkspaceTabView;
  canRestore: boolean;
  onClose: () => void;
  onCloseOthers: (anchorID: WorkspaceID) => void;
  onCloseRight: (anchorID: WorkspaceID) => void;
  onPin: (id: WorkspaceID) => void;
  onUnpin: (id: WorkspaceID) => void;
  onRestore: () => void;
}) {
  const actions: Array<{ id: string; label: string; icon: ReactNode; disabled?: boolean; run: () => void }> = [
    { id: "pin", label: translateMessage(tab.pinned ? "webui.host.workspace.unpin" : "webui.host.workspace.pin"), icon: tab.pinned ? <PinOff size={15} /> : <Pin size={15} />, run: () => (tab.pinned ? onUnpin(tab.id) : onPin(tab.id)) },
    { id: "closeOthers", label: translateMessage("webui.host.workspace.closeOthers"), icon: <History size={15} />, run: () => onCloseOthers(tab.id) },
    { id: "closeRight", label: translateMessage("webui.host.workspace.closeRight"), icon: <History size={15} />, run: () => onCloseRight(tab.id) },
    { id: "restore", label: translateMessage("webui.host.workspace.restore"), icon: <History size={15} />, disabled: !canRestore, run: onRestore },
  ];
  return (
    <div className="workspace-context-menu" role="menu" aria-label={translateMessage("webui.host.workspace.tabs.label")} data-testid="workspace-context-menu" onKeyDown={(event) => { if (event.key === "Escape") onClose(); }}>
      {actions.map((action) => (
        <button key={action.id} type="button" role="menuitem" className="rac-menu-item" data-action={action.id} disabled={action.disabled} onClick={() => { action.run(); onClose(); }}>{action.icon}{action.label}</button>
      ))}
    </div>
  );
}
