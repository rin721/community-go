import { describe, expect, it } from "vitest";
import { emptyWorkspaceState, workspaceReducer, type WorkspaceState } from "./registry";
import {
  projectPersistedState,
  readPersistedWorkspaceState,
  validatePersistedV1,
  WORKSPACE_SEARCH_ALLOWLIST,
  WORKSPACE_STORAGE_KEY,
  writePersistedWorkspaceState,
  type PersistedWorkspaceStateV1,
} from "./storage";

const restorable = () => true;

class ThrowingStorage {
  getItem(): string | null {
    throw new Error("storage unavailable");
  }
  setItem(): void {
    throw new Error("quota exceeded");
  }
  removeItem(): void {
    throw new Error("storage unavailable");
  }
}

function openState(routeID: string, search = "", pinned = false): WorkspaceState {
  let state = emptyWorkspaceState();
  state = workspaceReducer(state, {
    type: "open",
    input: { routeID, policy: { mode: "singleton", restorable: true }, location: { pathname: `/${routeID}`, search } },
  }).state;
  if (pinned) {
    state = workspaceReducer(state, { type: "pin", id: state.open[0].id }).state;
  }
  return state;
}

describe("WorkspaceStorage 投影 allowlist", () => {
  it("只投影 restorable 标签；policy.restorable=false 的 route 不进入 JSON", () => {
    const state = openState("openapi.workspace", "?op=account.list&mode=debug");
    const projected = projectPersistedState(state, "user-1", (routeID) => routeID !== "openapi.workspace");
    expect(projected.tabs).toHaveLength(0);

    const kept = projectPersistedState(state, "user-1", (routeID) => routeID === "openapi.workspace");
    expect(kept.tabs).toHaveLength(1);
    expect(kept.tabs[0]).toMatchObject({ routeID: "openapi.workspace", pinned: false });
  });

  it("search 只保留明确 allowlist 的 key（REQ-085-008：任意 query 不进 JSON）", () => {
    expect(WORKSPACE_SEARCH_ALLOWLIST["openapi.workspace"]).toEqual(["op", "mode"]);
    const state = openState("openapi.workspace", "?op=account.list&mode=debug&secret=cookie");
    const projected = projectPersistedState(state, "user-1", restorable);
    expect(projected.tabs[0].search).toBe("?op=account.list&mode=debug");

    const noAllowlist = openState("other.route", "?x=1&y=2");
    const projectedOther = projectPersistedState(noAllowlist, "user-1", (routeID) => routeID === "other.route");
    expect(projectedOther.tabs[0].search).toBe("");
  });

  it("不保存 dirty 与业务数据：投影只含元数据字段", () => {
    let state = openState("openapi.workspace");
    const id = state.open[0].id;
    state = workspaceReducer(state, { type: "setDirty", id, dirty: true }).state;
    const projected = projectPersistedState(state, "user-1", restorable);
    expect(projected.tabs[0]).not.toHaveProperty("dirty");
    expect(Object.keys(projected.tabs[0]).sort()).toEqual(["pathname", "pinned", "routeID", "search"]);
    expect(projected.activeID).toBe(id);
  });
});

describe("WorkspaceStorage 读写与 fail closed", () => {
  function memoryStorage() {
    const store = new Map<string, string>();
    return {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => { store.set(key, value); },
      removeItem: (key: string) => { store.delete(key); },
      store,
    };
  }

  it("round-trip：写入后可读出同一 principal 的快照", () => {
    const storage = memoryStorage();
    const state = openState("openapi.workspace", "?op=account.list&mode=docs");
    const snapshot = projectPersistedState(state, "user-1", restorable);
    expect(writePersistedWorkspaceState(snapshot, storage)).toBe("ok");
    const read = readPersistedWorkspaceState("user-1", storage);
    expect(read).not.toBeNull();
    expect(read?.tabs).toHaveLength(1);
    expect(read?.tabs[0].routeID).toBe("openapi.workspace");
    expect(read?.activeID).toBe(state.activeWorkspaceID);
  });

  it("principal 不匹配返回 null，不把 A 账号标签恢复给 B（REQ-085-008）", () => {
    const storage = memoryStorage();
    const snapshot = projectPersistedState(openState("openapi.workspace"), "user-a", restorable);
    writePersistedWorkspaceState(snapshot, storage);
    expect(readPersistedWorkspaceState("user-b", storage)).toBeNull();
    expect(readPersistedWorkspaceState("user-a", storage)).not.toBeNull();
  });

  it("坏 JSON、非对象、版本不支持和字段损坏均 fail closed 返回 null", () => {
    const cases: unknown[] = [
      "{oops",
      "null",
      "42",
      { version: 1, principalID: "user-1", tabs: "bad" },
      { version: 1, principalID: "user-1", tabs: [{ routeID: "", pathname: "/x", search: "", pinned: false }] },
      { version: 2, principalID: "user-1", tabs: [] },
      { version: 1, principalID: "user-1", tabs: [{ routeID: "openapi.workspace", pathname: "relative", search: "", pinned: false }] },
    ];
    for (const value of cases) {
      expect(validatePersistedV1(value, "user-1")).toBeNull();
    }
  });

  it("storage getItem/setItem 抛错时安全降级，导航不被拖垮（REQ-085-008）", () => {
    expect(readPersistedWorkspaceState("user-1", new ThrowingStorage() as unknown as Storage)).toBeNull();
    const snapshot = projectPersistedState(openState("openapi.workspace"), "user-1", restorable);
    expect(writePersistedWorkspaceState(snapshot, new ThrowingStorage() as unknown as Storage)).toBe("workspace_storage_write_failed");
  });

  it("contextual 没有低敏 restoreKey 时不进入存储", () => {
    let state = emptyWorkspaceState();
    state = workspaceReducer(state, {
      type: "open",
      input: { routeID: "docs", policy: { mode: "contextual", restorable: true }, contextID: "ctx-1", location: { pathname: "/docs", search: "" } },
    }).state;
    const projected = projectPersistedState(state, "user-1", restorable, () => undefined);
    expect(projected.tabs).toHaveLength(0);

    const stateWithKey = workspaceReducer(state, {
      type: "open",
      input: { routeID: "docs", policy: { mode: "contextual", restorable: true }, contextID: "ctx-1", restoreKey: "docs-1", location: { pathname: "/docs", search: "" } },
    }).state;
    const projectedKeyed = projectPersistedState(stateWithKey, "user-1", restorable, (id) => id === stateWithKey.open[0].id ? "docs-1" : undefined);
    expect(projectedKeyed.tabs).toHaveLength(1);
    expect(projectedKeyed.tabs[0].restoreKey).toBe("docs-1");
    expect(projectedKeyed.tabs[0]).not.toHaveProperty("contextID");
  });
});

describe("WorkspaceStorage 快照形状", () => {
  it("快照使用单一 host key 与版本化 schema", () => {
    const snapshot = projectPersistedState(emptyWorkspaceState(), "user-1", restorable);
    expect((snapshot as PersistedWorkspaceStateV1).version).toBe(1);
    expect(JSON.stringify(snapshot)).toContain(WORKSPACE_STORAGE_KEY === "community-go-webui-workspace" ? "" : "never");
    const storage = {
      getItem: () => JSON.stringify(snapshot),
      setItem: () => undefined,
      removeItem: () => undefined,
    };
    const read = readPersistedWorkspaceState("user-1", storage);
    expect(read?.principalID).toBe("user-1");
  });
});