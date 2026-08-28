import { describe, expect, it } from "vitest";
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

function openInput(routeID: string, path = `/${routeID}`, overrides: Partial<OpenWorkspaceInput> = {}): OpenWorkspaceInput {
  return { routeID, path, location: { pathname: path, search: "" }, ...overrides };
}

function runOpen(state: WorkspaceState, input: OpenWorkspaceInput) {
  return workspaceReducer(state, { type: "open", input });
}

describe("WorkspaceRegistry 打开与身份（Rev.2：全路由自动标签）", () => {
  it("任意正式路由都可打开：静态路由按 routeID 去重，重复访问只激活", () => {
    const first = runOpen(emptyWorkspaceState(), openInput("ops.dashboard", "/dashboard"));
    if (first.outcome.kind !== "opened" || first.outcome.activated) throw new Error("首次打开应创建");
    expect(first.state.open).toHaveLength(1);

    const second = runOpen(first.state, openInput("ops.dashboard", "/dashboard"));
    if (second.outcome.kind !== "opened" || !second.outcome.activated) throw new Error("重复打开应只激活");
    expect(second.state.open).toHaveLength(1);
  });

  it("不同路由创建独立标签", () => {
    const a = runOpen(emptyWorkspaceState(), openInput("iam.accounts", "/admin/accounts"));
    const b = runOpen(a.state, openInput("settings.profile", "/settings/profile"));
    expect(b.state.open.map((tab) => tab.id)).toEqual([
      createWorkspaceID("iam.accounts"),
      createWorkspaceID("settings.profile"),
    ]);
  });

  it("动态详情按 contextKey 生成独立标签；同实体去重（Rev.2 动态详情）", () => {
    const first = runOpen(emptyWorkspaceState(), openInput("accounts.detail", "/accounts/detail/a", { contextKey: "entity-a" }));
    const same = runOpen(first.state, openInput("accounts.detail", "/accounts/detail/a", { contextKey: "entity-a" }));
    if (same.outcome.kind !== "opened" || !same.outcome.activated) throw new Error("同实体应去重激活");
    expect(same.state.open).toHaveLength(1);
    const other = runOpen(first.state, openInput("accounts.detail", "/accounts/detail/b", { contextKey: "entity-b" }));
    expect(other.state.open).toHaveLength(2);
    expect(other.state.open.map((tab) => tab.id)).toEqual([
      createWorkspaceID("accounts.detail", "entity-a"),
      createWorkspaceID("accounts.detail", "entity-b"),
    ]);
  });

  it("达到 12 上限后拒绝第 13 个且不静默淘汰", () => {
    let state = emptyWorkspaceState();
    for (let index = 0; index < MAX_OPEN_WORKSPACES; index += 1) {
      state = runOpen(state, openInput(`route.${index}`, `/route/${index}`)).state;
    }
    expect(state.open).toHaveLength(MAX_OPEN_WORKSPACES);
    const rejected = runOpen(state, openInput("route.overflow", "/route/overflow"));
    expect(rejected.outcome).toMatchObject({ kind: "rejected", code: "workspace_cap_exceeded" });
    expect(rejected.state.open).toHaveLength(MAX_OPEN_WORKSPACES);
  });
});

describe("WorkspaceRegistry Dashboard 固定首页", () => {
  it("default route 打开即 fixedHome + pinned；不可关闭、不可取消固定", () => {
    let state = runOpen(emptyWorkspaceState(), openInput("ops.dashboard", "/dashboard", { isDefaultHome: true })).state;
    expect(state.open[0].fixedHome).toBe(true);
    expect(state.open[0].pinned).toBe(true);

    const unpinned = workspaceReducer(state, { type: "unpin", id: createWorkspaceID("ops.dashboard") });
    expect(unpinned.state.open[0].pinned).toBe(true);

    const closed = workspaceReducer(state, { type: "close", ids: [createWorkspaceID("ops.dashboard")] });
    expect(closed.outcome).toMatchObject({ kind: "rejected", code: "workspace_pinned_requires_unpin" });
    expect(closed.state.open).toHaveLength(1);

    // closeOthers/closeRight 不波及 fixedHome 首页。
    state = runOpen(state, openInput("iam.accounts", "/admin/accounts")).state;
    const others = workspaceReducer(state, { type: "closeOthers", anchorID: createWorkspaceID("iam.accounts") });
    // closeOthers 保留 anchor（iam.accounts），dashboard 为 fixedHome 亦保留。
    expect(others.state.open.map((tab) => tab.id)).toEqual([createWorkspaceID("ops.dashboard"), createWorkspaceID("iam.accounts")]);
    const right = workspaceReducer(state, { type: "closeRight", anchorID: createWorkspaceID("ops.dashboard") });
    expect(right.state.open.map((tab) => tab.id)).toEqual([createWorkspaceID("ops.dashboard")]);
  });

  it("非 default 路由不是 fixedHome", () => {
    const state = runOpen(emptyWorkspaceState(), openInput("iam.accounts", "/admin/accounts")).state;
    expect(state.open[0].fixedHome).toBe(false);
    expect(state.open[0].pinned).toBe(false);
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
    const unpinned = workspaceReducer(pinned.state, { type: "unpin", id: createWorkspaceID("route.c") });
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

  it("closeOthers 保留 anchor 且不关闭 pinned", () => {
    let state = threeTabs();
    state = workspaceReducer(state, { type: "pin", id: createWorkspaceID("route.b") }).state;
    const closed = workspaceReducer(state, { type: "closeOthers", anchorID: createWorkspaceID("route.c") });
    expect(closed.outcome).toMatchObject({ kind: "closed" });
    expect(closed.state.open.map((tab) => tab.id)).toEqual([createWorkspaceID("route.b"), createWorkspaceID("route.c")]);
  });

  it("closeRight 只关闭 anchor 右侧且不关闭 pinned", () => {
    let state = threeTabs();
    state = workspaceReducer(state, { type: "pin", id: createWorkspaceID("route.b") }).state;
    const closed = workspaceReducer(state, { type: "closeRight", anchorID: createWorkspaceID("route.a") });
    expect(closed.state.open.map((tab) => tab.id)).toEqual([createWorkspaceID("route.b"), createWorkspaceID("route.a")]);
  });

  it("dirty 标签未经确认不得关闭；confirmed 后才关闭", () => {
    const state = runOpen(emptyWorkspaceState(), openInput("route.a")).state;
    const dirty = workspaceReducer(state, { type: "setDirty", id: createWorkspaceID("route.a"), dirty: true }).state;
    const blocked = workspaceReducer(dirty, { type: "close", ids: [createWorkspaceID("route.a")] });
    expect(blocked.outcome).toMatchObject({ kind: "rejected", code: "workspace_dirty_requires_confirmation" });
    expect(blocked.state.open).toHaveLength(1);
    const confirmed = workspaceReducer(dirty, { type: "close", ids: [createWorkspaceID("route.a")], confirmed: true });
    expect(confirmed.state.open).toHaveLength(0);
  });

  it("单个关闭 pinned 标签先要求 unpin", () => {
    const state = runOpen(emptyWorkspaceState(), openInput("route.a")).state;
    const pinned = workspaceReducer(state, { type: "pin", id: createWorkspaceID("route.a") }).state;
    const blocked = workspaceReducer(pinned, { type: "close", ids: [createWorkspaceID("route.a")] });
    expect(blocked.outcome).toMatchObject({ kind: "rejected", code: "workspace_pinned_requires_unpin" });
  });

  it("批量关闭原子性：任一 dirty 未确认则全部保留", () => {
    let state = threeTabs();
    state = workspaceReducer(state, { type: "setDirty", id: createWorkspaceID("route.b"), dirty: true }).state;
    const blocked = workspaceReducer(state, { type: "closeOthers", anchorID: createWorkspaceID("route.c") });
    expect(blocked.outcome).toMatchObject({ kind: "rejected", code: "workspace_dirty_requires_confirmation" });
    expect(blocked.state.open).toHaveLength(3);
  });

  it("关闭活动标签后焦点落到右邻居，否则左邻居，最后为空", () => {
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
      const opened = runOpen(state, openInput(`route.${index}`, `/route/${index}`));
      state = opened.state;
      ids.push(createWorkspaceID(`route.${index}`));
    }
    const closed = workspaceReducer(state, { type: "close", ids });
    expect(closed.state.closed).toHaveLength(MAX_CLOSED_HISTORY);
    expect(closed.state.closed[0].id).toBe(ids[ids.length - 1]);
    expect(closed.state.closed[closed.state.closed.length - 1].id).toBe(ids[2]);
  });
});

describe("WorkspaceRegistry 恢复最近关闭", () => {
  it("restore 恢复最近关闭的干净元数据并激活（不恢复 dirty）", () => {
    const opened = runOpen(emptyWorkspaceState(), openInput("route.a")).state;
    const dirty = workspaceReducer(opened, { type: "setDirty", id: createWorkspaceID("route.a"), dirty: true }).state;
    const closed = workspaceReducer(dirty, { type: "close", ids: [createWorkspaceID("route.a")], confirmed: true }).state;
    const restored = workspaceReducer(closed, { type: "restore" });
    expect(restored.outcome).toMatchObject({ kind: "restored" });
    expect(restored.state.open[0].dirty).toBe(false);
    expect(restored.state.open[0].pinned).toBe(false);
  });

  it("关闭栈为空时 restore 拒绝", () => {
    const result = workspaceReducer(emptyWorkspaceState(), { type: "restore" });
    expect(result.outcome).toMatchObject({ kind: "rejected", code: "workspace_closed_empty" });
  });
});

describe("WorkspaceRegistry 对账与派生视图", () => {
  it("reconcile 丢弃已撤权/已删除 route 的打开与关闭标签", () => {
    let state = runOpen(emptyWorkspaceState(), openInput("route.a")).state;
    state = runOpen(state, openInput("route.b")).state;
    state = runOpen(state, openInput("route.c")).state;
    state = workspaceReducer(state, { type: "close", ids: [createWorkspaceID("route.c")] }).state;
    const result = workspaceReducer(state, { type: "reconcile", valid: (routeID) => routeID === "route.a" });
    expect(result.state.open.map((tab) => tab.id)).toEqual([createWorkspaceID("route.a")]);
    expect(result.state.closed).toHaveLength(0);
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