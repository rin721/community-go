// 085 Rev.2：WorkspaceRegistry 函数式状态机（自动页面标签模型）。
// 本模块是标签状态的唯一 owner：所有打开/激活/固定/关闭/恢复/对账/持久化
// 必须经过这里的纯函数，宿主与 UI 只消费状态视图和窄会话，不自行维护标签集合。
// 标签资格不再由 route 显式声明：宿主对每个正式路由自动 open/activate。

export const MAX_OPEN_WORKSPACES = 12;
export const MAX_CLOSED_HISTORY = 10;

// WorkspaceID 只由工厂 createWorkspaceID 创建，不接受页面拼接。
export type WorkspaceID = string;

// WorkspaceLocation 是打开标签页时固定的挂载位置（panel 渲染依据，不再跟随导航）。
export type WorkspaceLocation = { pathname: string; search: string };

// WorkspaceDescriptor 是标签页的宿主元数据：不含表单值、凭据、响应 body 或任意 query。
export type WorkspaceDescriptor = {
  id: WorkspaceID;
  routeID: string;
  // contextKey 是动态详情按实体隔离的相等性键（只用于去重，不直接显示）；
  // 静态路由（pathname === route.path）不携带。
  contextKey?: string;
  // restoreKey 是低敏持久化键；由宿主从 location 派生（允许恢复的实体路径/allowlist search）。
  restoreKey?: string;
  location: WorkspaceLocation;
  pinned: boolean;
  // fixedHome 表示这是 Dashboard 固定首页标签：pinned 且不可关闭、不可取消固定。
  fixedHome: boolean;
  dirty: boolean;
  openedAt: number;
};

export type WorkspaceState = {
  // open 保持 pinned（fixedHome 优先）在前、unpinned 在后的有序数组；分组内相对顺序稳定。
  open: WorkspaceDescriptor[];
  // closed 是最近关闭栈（最近在前），上限 MAX_CLOSED_HISTORY。
  closed: WorkspaceDescriptor[];
  // activeWorkspaceID 为空表示暂无可展示面板（如 blank 布局/首次渲染）。
  activeWorkspaceID?: WorkspaceID;
};

// OpenWorkspaceInput 是宿主 open 动作的完整参数。任何正式路由都可打开
// （Rev.2：不再要求 policy 声明）；contextKey 供动态详情按实体生成独立标签。
export type OpenWorkspaceInput = {
  routeID: string;
  path: string;
  location: WorkspaceLocation;
  // contextKey 是动态详情实体键：同 route 不同 contextKey 生成独立标签；
  // 静态导航不传，同 route 按 routeID 去重激活。
  contextKey?: string;
  // isDefaultHome 表示该 route 是 Dashboard 固定首页：打开即 fixedHome。
  isDefaultHome?: boolean;
  // restoreKey 是低敏持久化键（host 从 location 派生）。
  restoreKey?: string;
  openedAt?: number;
};

export type WorkspaceOutcome =
  | { kind: "ok" }
  | { kind: "opened"; id: WorkspaceID; activated: boolean }
  | { kind: "closed"; activatedID?: WorkspaceID }
  | { kind: "restored"; id: WorkspaceID }
  | { kind: "rejected"; code: WorkspaceRejectedCode };

export type WorkspaceRejectedCode =
  | "workspace_cap_exceeded"
  | "workspace_not_found"
  | "workspace_pinned_requires_unpin"
  | "workspace_dirty_requires_confirmation"
  | "workspace_closed_empty";

export type WorkspaceTransition = { state: WorkspaceState; outcome: WorkspaceOutcome };

export type WorkspaceAction =
  | { type: "open"; input: OpenWorkspaceInput }
  | { type: "activate"; id: WorkspaceID }
  | { type: "deactivate" }
  | { type: "pin"; id: WorkspaceID }
  | { type: "unpin"; id: WorkspaceID }
  | { type: "close"; ids: WorkspaceID[]; confirmed?: boolean }
  | { type: "closeOthers"; anchorID: WorkspaceID; confirmed?: boolean }
  | { type: "closeRight"; anchorID: WorkspaceID; confirmed?: boolean }
  | { type: "restore" }
  | { type: "setDirty"; id: WorkspaceID; dirty: boolean }
  | { type: "reconcile"; valid: (routeID: string) => boolean }
  | { type: "replace"; state: WorkspaceState }
  // hydrate 把持久化快照的已打开标签并入当前状态：与导航效果可能已打开的标签按
  // ID 去重合并，绝不整体替换（否则恢复完成前打开的标签会被清掉）。
  | { type: "hydrate"; open: WorkspaceDescriptor[]; closed: WorkspaceDescriptor[] };

export function emptyWorkspaceState(): WorkspaceState {
  return { open: [], closed: [], activeWorkspaceID: undefined };
}

// createWorkspaceID 是 ID 唯一工厂：静态路由按 routeID 编码（去重/激活），
// 动态详情按 routeID + contextKey 编码（按实体独立）。返回值只用于相等性。
export function createWorkspaceID(routeID: string, contextKey?: string): WorkspaceID {
  return contextKey ? `ws:d:${routeID}:${contextKey}` : `ws:r:${routeID}`;
}

function outcomeRejected(code: WorkspaceRejectedCode): WorkspaceOutcome {
  return { kind: "rejected", code };
}

// workspaceReducer 是 registry 的唯一 state owner；宿主不得绕过它修改状态。
export function workspaceReducer(state: WorkspaceState, action: WorkspaceAction): WorkspaceTransition {
  switch (action.type) {
    case "open": {
      const id = createWorkspaceID(action.input.routeID, action.input.contextKey);
      const existing = state.open.find((tab) => tab.id === id);
      if (existing) {
        // 同一页面已打开：只激活，不重复创建（静态路由去重/动态详情同实体去重）。
        return { state: withActive(state, id), outcome: { kind: "opened", id, activated: true } };
      }
      if (state.open.length >= MAX_OPEN_WORKSPACES) {
        return { state, outcome: outcomeRejected("workspace_cap_exceeded") };
      }
      const descriptor: WorkspaceDescriptor = {
        id,
        routeID: action.input.routeID,
        contextKey: action.input.contextKey,
        restoreKey: action.input.restoreKey,
        location: action.input.location,
        // Dashboard 固定首页：打开即 fixedHome + pinned。
        pinned: action.input.isDefaultHome === true,
        fixedHome: action.input.isDefaultHome === true,
        dirty: false,
        openedAt: action.input.openedAt ?? Date.now(),
      };
      return { state: withActive({ ...state, open: [...state.open, descriptor] }, id), outcome: { kind: "opened", id, activated: false } };
    }
    case "activate": {
      if (!state.open.some((tab) => tab.id === action.id)) {
        return { state, outcome: outcomeRejected("workspace_not_found") };
      }
      return { state: withActive(state, action.id), outcome: { kind: "ok" } };
    }
    case "deactivate":
      // 已是空活动状态时返回原引用，避免 effect 驱动的重复 dispatch 造成循环 re-render。
      return state.activeWorkspaceID === undefined
        ? { state, outcome: { kind: "ok" } }
        : { state: { ...state, activeWorkspaceID: undefined }, outcome: { kind: "ok" } };
    case "pin": {
      const next = reorderByPin(state, action.id, true);
      return next ? { state: next, outcome: { kind: "ok" } } : { state, outcome: outcomeRejected("workspace_not_found") };
    }
    case "unpin": {
      // fixedHome（Dashboard 首页）不可取消固定。
      const target = state.open.find((tab) => tab.id === action.id);
      if (!target) return { state, outcome: outcomeRejected("workspace_not_found") };
      if (target.fixedHome) return { state, outcome: { kind: "ok" } };
      const next = reorderByPin(state, action.id, false);
      return next ? { state: next, outcome: { kind: "ok" } } : { state, outcome: { kind: "ok" } };
    }
    case "close": {
      const targets = action.ids;
      if (targets.length === 0) return { state, outcome: { kind: "ok" } };
      const missing = targets.filter((id) => !state.open.some((tab) => tab.id === id));
      if (missing.length > 0) return { state, outcome: outcomeRejected("workspace_not_found") };
      // fixedHome（Dashboard 首页）不可关闭。
      const fixed = targets.filter((id) => state.open.find((tab) => tab.id === id)?.fixedHome);
      if (fixed.length > 0) return { state, outcome: outcomeRejected("workspace_pinned_requires_unpin") };
      const pinned = targets.filter((id) => state.open.find((tab) => tab.id === id)?.pinned);
      if (pinned.length > 0) return { state, outcome: outcomeRejected("workspace_pinned_requires_unpin") };
      const dirty = targets.filter((id) => state.open.find((tab) => tab.id === id)?.dirty);
      if (dirty.length > 0 && !action.confirmed) {
        return { state, outcome: outcomeRejected("workspace_dirty_requires_confirmation") };
      }
      return { state: commitClose(state, targets), outcome: { kind: "closed", activatedID: nextActiveAfterClose(state, targets) } };
    }
    case "closeOthers": {
      const anchor = state.open.find((tab) => tab.id === action.anchorID);
      if (!anchor) return { state, outcome: outcomeRejected("workspace_not_found") };
      const targets = state.open.filter((tab) => tab.id !== action.anchorID && !tab.pinned && !tab.fixedHome).map((tab) => tab.id);
      if (targets.length === 0) return { state, outcome: { kind: "ok" } };
      const dirty = targets.filter((id) => state.open.find((tab) => tab.id === id)?.dirty);
      if (dirty.length > 0 && !action.confirmed) {
        return { state, outcome: outcomeRejected("workspace_dirty_requires_confirmation") };
      }
      return { state: commitClose(state, targets), outcome: { kind: "closed", activatedID: nextActiveAfterClose(state, targets) } };
    }
    case "closeRight": {
      const anchorIndex = state.open.findIndex((tab) => tab.id === action.anchorID);
      if (anchorIndex < 0) return { state, outcome: outcomeRejected("workspace_not_found") };
      const targets = state.open.slice(anchorIndex + 1).filter((tab) => !tab.pinned && !tab.fixedHome).map((tab) => tab.id);
      if (targets.length === 0) return { state, outcome: { kind: "ok" } };
      const dirty = targets.filter((id) => state.open.find((tab) => tab.id === id)?.dirty);
      if (dirty.length > 0 && !action.confirmed) {
        return { state, outcome: outcomeRejected("workspace_dirty_requires_confirmation") };
      }
      return { state: commitClose(state, targets), outcome: { kind: "closed", activatedID: nextActiveAfterClose(state, targets) } };
    }
    case "restore": {
      const candidate = state.closed[0];
      if (!candidate) return { state, outcome: outcomeRejected("workspace_closed_empty") };
      if (state.open.length >= MAX_OPEN_WORKSPACES) {
        return { state, outcome: outcomeRejected("workspace_cap_exceeded") };
      }
      const restored: WorkspaceDescriptor = { ...candidate, dirty: false, pinned: false, openedAt: Date.now() };
      const nextClosed = state.closed.slice(1);
      const next = withActive({ ...state, open: [...state.open, restored], closed: nextClosed }, restored.id);
      return { state: next, outcome: { kind: "restored", id: restored.id } };
    }
    case "setDirty": {
      const index = state.open.findIndex((tab) => tab.id === action.id);
      if (index < 0) return { state, outcome: outcomeRejected("workspace_not_found") };
      const open = state.open.slice();
      open[index] = { ...open[index], dirty: action.dirty };
      return { state: { ...state, open }, outcome: { kind: "ok" } };
    }
    case "reconcile": {
      const keepOpen = state.open.filter((tab) => action.valid(tab.routeID));
      const keepClosed = state.closed.filter((tab) => action.valid(tab.routeID));
      // Dashboard 首页在 manifest 仍被取消（撤权/删除默认路由）时，从固定保护中移除。
      const dropped = state.open.filter((tab) => !action.valid(tab.routeID)).map((tab) => tab.id);
      let next: WorkspaceState = { ...state, open: keepOpen, closed: keepClosed };
      if (state.activeWorkspaceID && !keepOpen.some((tab) => tab.id === state.activeWorkspaceID)) {
        next = { ...next, activeWorkspaceID: nextActiveAfterClose(state, dropped) };
      }
      return { state: next, outcome: { kind: "ok" } };
    }
    case "replace":
      return { state: action.state, outcome: { kind: "ok" } };
    case "hydrate": {
      // 只并入从未出现过的标签（按 ID 去重），不覆盖已打开/已关闭状态；
      // activeWorkspaceID 由导航效果决定，此处不恢复。
      const openIDs = new Set(state.open.map((tab) => tab.id));
      const fresh = action.open.filter((tab) => !openIDs.has(tab.id));
      const open = [...state.open, ...fresh];
      const closedIDs = new Set(state.closed.map((tab) => tab.id));
      const closedFresh = action.closed.filter((tab) => !closedIDs.has(tab.id));
      return { state: { open, closed: [...state.closed, ...closedFresh], activeWorkspaceID: state.activeWorkspaceID }, outcome: { kind: "ok" } };
    }
    default:
      return { state, outcome: outcomeRejected("workspace_not_found") };
  }
}

// withActive 设置活动工作区并保持其余字段不变；已是该活动标签时返回原引用，
// 避免 effect 驱动 dispatch 造成循环 re-render。
function withActive(state: WorkspaceState, id: WorkspaceID): WorkspaceState {
  if (state.activeWorkspaceID === id) return state;
  return { ...state, activeWorkspaceID: id };
}

// reorderByPin 固定/取消固定并保持分组内相对顺序；找不到目标返回 undefined。
function reorderByPin(state: WorkspaceState, id: WorkspaceID, pinned: boolean): WorkspaceState | undefined {
  const index = state.open.findIndex((tab) => tab.id === id);
  if (index < 0) return undefined;
  const tabs = state.open.slice();
  const [tab] = tabs.splice(index, 1);
  if (!tab || tab.pinned === pinned) return state;
  const next = { ...tab, pinned };
  const pivot = pinned
    ? tabs.findIndex((candidate) => !candidate.pinned)
    : tabs.length;
  const insertAt = pivot < 0 ? tabs.length : pivot;
  tabs.splice(insertAt, 0, next);
  return { ...state, open: tabs };
}

// commitClose 移除目标并把已确认关闭的 descriptor 元数据压入最近关闭栈（上限 10）。
// 同一批次内的关闭顺序按打开顺序逆序入栈：右邻（较晚打开的）视为最近关闭，便于 restore
// 的“最近关闭优先”语义；单标签关闭与该约定天然一致。
function commitClose(state: WorkspaceState, ids: WorkspaceID[]): WorkspaceState {
  const targetSet = new Set(ids);
  const removed = state.open.filter((tab) => targetSet.has(tab.id));
  const open = state.open.filter((tab) => !targetSet.has(tab.id));
  const closed = [...removed.slice().reverse().map((tab) => ({ ...tab, dirty: false })), ...state.closed].slice(0, MAX_CLOSED_HISTORY);
  const activeWorkspaceID = state.activeWorkspaceID && targetSet.has(state.activeWorkspaceID) ? undefined : state.activeWorkspaceID;
  return { open, closed, activeWorkspaceID };
}

// nextActiveAfterClose 按“右邻居，否则左邻居，否则空”选择关闭后的活动工作区。
function nextActiveAfterClose(state: WorkspaceState, closedIDs: WorkspaceID[]): WorkspaceID | undefined {
  const before = state.open.filter((tab) => !closedIDs.includes(tab.id));
  const previouslyActive = state.activeWorkspaceID;
  if (previouslyActive && before.some((tab) => tab.id === previouslyActive)) return previouslyActive;
  const previousIndex = state.open.findIndex((tab) => tab.id === previouslyActive);
  if (previousIndex >= 0) {
    const right = before.find((tab) => state.open.indexOf(tab) > previousIndex);
    if (right) return right.id;
    const left = [...before].reverse().find((tab) => state.open.indexOf(tab) < previousIndex);
    if (left) return left.id;
  }
  return before[0]?.id;
}

// WorkspaceTabView 是标签视图：追加 active 派生状态，供 UI 直接消费。
export type WorkspaceTabView = WorkspaceDescriptor & { active: boolean };

export function selectTabViews(state: WorkspaceState): WorkspaceTabView[] {
  return state.open.map((tab) => ({ ...tab, active: tab.id === state.activeWorkspaceID }));
}

export function selectActiveTab(state: WorkspaceState): WorkspaceTabView | undefined {
  const id = state.activeWorkspaceID;
  if (!id) return undefined;
  const tab = state.open.find((candidate) => candidate.id === id);
  return tab ? { ...tab, active: true } : undefined;
}

export function hasDirtyWorkspace(state: WorkspaceState): boolean {
  return state.open.some((tab) => tab.dirty);
}

export function dirtyWorkspaceCount(state: WorkspaceState): number {
  return state.open.filter((tab) => tab.dirty).length;
}