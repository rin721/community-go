import type { WorkspaceState } from "./registry";

// 085 STORAGE-085-001：版本化、按 principal 隔离的低敏标签元数据持久化。
// 本模块是宿主私有 adapter：不把 Web Storage 暴露给业务模块，也不保存草稿值、
// 凭据、响应 body、任意 query、错误文本或 dirty（REQ-085-008）。

export const WORKSPACE_STORAGE_KEY = "community-go-webui-workspace";
export const WORKSPACE_STORAGE_VERSION = 1;

// PersistedWorkspaceTab 是允许进入 localStorage 的标签元数据投影（allowlist）：
// routeID/pinned/顺序 + 允许恢复的 pathname 与明确 allowlist 的 search key +
// 模块提供的低敏 restore key（contextual 恢复凭它重新解码上下文，宿主不保存
// 原始 contextID，避免把实体信息写入浏览器存储）。
export type PersistedWorkspaceTab = {
  routeID: string;
  // restoreKey 是模块在 open 时声明的低敏持久化键；contextual 无该键时不持久化。
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
export type RestorableRoute = (routeID: string) => boolean;

// SearchAllowlist 是按 routeID 明确 allowlist 的可持久化 search key；未列出的 key
// 一律不进 JSON（"任意 query 不进入 JSON"）。当前仅有 openapi.workspace 的深链
// ?op=&mode=（公开契约快照内的操作 ID 与模式，低敏）。
export const WORKSPACE_SEARCH_ALLOWLIST: Record<string, string[]> = {
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

// projectPersistedTabs 把打开的 restorable 标签投影为持久化元数据；contextual 标签
// 必须携带低敏 restoreKey 才能进入存储（没有 restoreKey 一律跳过，不伪造恢复上下文）。
export function projectPersistedTabs(state: WorkspaceState, isRestorable: RestorableRoute, restoreKeyOf: (id: string) => string | undefined = () => undefined): PersistedWorkspaceTab[] {
  const byID = new Map(state.open.map((tab) => [tab.id, tab]));
  const result: PersistedWorkspaceTab[] = [];
  for (const id of state.open.map((tab) => tab.id)) {
    const tab = byID.get(id);
    if (!tab || !isRestorable(tab.routeID)) continue;
    const restoreKey = restoreKeyOf(id);
    // contextual（以 c: 前缀编码）没有低敏 restoreKey 时不持久化。
    if (id.startsWith("ws:ctx:") && !restoreKey) continue;
    result.push({
      routeID: tab.routeID,
      ...(restoreKey ? { restoreKey } : {}),
      pathname: tab.location.pathname,
      search: projectSearch(tab.location.search, WORKSPACE_SEARCH_ALLOWLIST[tab.routeID] ?? []),
      pinned: tab.pinned,
    });
  }
  return result;
}

// projectPersistedState 生成当前窗口的快照；写入失败语义由 writePersistedState 处理。
export function projectPersistedState(state: WorkspaceState, principalID: string, isRestorable: RestorableRoute, restoreKeyOf: (id: string) => string | undefined = () => undefined): PersistedWorkspaceStateV1 {
  return {
    version: WORKSPACE_STORAGE_VERSION,
    principalID,
    tabs: projectPersistedTabs(state, isRestorable, restoreKeyOf),
    activeID: state.activeWorkspaceID,
    closed: state.closed.filter((tab) => isRestorable(tab.routeID)).map((tab) => {
      const restoreKey = restoreKeyOf(tab.id);
      return {
        routeID: tab.routeID,
        ...(tab.id.startsWith("ws:ctx:") && restoreKey ? { restoreKey } : {}),
        pathname: tab.location.pathname,
        search: projectSearch(tab.location.search, WORKSPACE_SEARCH_ALLOWLIST[tab.routeID] ?? []),
        pinned: tab.pinned,
      };
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