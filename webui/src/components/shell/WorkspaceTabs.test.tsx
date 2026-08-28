// @vitest-environment jsdom
import { beforeAll, describe, expect, it } from "vitest";
import { act, createElement } from "react";

// 启用 React act 环境（jsdom 测试主动调度），与 repo 既有 renderClient 用法一致。
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
import { MemoryRouter } from "react-router-dom";
import { renderClient } from "../../test-utils";
import { WorkspaceTabs, type WorkspaceTabsProps } from "./WorkspaceTabs";
import { initializeI18n } from "../../i18n";
import { createWorkspaceID, workspaceReducer, type WorkspaceState } from "../../workspace/registry";

function tabState(routeIDs: string[], activeIndex = 0): WorkspaceState {
  let state: WorkspaceState = { open: [], closed: [], activeWorkspaceID: undefined };
  for (const routeID of routeIDs) {
    state = workspaceReducer(state, { type: "open", input: { routeID, policy: { mode: "singleton", restorable: false }, location: { pathname: `/${routeID}`, search: "" } } }).state;
  }
  const activeID = createWorkspaceID(routeIDs[activeIndex]);
  return workspaceReducer(state, { type: "activate", id: activeID }).state;
}

function renderTabs(state: WorkspaceState, overrides: Partial<Omit<WorkspaceTabsProps, "tabs" | "activeID" | "resolveTitle">> = {}) {
  const calls = { move: [] as string[], close: [] as string[], closeOthers: [] as string[], closeRight: [] as string[], pin: [] as string[], unpin: [] as string[], restore: 0 };
  const props: WorkspaceTabsProps = {
    tabs: state.open.map((tab) => ({ ...tab, active: tab.id === state.activeWorkspaceID })),
    activeID: state.activeWorkspaceID,
    canRestore: state.closed.length > 0,
    resolveTitle: (tab) => tab.routeID,
    onActivateAndNavigate: (tab) => { calls.move.push(tab.id); },
    onClose: (id) => calls.close.push(id),
    onCloseOthers: (id) => calls.closeOthers.push(id),
    onCloseRight: (id) => calls.closeRight.push(id),
    onPin: (id) => calls.pin.push(id),
    onUnpin: (id) => calls.unpin.push(id),
    onRestore: () => { calls.restore += 1; },
    ...overrides,
  };
  const rendered = renderClient(createElementWithRouter(props));
  return { calls, ...rendered };
}

function createElementWithRouter(props: WorkspaceTabsProps) {
  return createElement(MemoryRouter, null, createElement(WorkspaceTabs, props));
}

describe("WorkspaceTabs 呈现与键盘（REQ-085-003/010）", () => {
  beforeAll(async () => {
    await initializeI18n();
  });

  it("渲染 tablist/tab 关联、aria-selected 与唯一活动标签", () => {
    const state = tabState(["route.a", "route.b", "route.c"], 1);
    const { host } = renderTabs(state);
    expect(host.querySelector('[role="tablist"]')).not.toBeNull();
    const tabs = Array.from(host.querySelectorAll('[role="tab"]'));
    expect(tabs).toHaveLength(3);
    expect(tabs[0].getAttribute("aria-selected")).toBe("false");
    expect(tabs[1].getAttribute("aria-selected")).toBe("true");
    expect(tabs[0].getAttribute("aria-controls")).toBe(`workspace-panel-${createWorkspaceID("route.a")}`);
  });

  it("Space/Enter 手动激活并导航；Delete 请求关闭", () => {
    const state = tabState(["route.a", "route.b"]);
    const { host, calls } = renderTabs(state);
    const [first, second] = Array.from(host.querySelectorAll('[role="tab"]')) as HTMLButtonElement[];
    act(() => { second.dispatchEvent(new KeyboardEvent("keydown", { key: " ", bubbles: true })); });
    expect(calls.move).toEqual([createWorkspaceID("route.b")]);
    act(() => { first.dispatchEvent(new KeyboardEvent("keydown", { key: "Delete", bubbles: true })); });
    expect(calls.close).toEqual([createWorkspaceID("route.a")]);
  });

  it("Left/Right/Home/End 移动 roving focus，不切换活动标签（手动激活模型）", () => {
    const state = tabState(["route.a", "route.b", "route.c"], 0);
    const { host, calls } = renderTabs(state);
    const [first, second, third] = Array.from(host.querySelectorAll('[role="tab"]')) as HTMLButtonElement[];
    act(() => { first.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true })); });
    expect(document.activeElement).toBe(second);
    expect(calls.move).toEqual([]);
    act(() => { second.dispatchEvent(new KeyboardEvent("keydown", { key: "End", bubbles: true })); });
    expect(document.activeElement).toBe(third);
    act(() => { third.dispatchEvent(new KeyboardEvent("keydown", { key: "Home", bubbles: true })); });
    expect(document.activeElement).toBe(first);
    act(() => { first.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowLeft", bubbles: true })); });
    expect(document.activeElement).toBe(third);
  });

  it("pinned 与 dirty 同时有图标语义与可访问名称（不只依赖颜色）", () => {
    let state = tabState(["route.a"]);
    state = workspaceReducer(state, { type: "pin", id: createWorkspaceID("route.a") }).state;
    state = workspaceReducer(state, { type: "setDirty", id: createWorkspaceID("route.a"), dirty: true }).state;
    const { host } = renderTabs(state);
    const dirtyDot = host.querySelector(".workspace-tab-dot");
    expect(dirtyDot?.getAttribute("aria-label")).toBeTruthy();
    expect(host.querySelector(".workspace-tab-pin")).not.toBeNull();
  });

  it("Shift+F10 打开上下文菜单并提供固定/关闭其他/关闭右侧/恢复动作", () => {
    const state = tabState(["route.a", "route.b"]);
    const { host, calls } = renderTabs(state);
    const [first] = Array.from(host.querySelectorAll('[role="tab"]')) as HTMLButtonElement[];
    act(() => { first.dispatchEvent(new KeyboardEvent("keydown", { key: "F10", shiftKey: true, bubbles: true })); });
    expect(host.querySelector('[role="menu"]')).not.toBeNull();
    const items = Array.from(host.querySelectorAll('[role="menuitem"]'));
    expect(items.length).toBeGreaterThanOrEqual(4);
    // 触发「关闭其他」动作（data-action 稳定定位，不依赖文案）。
    const closeOthersItem = items.find((item) => item.getAttribute("data-action") === "closeOthers");
    expect(closeOthersItem).toBeTruthy();
    act(() => { closeOthersItem?.dispatchEvent(new MouseEvent("click", { bubbles: true })); });
    expect(calls.closeOthers).toEqual([createWorkspaceID("route.a")]);
  });

  it("关闭按钮默认不可见语义由样式控制；DOM 仍可按需可达", () => {
    const state = tabState(["route.a"]);
    const { host } = renderTabs(state);
    const closeButton = host.querySelector<HTMLButtonElement>(".workspace-tab-close");
    expect(closeButton).not.toBeNull();
    expect(closeButton?.getAttribute("aria-label")).toBeTruthy();
  });

});
