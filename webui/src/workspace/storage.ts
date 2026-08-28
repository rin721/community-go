import type { WorkspaceState } from "./registry";

// 087 STORAGE：版本化、按 principal 隔离的低敏标签元数据持久化。
// 只有显式声明 restorable 的 workspace 才可恢复（对应 policy.restorable）；
// 仍只保存允许进入 localStorage 的 allowlist 投影，不保存草稿、凭据、响应 body、
// 任意 query、错误文本或 dirty。

export const WORKSPACE_STORAGE_KEY = "community-go-webui-workspace";
export const WORKSPACE_STORAGE_VERSION = 1;

// PersistedWorkspaceTab 是允许进入 localStorage 的标签元数据投影（allowlist）：
// routeID/pinned/顺序 + 允许恢复的 pathname 与明确 allowlist 的 search key +
// 宿主派生的低敏 restore key（动态详情实体路径键；宿主不保存敏感原文）。
export type PersistedWorkspaceTab = {
  routeID: string;
  // restoreKey 是宿主在 open 时派生的低敏持久化键（动态详情实体 / allowlist query）。
  restoreKey?: string;
  pathname: string;
  search: string;
  pinned: boolean;
};

// PersistedWorkspaceStateV1 是当前版本的持久化快照；principalID 不匹配时视为空状态。
export type PersistedWorkspaceStateV1 = {
  version: 1;
  principalID: string;
  tabs: PersistedWorkspaceTab[];
  activeID?: string;
  closed: PersistedWorkspaceTab[];
};

// RestorableRoute 决定某 route 是否允许持久化标签元数据（对应 policy.restorable）。
// 087：只有显式 opt-in 且 restorable 的 workspace 才可持久化；普通 route 一律不写。
export type RestorableRoute = (routeID: string) => boolean;

// SearchAllowlist 是按 routeID 明确 allowlist 的可持久化 search key；未列出的 key
// 一律不进 JSON（"任意 query 不进入 JSON"）。087 保留 allowlist 语义：列表页 query
// （筛选/分页）仍不进入标签持久化；只有显式 workspace 的深链（如 OpenAPI ?op=&mode=）
// 允许恢复。
export const WORKSPACE_SEARCH_ALLOWLIST: Record<string, string[]> = {
  // OpenAPI 深链 ?op=&mode= 来自公开契约快照（低敏），允许恢复。
  "openapi.workspace": ["op", "mode"],
};

function isPersistedTab(value: unknown): value is PersistedWorkspaceTab {
  if (!value || typeof value !== "object") return false;
  const tab = value as Partial<PersistedWorkspaceTab>;
  return typeof tab.routeID === "string" && tab.routeID !== ""
    && typeof tab.pathname === "string" && tab.pathname.startsWith("/")
    && typeof tab.search === "string"
    && typeof tab.pinned === "boolean"
    && (tab.restoreKey === undefined || typeof tab.restoreKey === "string");
}

function parsePersisted(value: string | null): unknown {
  if (!value) return null;
  try {
    return JSON.parse(value) as unknown;
  } catch {
    return null;
  }
}

// validatePersistedV1 校验版本、principal 与 schema；任何异常都返回 null（fail closed）。
export function validatePersistedV1(value: unknown, principalID: string): PersistedWorkspaceStateV1 | null {
  if (!value || typeof value !== "object") return null;
  const state = value as Partial<PersistedWorkspaceStateV1>;
  if (state.version !== WORKSPACE_STORAGE_VERSION) return null;
  if (state.principalID !== principalID) return null;
  if (!Array.isArray(state.tabs) || !state.tabs.every(isPersistedTab)) return null;
  if (state.closed !== undefined && (!Array.isArray(state.closed) || !state.closed.every(isPersistedTab))) return null;
  if (state.activeID !== undefined && typeof state.activeID !== "string") return null;
  return {
    version: WORKSPACE_STORAGE_VERSION,
    principalID: state.principalID,
    tabs: state.tabs,
    activeID: state.activeID,
    closed: state.closed ?? [],
  };
}

// projectSearch 只保留明确 allowlist 的 search key（稳定顺序输出）。
function projectSearch(search: string, allowlist: string[]): string {
  if (!search || allowlist.length === 0) return "";
  const allowed = new Set(allowlist);
  const params = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
  const kept = new URLSearchParams();
  for (const [key, value] of params.entries()) {
    if (allowed.has(key)) kept.set(key, value);
  }
  const serialized = kept.toString();
  return serialized ? `?${serialized}` : "";
}

// projectPersistedTab 把单个 restorable workspace 投影为低敏元数据；contextual 标签
// 必须携带低敏 restoreKey 才能进入存储（没有 restoreKey 一律跳过，不伪造恢复上下文）。
function projectPersistedTab(tab: WorkspaceState["open"][number], isRestorable: RestorableRoute, restoreKeyOf: (id: string) => string | undefined): PersistedWorkspaceTab | undefined {
  if (!isRestorable(tab.routeID)) return undefined;
  const restoreKey = restoreKeyOf(tab.id);
  if (tab.id.startsWith("ws:ctx:") && !restoreKey) return undefined;
  return {
    routeID: tab.routeID,
    ...(restoreKey ? { restoreKey } : {}),
    pathname: tab.location.pathname,
    search: projectSearch(tab.location.search, WORKSPACE_SEARCH_ALLOWLIST[tab.routeID] ?? []),
    pinned: tab.pinned,
  };
}

// projectPersistedTabs 把打开的 restorable 标签投影为持久化元数据。
export function projectPersistedTabs(state: WorkspaceState, isRestorable: RestorableRoute, restoreKeyOf: (id: string) => string | undefined = () => undefined): PersistedWorkspaceTab[] {
  const result: PersistedWorkspaceTab[] = [];
  for (const tab of state.open) {
    const projected = projectPersistedTab(tab, isRestorable, restoreKeyOf);
    if (projected) result.push(projected);
  }
  return result;
}

// projectPersistedState 生成当前窗口的快照；写入失败语义由 writePersistedState 处理。
// isRestorable 决定哪些 route 的标签元数据可进入存储（087：policy.restorable 门禁）。
export function projectPersistedState(state: WorkspaceState, principalID: string, isRestorable: RestorableRoute, restoreKeyOf: (id: string) => string | undefined = () => undefined): PersistedWorkspaceStateV1 {
  const active = state.open.find((tab) => tab.id === state.activeWorkspaceID);
  const activeRestoreKey = active ? restoreKeyOf(active.id) : undefined;
  const activeID = active && isRestorable(active.routeID)
    && (!active.id.startsWith("ws:ctx:") || Boolean(activeRestoreKey))
    ? active.id
    : undefined;
  return {
    version: WORKSPACE_STORAGE_VERSION,
    principalID,
    tabs: projectPersistedTabs(state, isRestorable, restoreKeyOf),
    ...(activeID ? { activeID } : {}),
    closed: state.closed.flatMap((tab) => {
      const projected = projectPersistedTab(tab, isRestorable, restoreKeyOf);
      return projected ? [projected] : [];
    }),
  };
}

// readPersistedWorkspaceState 读取并校验当前 principal 的快照；存储不可用、损坏、
// 版本不支持或 principal 不匹配时一律返回 null（安全降级到内存与空状态）。
export function readPersistedWorkspaceState(principalID: string, storage: Pick<Storage, "getItem"> = window.localStorage): PersistedWorkspaceStateV1 | null {
  let raw: string | null = null;
  try {
    raw = storage.getItem(WORKSPACE_STORAGE_KEY);
  } catch {
    return null;
  }
  return validatePersistedV1(parsePersisted(raw), principalID);
}

// writePersistedWorkspaceState 写入快照；setItem 异常被捕获并返回稳定错误码
// workspace_storage_write_failed，不向调用方抛出（存储失败不拖垮导航）。
export function writePersistedWorkspaceState(state: PersistedWorkspaceStateV1, storage: Pick<Storage, "setItem"> = window.localStorage): "ok" | "workspace_storage_write_failed" {
  try {
    storage.setItem(WORKSPACE_STORAGE_KEY, JSON.stringify(state));
    return "ok";
  } catch {
    return "workspace_storage_write_failed";
  }
}

// clearPersistedWorkspaceState 在 logout/principal 切换时清理快照，避免账号间泄漏。
export function clearPersistedWorkspaceState(storage: Pick<Storage, "removeItem"> = window.localStorage): void {
  try {
    storage.removeItem(WORKSPACE_STORAGE_KEY);
  } catch {
    // removeItem 失败不构成导航阻断；下次写入仍按 last-writer-wins 覆盖。
  }
}
