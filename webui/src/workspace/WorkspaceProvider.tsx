import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef, useState, type ReactNode } from "react";
import { ConfirmDialog } from "@webui/sdk/ui";
import type { Manifest, ManifestRoute, WorkspaceSession, WorkspaceSessionLookup, WorkspaceTabPolicy } from "@webui/sdk/runtime";
import { translateMessage } from "../i18n";
import {
  createWorkspaceID,
  emptyWorkspaceState,
  hasDirtyWorkspace,
  workspaceReducer,
  type OpenWorkspaceInput,
  type WorkspaceAction,
  type WorkspaceDescriptor,
  type WorkspaceID,
  type WorkspaceLocation,
  type WorkspaceState,
  type WorkspaceTabView,
} from "./registry";
import {
  clearPersistedWorkspaceState,
  projectPersistedState,
  readPersistedWorkspaceState,
  writePersistedWorkspaceState,
} from "./storage";

// WorkspaceHost 是宿主把 registry 与 manifest/principal 对齐后的稳定视图。
export type WorkspaceHost = {
  state: WorkspaceState;
  tabs: WorkspaceTabView[];
  activeTab?: WorkspaceTabView;
  hasDirty: boolean;
  /** openWorkspace 只对显式 opt-in 的 singleton/contextual route 打开/激活标签（087）。 */
  openWorkspace: (input: OpenWorkspaceInput) => void;
  /** openContextual 供 contextual route 按稳定 contextID 打开独立实例。 */
  openContextual: (input: { routeID: string; contextID: string; location: WorkspaceLocation; restoreKey?: string }) => void;
  activateWorkspace: (id: WorkspaceID) => void;
  deactivateWorkspace: () => void;
  pinWorkspace: (id: WorkspaceID) => void;
  unpinWorkspace: (id: WorkspaceID) => void;
  requestCloseWorkspace: (id: WorkspaceID) => void;
  requestCloseOthers: (anchorID: WorkspaceID) => void;
  requestCloseRight: (anchorID: WorkspaceID) => void;
  requestRestoreClosed: () => void;
  setWorkspaceDirty: (id: WorkspaceID, dirty: boolean) => void;
  registerBeforeClose: (id: WorkspaceID, handler: () => boolean | Promise<boolean>) => () => void;
  sessionLookup: WorkspaceSessionLookup;
  resolveTabTitle: (tab: WorkspaceTabView) => string;
  /** requestPrepareLogout 返回是否可继续登出；有 dirty 工作区时经统一确认。 */
  requestPrepareLogout: () => "proceed" | "blocked";
};

// WorkspaceProviderProps 是宿主装配参数；manifest/principalID 未就绪（启动阶段）时
// registry 保持空状态，不伪造任何工作区。
type WorkspaceProviderProps = {
  manifest?: Manifest;
  principalID?: string;
  navigateToDefault: () => void;
  children: ReactNode;
};

// workspacePolicyOf 返回 route 的显式 workspace 资格；未声明/disabled 返回 undefined
// 或 disabled policy（087：普通正式路由不生成标签）。
export function workspacePolicyOf(route: ManifestRoute | undefined): WorkspaceTabPolicy | undefined {
  return route?.workspaceTab;
}

// isWorkspaceEligible 判断 route 是否被显式声明为 workspace 资格（singleton/contextual）。
export function isWorkspaceEligible(route: ManifestRoute | undefined): boolean {
  const policy = workspacePolicyOf(route);
  return policy?.mode === "singleton" || policy?.mode === "contextual";
}

export function workspaceLocationOf(pathname: string, search: string): WorkspaceLocation {
  return { pathname, search: search.startsWith("?") ? search : search ? `?${search}` : "" };
}

// routeIsRestorable 判断 route 是否允许持久化（policy 显式声明 restorable 且 access 放行）。
function routeIsRestorable(manifest: Manifest | undefined, routeID: string): boolean {
  const route = manifest?.routes.find((candidate) => candidate.id === routeID);
  const policy = workspacePolicyOf(route);
  if (!routeIsWorkspaceEnabled(manifest, routeID) || !policy || policy.mode === "disabled") return false;
  return policy.restorable;
}

// routeIsWorkspaceEnabled 判断当前会话是否仍可保留显式 workspace；它不检查
// restorable，因为“不恢复”与“当前已打开后继续存在”是两个独立语义。
function routeIsWorkspaceEnabled(manifest: Manifest | undefined, routeID: string): boolean {
  const route = manifest?.routes.find((candidate) => candidate.id === routeID);
  return Boolean(route && route.layout === "app" && route.access === "allowed" && isWorkspaceEligible(route));
}

type PendingClose =
  | { kind: "single"; anchorID: WorkspaceID; dirtyCount: number }
  | { kind: "others"; anchorID: WorkspaceID; dirtyCount: number }
  | { kind: "right"; anchorID: WorkspaceID; dirtyCount: number }
  | { kind: "unpin-then-close"; anchorID: WorkspaceID }
  | { kind: "logout" };

// WorkspaceProvider 是宿主 workspace 状态的 composition root：registry（唯一状态
// owner）+ principal 隔离持久化 + manifest reconcile + dirty/beforeClose 关闭管线 +
// 会话窄契约注入。普通 route 导航不创建标签（087：显式资格单轨）。
export function WorkspaceProvider({ manifest, principalID, navigateToDefault, children }: WorkspaceProviderProps) {
  // registryTransitionReducer 把 WorkspaceTransition 折叠为纯状态。
  const transitionReducer = useCallback((current: WorkspaceState, action: WorkspaceAction): WorkspaceState => {
    return workspaceReducer(current, action).state;
  }, []);
  const [state, dispatch] = useReducer(transitionReducer, undefined, emptyWorkspaceState);
  const [pendingClose, setPendingClose] = useState<PendingClose | undefined>();
  const beforeCloseRef = useRef(new Map<WorkspaceID, Array<() => boolean | Promise<boolean>>>());
  const manifestRef = useRef(manifest);
  manifestRef.current = manifest;

  // ---- 持久化恢复：principal 变化时读取，非当前 principal 一律不恢复 ----
  // 首次挂载时 principalID 可能尚未就绪（session 异步加载）：此时只清空内存状态，
  // 绝不清理持久化快照，否则刷新页面就会丢失可恢复标签。
  const previousPrincipalRef = useRef<string | undefined>(undefined);
  // hydratedRef 记录已完成恢复的 principal；持久化只在恢复完成后生效，避免
  // session 尚未加载时把空状态写回存储（清掉本可恢复的标签）。
  const hydratedRef = useRef<string | undefined>(undefined);
  useEffect(() => {
    const previousPrincipal = previousPrincipalRef.current;
    previousPrincipalRef.current = principalID;
    const principalChanged = previousPrincipal !== undefined && previousPrincipal !== principalID;
    if (!principalID) {
      // 首次挂载时 session 尚未加载：绝不重置内存状态；只有从有 principal 变为无
      // （登出/切换）才清理持久化快照与内存。
      hydratedRef.current = undefined;
      if (principalChanged) {
        clearPersistedWorkspaceState();
        dispatch({ type: "replace", state: emptyWorkspaceState() });
      }
      return;
    }
    if (principalChanged) clearPersistedWorkspaceState();
    const snapshot = readPersistedWorkspaceState(principalID);
    const now = Date.now();
    const open: WorkspaceDescriptor[] = [];
    const closed: WorkspaceDescriptor[] = [];
    if (snapshot) {
      const hydrate = (persisted: Array<{ routeID: string; restoreKey?: string; pathname: string; search: string; pinned: boolean }>): WorkspaceDescriptor[] => {
        const result: WorkspaceDescriptor[] = [];
        for (const tab of persisted) {
          // 旧 Rev.2 快照中的普通 route descriptor（iam.accounts/settings.* 等）因
          // 不再 restorable 而被丢弃；只有显式 restorable workspace 才恢复（087）。
          const route = manifestRef.current?.routes.find((candidate) => candidate.id === tab.routeID);
          if (!route || !routeIsRestorable(manifestRef.current, tab.routeID)) continue;
          // contextual 恢复只使用模块提供的低敏 restoreKey 作为恢复上下文；没有该键
          // 时无法安全重建实体上下文，直接丢弃，不把 pathname 猜成业务身份。
          const contextID = route.workspaceTab?.mode === "contextual" ? tab.restoreKey : undefined;
          if (route.workspaceTab?.mode === "contextual" && !contextID) continue;
          result.push({
            id: createWorkspaceID(tab.routeID, contextID),
            routeID: tab.routeID,
            contextID,
            restoreKey: tab.restoreKey,
            location: { pathname: tab.pathname, search: tab.search },
            pinned: tab.pinned,
            dirty: false,
            openedAt: now,
          });
        }
        return result;
      };
      open.push(...hydrate(snapshot.tabs));
      closed.push(...hydrate(snapshot.closed));
    }
    // 恢复用并入（hydrate）而非整体替换：避免与导航效果刚打开的工作区冲突；
    // 是否激活由【当前路由】的导航效果决定（普通 route 激活时标签保留但无活动工作区）。
    hydratedRef.current = principalID;
    dispatch({ type: "hydrate", open, closed });
  }, [principalID]);

  // ---- manifest 变化 → reconcile：已撤权/已删除 route 的打开与关闭元数据丢弃 ----
  useEffect(() => {
    if (!manifest) return;
    dispatch({ type: "reconcile", valid: (routeID) => routeIsWorkspaceEnabled(manifest, routeID) });
  }, [manifest]);

  // ---- 状态变化 → allowlist 持久化（只写低敏元数据，storage 失败降级不阻断） ----
  useEffect(() => {
    if (!principalID || hydratedRef.current !== principalID) return;
    const restoreKeyOf = (id: WorkspaceID) => state.open.find((descriptor) => descriptor.id === id)?.restoreKey ?? state.closed.find((descriptor) => descriptor.id === id)?.restoreKey;
    const snapshot = projectPersistedState(state, principalID, (routeID) => routeIsRestorable(manifestRef.current, routeID), restoreKeyOf);
    if (writePersistedWorkspaceState(snapshot) === "workspace_storage_write_failed") {
      console.error("workspace_storage_write_failed");
    }
  }, [state, principalID]);

  // ---- beforeunload：只在存在 dirty workspace 时注册浏览器标准保护 ----
  useEffect(() => {
    if (!hasDirtyWorkspace(state)) return;
    const handler = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [state]);

  const setDirty = useCallback((id: WorkspaceID, dirty: boolean) => {
    dispatch({ type: "setDirty", id, dirty });
  }, []);

  const registerBeforeClose = useCallback((id: WorkspaceID, handler: () => boolean | Promise<boolean>) => {
    const handlers = beforeCloseRef.current.get(id) ?? [];
    handlers.push(handler);
    beforeCloseRef.current.set(id, handlers);
    return () => {
      const remaining = beforeCloseRef.current.get(id)?.filter((candidate) => candidate !== handler) ?? [];
      if (remaining.length === 0) beforeCloseRef.current.delete(id);
      else beforeCloseRef.current.set(id, remaining);
    };
  }, []);

  // runBeforeClose 收集目标 workspace 的全部 beforeClose 决策：任一 deny/error 即拒绝
  // 且不部分关闭；低敏原因统一由宿主弹窗呈现，不逐层打印。
  const runBeforeClose = useCallback(async (ids: WorkspaceID[]): Promise<"allow" | "deny"> => {
    const results = await Promise.allSettled(ids.map(async (id) => {
      const handlers = beforeCloseRef.current.get(id);
      if (!handlers || handlers.length === 0) return true;
      const decisions = await Promise.all(handlers.map((handler) => Promise.resolve().then(handler)));
      return decisions.every((decision) => decision === true);
    }));
    return results.every((result) => result.status === "fulfilled" && result.value === true) ? "allow" : "deny";
  }, []);

  // collectBatchTargets 计算 others/right 的目标（pinned 默认排除）。
  const collectBatchTargets = useCallback((stateNow: WorkspaceState, kind: "others" | "right", anchorID: WorkspaceID): WorkspaceID[] => {
    const anchorIndex = stateNow.open.findIndex((descriptor) => descriptor.id === anchorID);
    if (anchorIndex < 0) return [];
    const candidates = kind === "others"
      ? stateNow.open.filter((descriptor) => descriptor.id !== anchorID)
      : stateNow.open.slice(anchorIndex + 1);
    return candidates.filter((descriptor) => !descriptor.pinned).map((descriptor) => descriptor.id);
  }, []);

  // closePipeline 统一关闭管线：目标收集 → dirty/beforeClose 检查 → 一次受控确认 →
  // registry 提交。deny 的 handler 不部分关闭，直接中止。最后一个工作区关闭时
  // 回到主导航。
  const closePipeline = useCallback(async (kind: "single" | "others" | "right", anchorID: WorkspaceID | undefined) => {
    if (kind === "single" && anchorID) {
      const anchor = state.open.find((descriptor) => descriptor.id === anchorID);
      if (!anchor) return;
      if (anchor.pinned) {
        // 用户显式单个关闭 pinned 时先要求 unpin。
        setPendingClose({ kind: "unpin-then-close", anchorID });
        return;
      }
      const before = await runBeforeClose([anchorID]);
      if (before === "deny") return;
      if (anchor.dirty) {
        setPendingClose({ kind: "single", anchorID, dirtyCount: 1 });
        return;
      }
      const closingLast = state.open.length === 1;
      dispatch({ type: "close", ids: [anchorID], confirmed: true });
      if (closingLast) navigateToDefault();
      return;
    }
    if ((kind === "others" || kind === "right") && anchorID) {
      const targets = collectBatchTargets(state, kind, anchorID);
      if (targets.length === 0) return;
      const before = await runBeforeClose(targets);
      if (before === "deny") return;
      const dirtyCount = state.open.filter((descriptor) => targets.includes(descriptor.id) && descriptor.dirty).length;
      if (dirtyCount > 0) {
        setPendingClose({ kind, anchorID, dirtyCount });
        return;
      }
      const closingLast = targets.length === state.open.length;
      dispatch(kind === "others" ? { type: "closeOthers", anchorID, confirmed: true } : { type: "closeRight", anchorID, confirmed: true });
      if (closingLast) navigateToDefault();
    }
  }, [state, collectBatchTargets, runBeforeClose, navigateToDefault]);

  // ---- 派生视图 ----
  const tabs = useMemo<WorkspaceTabView[]>(() => state.open.map((descriptor) => ({ ...descriptor, active: descriptor.id === state.activeWorkspaceID })), [state]);
  const activeTab = useMemo(() => (state.activeWorkspaceID ? tabs.find((tab) => tab.id === state.activeWorkspaceID) : undefined), [tabs, state.activeWorkspaceID]);

  const openWorkspace = useCallback((input: OpenWorkspaceInput) => {
    const route = manifestRef.current?.routes.find((candidate) => candidate.id === input.routeID);
    const policy = workspacePolicyOf(route);
    // 资格只信任当前 manifest 的 route policy；调用方传入的 policy 仅是动作快照，
    // 不能借此把 disabled route 或错误 mode 伪装成 workspace。
    if (!routeIsWorkspaceEnabled(manifestRef.current, input.routeID) || !policy || policy.mode !== input.policy.mode) return;
    dispatch({ type: "open", input: { ...input, policy } });
  }, []);

  const openContextual = useCallback((input: { routeID: string; contextID: string; location: WorkspaceLocation; restoreKey?: string }) => {
    const route = manifestRef.current?.routes.find((candidate) => candidate.id === input.routeID);
    const policy = workspacePolicyOf(route);
    if (!routeIsWorkspaceEnabled(manifestRef.current, input.routeID) || !policy || policy.mode !== "contextual") return;
    dispatch({ type: "open", input: { routeID: input.routeID, policy, contextID: input.contextID, location: input.location, restoreKey: input.restoreKey } });
  }, []);

  const activateWorkspace = useCallback((id: WorkspaceID) => {
    dispatch({ type: "activate", id });
  }, []);

  const deactivateWorkspace = useCallback(() => {
    dispatch({ type: "deactivate" });
  }, []);

  const pinWorkspace = useCallback((id: WorkspaceID) => {
    dispatch({ type: "pin", id });
  }, []);

  const unpinWorkspace = useCallback((id: WorkspaceID) => {
    dispatch({ type: "unpin", id });
  }, []);

  const requestRestoreClosed = useCallback(() => {
    const nearest = state.closed[0];
    if (!nearest) return;
    if (!routeIsWorkspaceEnabled(manifestRef.current, nearest.routeID)) return;
    dispatch({ type: "restore" });
  }, [state.closed]);

  // requestPrepareLogout：有 dirty 时先走统一确认；确认后 registry 清空并放行登出。
  const requestPrepareLogout = useCallback((): "proceed" | "blocked" => {
    if (hasDirtyWorkspace(state)) {
      setPendingClose({ kind: "logout" });
      return "blocked";
    }
    return "proceed";
  }, [state]);

  // sessionLookup 是窄会话注入：只有 workspaceID/active/setDirty/requestClose/
  // registerBeforeClose，页面不可读全 registry。
  const sessionLookup = useCallback<WorkspaceSessionLookup>((workspaceID: WorkspaceID) => {
    const descriptor = state.open.find((candidate) => candidate.id === workspaceID);
    if (!descriptor) return undefined;
    const session: WorkspaceSession = {
      workspaceID,
      active: workspaceID === state.activeWorkspaceID,
      setDirty: (dirty) => setDirty(workspaceID, dirty),
      requestClose: () => { void closePipeline("single", workspaceID); },
      registerBeforeClose: (handler) => registerBeforeClose(workspaceID, handler),
    };
    return session;
  }, [state.open, state.activeWorkspaceID, setDirty, registerBeforeClose, closePipeline]);

  const resolveTabTitle = useCallback((tab: WorkspaceTabView) => {
    const route = manifestRef.current?.routes.find((candidate) => candidate.id === tab.routeID);
    if (!route) return tab.contextID ?? tab.routeID;
    const title = translateMessage(route.titleMessageId);
    const base = title === "webui_i18n_missing" ? route.titleMessageId : title;
    // contextual 按实体生成独立标签：标题追加低敏 contextID 区分实体。
    if (tab.contextID) return `${base} · ${tab.contextID}`;
    return base;
  }, []);

  // ---- 关闭确认提交 ----
  const confirmCommit = useCallback(() => {
    if (!pendingClose) return;
    switch (pendingClose.kind) {
      case "single":
        dispatch({ type: "close", ids: [pendingClose.anchorID], confirmed: true });
        if (state.open.length === 1) navigateToDefault();
        break;
      case "others": {
        const anchor = state.open.find((descriptor) => descriptor.id === pendingClose.anchorID);
        const targets = anchor ? collectBatchTargets(state, "others", anchor.id) : [];
        dispatch({ type: "closeOthers", anchorID: pendingClose.anchorID, confirmed: true });
        if (targets.length === state.open.length) navigateToDefault();
        break;
      }
      case "right": {
        const anchor = state.open.find((descriptor) => descriptor.id === pendingClose.anchorID);
        const targets = anchor ? collectBatchTargets(state, "right", anchor.id) : [];
        dispatch({ type: "closeRight", anchorID: pendingClose.anchorID, confirmed: true });
        if (targets.length === state.open.length) navigateToDefault();
        break;
      }
      case "unpin-then-close":
        dispatch({ type: "unpin", id: pendingClose.anchorID });
        dispatch({ type: "close", ids: [pendingClose.anchorID], confirmed: true });
        if (state.open.length === 1) navigateToDefault();
        break;
      case "logout":
        clearPersistedWorkspaceState();
        dispatch({ type: "replace", state: emptyWorkspaceState() });
        navigateToDefault();
        break;
    }
    setPendingClose(undefined);
  }, [pendingClose, state.open, collectBatchTargets, navigateToDefault]);

  const host: WorkspaceHost = useMemo(() => ({
    state,
    tabs,
    activeTab,
    hasDirty: hasDirtyWorkspace(state),
    openWorkspace,
    openContextual,
    activateWorkspace,
    deactivateWorkspace,
    pinWorkspace,
    unpinWorkspace,
    requestCloseWorkspace: (id) => { void closePipeline("single", id); },
    requestCloseOthers: (anchorID) => { void closePipeline("others", anchorID); },
    requestCloseRight: (anchorID) => { void closePipeline("right", anchorID); },
    requestRestoreClosed,
    setWorkspaceDirty: setDirty,
    registerBeforeClose,
    sessionLookup,
    resolveTabTitle,
    requestPrepareLogout,
  }), [state, tabs, activeTab, openWorkspace, openContextual, activateWorkspace, deactivateWorkspace, pinWorkspace, unpinWorkspace, closePipeline, requestRestoreClosed, setDirty, registerBeforeClose, sessionLookup, resolveTabTitle, requestPrepareLogout]);

  return (
    <WorkspaceHostContext.Provider value={host}>
      {children}
      {pendingClose && <ConfirmDialog
        open
        title={pendingClose.kind === "logout" ? translateMessage("webui.host.workspace.logout.title") : translateMessage("webui.host.workspace.close.title")}
        description={pendingClose.kind === "logout"
          ? translateMessage("webui.host.workspace.logout.dirtyDetail")
          : pendingClose.kind === "unpin-then-close"
            ? translateMessage("webui.host.workspace.unpinDetail")
            : `${translateMessage("webui.host.workspace.close.dirtyDetail")}（${pendingClose.dirtyCount}）`}
        confirmLabel={translateMessage("webui.host.workspace.close.confirm")}
        cancelLabel={translateMessage("webui.host.workspace.close.cancel")}
        closeLabel={translateMessage("webui.host.workspace.close.close")}
        onConfirm={confirmCommit}
        onCancel={() => setPendingClose(undefined)}
      />}
    </WorkspaceHostContext.Provider>
  );
}

const WorkspaceHostContext = createContext<WorkspaceHost | undefined>(undefined);

export function useWorkspaceHost(): WorkspaceHost {
  const host = useContext(WorkspaceHostContext);
  if (!host) throw new Error("webui_workspace_host_missing");
  return host;
}
