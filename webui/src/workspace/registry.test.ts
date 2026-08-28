import { describe, expect, it } from "vitest";
import type { WorkspaceTabPolicy } from "../contracts";
import {
  createWorkspaceID,
  dirtyWorkspaceCount,
  emptyWorkspaceState,
  hasDirtyWorkspace,
  MAX_CLOSED_HISTORY,
  MAX_OPEN_WORKSPACES,
  workspaceReducer,
  type OpenWorkspaceInput,
  type WorkspaceState,
} from "./registry";

const singleton = (restorable = true): WorkspaceTabPolicy => ({ mode: "singleton", restorable });
const contextual = (restorable = false): WorkspaceTabPolicy => ({ mode: "contextual", restorable });

function openInput(routeID: string, overrides: Partial<OpenWorkspaceInput> = {}): OpenWorkspaceInput {
  return { routeID, policy: singleton(), location: { pathname: `/${routeID}`, search: "" }, ...overrides };
}

function runOpen(state: WorkspaceState, input: OpenWorkspaceInput) {
  return workspaceReducer(state, { type: "open", input });
}

describe("WorkspaceRegistry 打开与身份", () => {
  it("singleton 首开创建标签并激活；重复打开只激活不重复（REQ-085-001/002）", () => {
    const first = runOpen(emptyWorkspaceState(), openInput("openapi.workspace"));
    if (first.outcome.kind !== "opened" || first.outcome.activated) throw new Error("首次打开应创建");
    expect(first.state.open).toHaveLength(1);

    const second = runOpen(first.state, openInput("openapi.workspace"));
    if (second.outcome.kind !== "opened" || !second.outcome.activated) throw new Error("重复打开应只激活");
    expect(second.state.open).toHaveLength(1);
  });

  it("不同 route 的 singleton 创建独立标签；ID 派生自 route ID", () => {
    const a = runOpen(emptyWorkspaceState(), openInput("route.a"));
    const b = runOpen(a.state, openInput("route.b"));
    expect(b.state.open.map((tab) => tab.id)).toEqual([createWorkspaceID("route.a"), createWorkspaceID("route.b")]);
  });

  it("contextual 缺 contextID 拒绝创建且不回落 route ID（REQ-085-002）", () => {
    const result = runOpen(emptyWorkspaceState(), openInput("docs", { policy: contextual() }));
    expect(result.outcome).toMatchObject({ kind: "rejected", code: "workspace_context_missing" });
    expect(result.state.open).toHaveLength(0);
  });

  it("contextual 同 context 去重、不同 context 分离", () => {
    const first = runOpen(emptyWorkspaceState(), openInput("docs", { policy: contextual(), contextID: "ctx-1" }));
    const same = runOpen(first.state, openInput("docs", { policy: contextual(), contextID: "ctx-1" }));
    if (same.outcome.kind !== "opened" || !same.outcome.activated) throw new Error("同 context 应去重激活");
    expect(same.state.open).toHaveLength(1);
    const other = runOpen(first.state, openInput("docs", { policy: contextual(), contextID: "ctx-2" }));
    expect(other.state.open).toHaveLength(2);
    expect(other.state.open.map((tab) => tab.id)).toEqual([
      createWorkspaceID("docs", "ctx-1"),
      createWorkspaceID("docs", "ctx-2"),
    ]);
  });

  it("disabled policy 拒绝创建", () => {
    const result = runOpen(emptyWorkspaceState(), openInput("plain", { policy: { mode: "disabled" } }));
    expect(result.outcome).toMatchObject({ kind: "rejected", code: "workspace_invalid_policy" });
  });

  it("达到 12 上限后拒绝第 13 个且不静默淘汰（REQ-085-005）", () => {
    let state = emptyWorkspaceState();
    for (let index = 0; index < MAX_OPEN_WORKSPACES; index += 1) {
      state = runOpen(state, openInput(`route.${index}`)).state;
    }
    expect(state.open).toHaveLength(MAX_OPEN_WORKSPACES);
    const rejected = runOpen(state, openInput("route.overflow"));
    expect(rejected.outcome).toMatchObject({ kind: "rejected", code: "workspace_cap_exceeded" });
    expect(rejected.state.open).toHaveLength(MAX_OPEN_WORKSPACES);
  });
});

describe("WorkspaceRegistry 激活/取消激活", () => {
  it("activate 激活已打开标签；unknown 拒绝", () => {
    const opened = runOpen(emptyWorkspaceState(), openInput("route.a")).state;
    const activated = workspaceReducer(opened, { type: "activate", id: createWorkspaceID("route.a") });
    expect(activated.state.activeWorkspaceID).toBe(createWorkspaceID("route.a"));
    const missing = workspaceReducer(opened, { type: "activate", id: "missing" });
    expect(missing.outcome).toMatchObject({ kind: "rejected", code: "workspace_not_found" });
  });

  it("deactivate 清空活动工作区但保留标签（普通 route 激活）", () => {
    const opened = runOpen(emptyWorkspaceState(), openInput("route.a")).state;
    const deactivated = workspaceReducer(opened, { type: "deactivate" });
    expect(deactivated.state.activeWorkspaceID).toBeUndefined();
    expect(deactivated.state.open).toHaveLength(1);
  });
});

describe("WorkspaceRegistry 固定/取消固定", () => {
  it("pin 把标签移到分组前部并保持分组内相对顺序；unpin 还原", () => {
    let state = runOpen(emptyWorkspaceState(), openInput("route.a")).state;
    state = runOpen(state, openInput("route.b")).state;
    state = runOpen(state, openInput("route.c")).state;
    const pinned = workspaceReducer(state, { type: "pin", id: createWorkspaceID("route.c") });
    expect(pinned.state.open.map((tab) => tab.id)).toEqual([
      createWorkspaceID("route.c"),
      createWorkspaceID("route.a"),
      createWorkspaceID("route.b"),
    ]);
    const rePinned = workspaceReducer(pinned.state, { type: "pin", id: createWorkspaceID("route.a") });
    expect(rePinned.state.open.map((tab) => tab.id)).toEqual([
      createWorkspaceID("route.c"),
      createWorkspaceID("route.a"),
      createWorkspaceID("route.b"),
    ]);
    const unpinned = workspaceReducer(rePinned.state, { type: "unpin", id: createWorkspaceID("route.c") });
    expect(unpinned.state.open.map((tab) => tab.id)).toEqual([
      createWorkspaceID("route.a"),
      createWorkspaceID("route.b"),
      createWorkspaceID("route.c"),
    ]);
  });
});

describe("WorkspaceRegistry 关闭与批量原子性", () => {
  function threeTabs() {
    let state = runOpen(emptyWorkspaceState(), openInput("route.a")).state;
    state = runOpen(state, openInput("route.b")).state;
    return runOpen(state, openInput("route.c")).state;
  }

  it("closeOthers 保留 anchor 且不关闭 pinned（REQ-085-004）", () => {
    let state = threeTabs();
    state = workspaceReducer(state, { type: "pin", id: createWorkspaceID("route.b") }).state;
    const closed = workspaceReducer(state, { type: "closeOthers", anchorID: createWorkspaceID("route.c") });
    expect(closed.outcome).toMatchObject({ kind: "closed" });
    expect(closed.state.open.map((tab) => tab.id)).toEqual([createWorkspaceID("route.b"), createWorkspaceID("route.c")]);
  });

  it("closeRight 只关闭 anchor 右侧且不关闭 pinned（REQ-085-004）", () => {
    let state = threeTabs();
    state = workspaceReducer(state, { type: "pin", id: createWorkspaceID("route.b") }).state;
    // 顺序：route.b(pinned) route.a route.c；anchor=route.a，右侧只有 route.c。
    const closed = workspaceReducer(state, { type: "closeRight", anchorID: createWorkspaceID("route.a") });
    expect(closed.state.open.map((tab) => tab.id)).toEqual([createWorkspaceID("route.b"), createWorkspaceID("route.a")]);
  });

  it("dirty 标签未经确认不得关闭；confirmed 后才关闭（REQ-085-004）", () => {
    const state = runOpen(emptyWorkspaceState(), openInput("route.a")).state;
    const dirty = workspaceReducer(state, { type: "setDirty", id: createWorkspaceID("route.a"), dirty: true }).state;
    const blocked = workspaceReducer(dirty, { type: "close", ids: [createWorkspaceID("route.a")] });
    expect(blocked.outcome).toMatchObject({ kind: "rejected", code: "workspace_dirty_requires_confirmation" });
    expect(blocked.state.open).toHaveLength(1);
    const confirmed = workspaceReducer(dirty, { type: "close", ids: [createWorkspaceID("route.a")], confirmed: true });
    expect(confirmed.state.open).toHaveLength(0);
  });

  it("单个关闭 pinned 标签先要求 unpin（REQ-085-004）", () => {
    const state = runOpen(emptyWorkspaceState(), openInput("route.a")).state;
    const pinned = workspaceReducer(state, { type: "pin", id: createWorkspaceID("route.a") }).state;
    const blocked = workspaceReducer(pinned, { type: "close", ids: [createWorkspaceID("route.a")] });
    expect(blocked.outcome).toMatchObject({ kind: "rejected", code: "workspace_pinned_requires_unpin" });
  });

  it("批量关闭原子性：任一 dirty 未确认则全部保留（REQ-085-004/006）", () => {
    let state = threeTabs();
    state = workspaceReducer(state, { type: "setDirty", id: createWorkspaceID("route.b"), dirty: true }).state;
    const blocked = workspaceReducer(state, { type: "closeOthers", anchorID: createWorkspaceID("route.c") });
    expect(blocked.outcome).toMatchObject({ kind: "rejected", code: "workspace_dirty_requires_confirmation" });
    expect(blocked.state.open).toHaveLength(3);
  });

  it("关闭活动标签后焦点落到右邻居，否则左邻居，最后为空（REQ-085-010）", () => {
    let state = threeTabs();
    state = workspaceReducer(state, { type: "activate", id: createWorkspaceID("route.a") }).state;
    const closedMiddle = workspaceReducer(state, { type: "close", ids: [createWorkspaceID("route.a")] });
    expect(closedMiddle.outcome).toMatchObject({ kind: "closed", activatedID: createWorkspaceID("route.b") });

    let right = threeTabs();
    right = workspaceReducer(right, { type: "activate", id: createWorkspaceID("route.c") }).state;
    const closedRight = workspaceReducer(right, { type: "close", ids: [createWorkspaceID("route.c")] });
    expect(closedRight.outcome).toMatchObject({ kind: "closed", activatedID: createWorkspaceID("route.b") });

    let last = runOpen(emptyWorkspaceState(), openInput("route.a")).state;
    last = workspaceReducer(last, { type: "activate", id: createWorkspaceID("route.a") }).state;
    const closedLast = workspaceReducer(last, { type: "close", ids: [createWorkspaceID("route.a")] });
    expect(closedLast.outcome).toMatchObject({ kind: "closed", activatedID: undefined });
  });

  it("最近关闭栈上限 10", () => {
    let state = emptyWorkspaceState();
    const ids: string[] = [];
    for (let index = 0; index < MAX_OPEN_WORKSPACES; index += 1) {
      const opened = runOpen(state, openInput(`route.${index}`));
      state = opened.state;
      ids.push(createWorkspaceID(`route.${index}`));
    }
    if (state.open.length !== MAX_OPEN_WORKSPACES || ids.length !== MAX_OPEN_WORKSPACES) {
      throw new Error("测试前置：应恰好打开 12 个标签");
    }
    // 批量关闭全部 12 个，历史上限 10：最早打开的两个被淘汰。
    const closed = workspaceReducer(state, { type: "close", ids });
    expect(closed.outcome).toMatchObject({ kind: "closed" });
    expect(closed.state.closed).toHaveLength(MAX_CLOSED_HISTORY);
    // 同批次按打开顺序逆序入栈：route.11 是最新关闭，route.2 是最早保留的。
    expect(closed.state.closed[0].id).toBe(ids[ids.length - 1]);
    expect(closed.state.closed[closed.state.closed.length - 1].id).toBe(ids[2]);
  });
});

describe("WorkspaceRegistry 恢复最近关闭", () => {
  it("restore 恢复最近关闭的干净元数据并激活（不恢复 dirty）（REQ-085-004）", () => {
    const opened = runOpen(emptyWorkspaceState(), openInput("route.a")).state;
    const dirty = workspaceReducer(opened, { type: "setDirty", id: createWorkspaceID("route.a"), dirty: true }).state;
    const closed = workspaceReducer(dirty, { type: "close", ids: [createWorkspaceID("route.a")], confirmed: true }).state;
    expect(closed.open).toHaveLength(0);
    const restored = workspaceReducer(closed, { type: "restore" });
    expect(restored.outcome).toMatchObject({ kind: "restored" });
    expect(restored.state.open).toHaveLength(1);
    expect(restored.state.activeWorkspaceID).toBe(createWorkspaceID("route.a"));
    expect(restored.state.open[0].dirty).toBe(false);
    expect(restored.state.open[0].pinned).toBe(false);
  });

  it("关闭栈为空时 restore 拒绝", () => {
    const result = workspaceReducer(emptyWorkspaceState(), { type: "restore" });
    expect(result.outcome).toMatchObject({ kind: "rejected", code: "workspace_closed_empty" });
  });
});

describe("WorkspaceRegistry 对账与派生视图", () => {
  it("reconcile 丢弃已撤权/已删除 route 的打开与关闭标签（REQ-085-009）", () => {
    let state = runOpen(emptyWorkspaceState(), openInput("route.a")).state;
    state = runOpen(state, openInput("route.b")).state;
    state = runOpen(state, openInput("route.c")).state;
    state = workspaceReducer(state, { type: "close", ids: [createWorkspaceID("route.c")] }).state;
    const result = workspaceReducer(state, { type: "reconcile", valid: (routeID) => routeID === "route.a" });
    expect(result.state.open.map((tab) => tab.id)).toEqual([createWorkspaceID("route.a")]);
    expect(result.state.closed).toHaveLength(0);
  });

  it("reconcile 移除被丢活动标签后活动游标落到剩余标签", () => {
    let state = runOpen(emptyWorkspaceState(), openInput("route.a")).state;
    state = runOpen(state, openInput("route.b")).state;
    state = workspaceReducer(state, { type: "activate", id: createWorkspaceID("route.b") }).state;
    const result = workspaceReducer(state, { type: "reconcile", valid: (routeID) => routeID === "route.a" });
    expect(result.state.activeWorkspaceID).toBe(createWorkspaceID("route.a"));
    expect(result.state.open).toHaveLength(1);
  });

  it("setDirty 未打开标签返回 not_found", () => {
    const result = workspaceReducer(emptyWorkspaceState(), { type: "setDirty", id: "missing", dirty: true });
    expect(result.outcome).toMatchObject({ kind: "rejected", code: "workspace_not_found" });
  });

  it("dirty 计数与存在性派生视图正确", () => {
    let state = runOpen(emptyWorkspaceState(), openInput("route.a")).state;
    state = runOpen(state, openInput("route.b")).state;
    state = workspaceReducer(state, { type: "setDirty", id: createWorkspaceID("route.b"), dirty: true }).state;
    expect(hasDirtyWorkspace(state)).toBe(true);
    expect(dirtyWorkspaceCount(state)).toBe(1);
  });
});