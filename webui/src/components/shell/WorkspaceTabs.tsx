import { useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode, type RefObject } from "react";
import { ActionMenu, IconButton, Tabs, type ActionMenuItem, type TabsItem } from "@webui/sdk/ui";
import { Ellipsis, History, Pin, PinOff, X } from "lucide-react";
import { translateMessage } from "../../i18n";
import type { WorkspaceID, WorkspaceTabView } from "../../workspace/registry";
import { tabDOMID } from "../../workspace/WorkspaceOutlet";

type WorkspaceTabsProps = {
  tabs: WorkspaceTabView[]; activeID?: WorkspaceID; canRestore: boolean;
  resolveTitle: (tab: WorkspaceTabView) => string; onActivateAndNavigate: (tab: WorkspaceTabView) => void;
  onClose: (id: WorkspaceID) => void; onCloseOthers: (anchorID: WorkspaceID) => void; onCloseRight: (anchorID: WorkspaceID) => void;
  onPin: (id: WorkspaceID) => void; onUnpin: (id: WorkspaceID) => void; onRestore: () => void;
  tablistRef?: RefObject<HTMLDivElement | null>;
};

export type { WorkspaceTabsProps };

/** WorkspaceTabs 只保留工作区生命周期语义；tablist、roving focus 与菜单键盘交互由 SDK/RAC 承担。 */
export function WorkspaceTabs({ tabs, activeID, canRestore, resolveTitle, onActivateAndNavigate, onClose, onCloseOthers, onCloseRight, onPin, onUnpin, onRestore, tablistRef }: WorkspaceTabsProps) {
  const [overflowVisible, setOverflowVisible] = useState(false);
  const [contextTarget, setContextTarget] = useState<WorkspaceTabView>();
  const localRailRef = useRef<HTMLDivElement>(null);
  const railRef = tablistRef ?? localRailRef;

  useLayoutEffect(() => {
    const rail = railRef.current;
    if (!rail) return;
    const measure = () => {
      const elements = Array.from(rail.querySelectorAll<HTMLElement>("[data-workspace-tab]"));
      setOverflowVisible(elements.some((item) => item.offsetLeft + item.offsetWidth > rail.clientWidth));
    };
    measure();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(measure); observer.observe(rail); return () => observer.disconnect();
  }, [railRef, tabs]);

  useEffect(() => {
    const rail = railRef.current;
    if (!rail) return;
    const onKeyDown = (event: KeyboardEvent) => {
      const element = (event.target as HTMLElement).closest<HTMLElement>("[data-workspace-id]");
      const tab = tabs.find((candidate) => candidate.id === element?.dataset.workspaceId);
      if (!element || !tab) return;
      const all = Array.from(rail.querySelectorAll<HTMLElement>("[data-workspace-id]"));
      const index = all.indexOf(element);
      if (["ArrowRight", "ArrowLeft", "Home", "End"].includes(event.key)) {
        event.preventDefault(); event.stopPropagation();
        const next = event.key === "Home" ? 0 : event.key === "End" ? all.length - 1 : (index + (event.key === "ArrowRight" ? 1 : -1) + all.length) % all.length;
        all[next]?.focus();
      } else if (event.key === "Delete") { event.preventDefault(); onClose(tab.id); }
      else if (event.key === "F10") { event.preventDefault(); setContextTarget(tab); }
      else if (event.key === "Escape") setContextTarget(undefined);
    };
    rail.addEventListener("keydown", onKeyDown, true);
    return () => rail.removeEventListener("keydown", onKeyDown, true);
  }, [onClose, railRef, tabs]);

  useLayoutEffect(() => {
    railRef.current?.querySelectorAll<HTMLElement>("[data-workspace-id]").forEach((element) => {
      const id = element.dataset.workspaceId;
      if (id) { element.id = tabDOMID(id); element.setAttribute("aria-controls", `workspace-panel-${id}`); }
    });
  }, [railRef, tabs]);

  const items = useMemo<ReadonlyArray<TabsItem>>(() => tabs.map((tab) => {
    const title = resolveTitle(tab);
    return {
      id: tabDOMID(tab.id), content: null,
      className: `${tab.id === activeID ? "active" : ""} ${tab.pinned ? "pinned" : ""} ${tab.dirty ? "dirty" : ""}`.trim(),
      data: { "data-workspace-tab": "true", "data-workspace-id": tab.id, "data-testid": `workspace-tab-${tab.routeID}`, "aria-controls": `workspace-panel-${tab.id}` },
      label: <><span className="workspace-tab-label">{title}</span>{tab.pinned && <Pin size={12} className="workspace-tab-pin" aria-hidden="true" />}{tab.dirty && <span className="workspace-tab-dot" role="img" aria-label={translateMessage("webui.host.workspace.dirtyLabel")} />}<IconButton className="workspace-tab-close" label={`${translateMessage("webui.host.workspace.close")} ${title}`} onClick={() => onClose(tab.id)}><X size={13} /></IconButton></>,
    };
  }), [activeID, onClose, resolveTitle, tabs]);

  const overflowTabs = overflowVisible && railRef.current ? collectOverflowTabs(railRef.current, tabs) : [];
  const overflowItems: ActionMenuItem[] = overflowTabs.map((tab) => ({ id: tab.id, label: resolveTitle(tab) }));
  return <div className="workspace-tabs">
    <Tabs label={translateMessage("webui.host.workspace.tabs.label")} selectedKey={activeID ? tabDOMID(activeID) : undefined} items={items} onSelectionChange={(key) => { const tab = tabs.find((candidate) => tabDOMID(candidate.id) === key); if (tab) onActivateAndNavigate(tab); }} listClassName="workspace-tab-rail" tabClassName="workspace-tab" listRef={railRef} renderPanels={false} />
    {overflowItems.length > 0 && <div className="workspace-overflow"><ActionMenu label={translateMessage("webui.host.workspace.overflow")} trigger={<Ellipsis size={16} />} triggerClassName="workspace-overflow-trigger rac-icon-only" placement="bottom end" items={overflowItems} onAction={(id) => { const tab = overflowTabs.find((candidate) => candidate.id === id); if (tab) onActivateAndNavigate(tab); }} /></div>}
    {contextTarget && <WorkspaceContextMenu tab={contextTarget} canRestore={canRestore} onClose={() => setContextTarget(undefined)} onCloseOthers={onCloseOthers} onCloseRight={onCloseRight} onPin={onPin} onUnpin={onUnpin} onRestore={onRestore} />}
  </div>;
}

function collectOverflowTabs(rail: HTMLElement, tabs: WorkspaceTabView[]): WorkspaceTabView[] {
  const items = Array.from(rail.querySelectorAll<HTMLElement>("[data-workspace-tab]"));
  return tabs.filter((_, index) => items[index] && items[index].offsetLeft + items[index].offsetWidth > rail.clientWidth);
}

function WorkspaceContextMenu({ tab, canRestore, onClose, onCloseOthers, onCloseRight, onPin, onUnpin, onRestore }: { tab: WorkspaceTabView; canRestore: boolean; onClose: () => void; onCloseOthers: (anchorID: WorkspaceID) => void; onCloseRight: (anchorID: WorkspaceID) => void; onPin: (id: WorkspaceID) => void; onUnpin: (id: WorkspaceID) => void; onRestore: () => void }) {
  const actions: ReadonlyArray<{ id: string; label: string; icon: ReactNode; disabled?: boolean; run: () => void }> = [
    { id: "pin", label: translateMessage(tab.pinned ? "webui.host.workspace.unpin" : "webui.host.workspace.pin"), icon: tab.pinned ? <PinOff size={15} /> : <Pin size={15} />, run: () => (tab.pinned ? onUnpin(tab.id) : onPin(tab.id)) },
    { id: "closeOthers", label: translateMessage("webui.host.workspace.closeOthers"), icon: <History size={15} />, run: () => onCloseOthers(tab.id) },
    { id: "closeRight", label: translateMessage("webui.host.workspace.closeRight"), icon: <History size={15} />, run: () => onCloseRight(tab.id) },
    { id: "restore", label: translateMessage("webui.host.workspace.restore"), icon: <History size={15} />, disabled: !canRestore, run: onRestore },
  ];
  return <ActionMenu label={translateMessage("webui.host.workspace.tabs.label")} trigger={<span />} triggerClassName="workspace-context-menu-anchor" isOpen onOpenChange={(open) => { if (!open) onClose(); }} items={actions.map((action) => ({ id: action.id, label: <>{action.icon}{action.label}</>, disabled: action.disabled, data: { "data-action": action.id } }))} onAction={(id) => { const action = actions.find((item) => item.id === id); if (action) { action.run(); onClose(); } }} />;
}
