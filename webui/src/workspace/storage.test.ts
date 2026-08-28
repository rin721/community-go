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

const isRestorable = (routeID: string) => routeID === "openapi.workspace" || routeID === "accounts.detail";

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

function openState(routeID: string, path = `/${routeID}`, search = "", pinned = false, contextID?: string): WorkspaceState {
  let state = emptyWorkspaceState();
  state = workspaceReducer(state, {
    type: "open",
    input: {
      routeID,
      policy: contextID ? { mode: "contextual", restorable: true } : { mode: "singleton", restorable: routeID === "openapi.workspace" },
      location: { pathname: path, search },
      ...(contextID ? { contextID } : {}),
    },
  }).state;
  if (pinned) {
    state = workspaceReducer(state, { type: "pin", id: state.open[0].id }).state;
  }
  return state;
}

describe("WorkspaceStorage 投影 allowlist（087 显式 workspace 门禁）", () => {
  it("普通 route 不进入持久化，显式 restorable workspace 才可投影", () => {
    const ordinary = projectPersistedState(openState("iam.accounts", "/admin/accounts"), "user-1", isRestorable);
    expect(ordinary.tabs).toHaveLength(0);
    const workspace = projectPersistedState(openState("openapi.workspace", "/openapi"), "user-1", isRestorable);
    expect(workspace.tabs).toHaveLength(1);
    expect(workspace.tabs[0]).toMatchObject({ routeID: "openapi.workspace", pinned: false });
  });

  it("search 只保留明确 allowlist 的 key（任意 query 不进 JSON）", () => {
    expect(WORKSPACE_SEARCH_ALLOWLIST["openapi.workspace"]).toEqual(["op", "mode"]);
    const state = openState("openapi.workspace", "/openapi", "?op=account.list&mode=debug&secret=cookie");
    const projected = projectPersistedState(state, "user-1", isRestorable);
    expect(projected.tabs[0].search).toBe("?op=account.list&mode=debug");

    const noAllowlist = openState("iam.accounts", "/admin/accounts", "?page=2&q=admin");
    const projectedOther = projectPersistedState(noAllowlist, "user-1", isRestorable);
    expect(projectedOther.tabs).toHaveLength(0);
  });

  it("不保存 dirty 与业务数据：投影只含元数据字段", () => {
    let state = openState("openapi.workspace", "/openapi");
    const id = state.open[0].id;
    state = workspaceReducer(state, { type: "setDirty", id, dirty: true }).state;
    const projected = projectPersistedState(state, "user-1", isRestorable);
    expect(projected.tabs[0]).not.toHaveProperty("dirty");
    expect(Object.keys(projected.tabs[0]).sort()).toEqual(["pathname", "pinned", "routeID", "search"]);
    expect(projected.activeID).toBe(id);
  });

  it("动态详情标签没有低敏 restoreKey 时不进入存储", () => {
    let state = emptyWorkspaceState();
    state = workspaceReducer(state, {
      type: "open",
      input: { routeID: "accounts.detail", policy: { mode: "contextual", restorable: true }, contextID: "entity-a", location: { pathname: "/accounts/detail/a", search: "" } },
    }).state;
    const projected = projectPersistedState(state, "user-1", isRestorable);
    expect(projected.tabs).toHaveLength(0);

    const projectedKeyed = projectPersistedState(state, "user-1", isRestorable, (id) => (id === state.open[0].id ? "entity-a" : undefined));
    expect(projectedKeyed.tabs).toHaveLength(1);
    expect(projectedKeyed.tabs[0].restoreKey).toBe("entity-a");
    expect(projectedKeyed.tabs[0]).not.toHaveProperty("contextID");
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
    const state = openState("openapi.workspace", "/openapi");
    const snapshot = projectPersistedState(state, "user-1", isRestorable);
    expect(writePersistedWorkspaceState(snapshot, storage)).toBe("ok");
    const read = readPersistedWorkspaceState("user-1", storage);
    expect(read).not.toBeNull();
    expect(read?.tabs).toHaveLength(1);
    expect(read?.tabs[0].routeID).toBe("openapi.workspace");
    expect(read?.activeID).toBe(state.activeWorkspaceID);
  });

  it("principal 不匹配返回 null，不把 A 账号标签恢复给 B", () => {
    const storage = memoryStorage();
    const snapshot = projectPersistedState(openState("openapi.workspace", "/openapi"), "user-a", isRestorable);
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
      { version: 1, principalID: "user-1", tabs: [{ routeID: "iam.accounts", pathname: "relative", search: "", pinned: false }] },
    ];
    for (const value of cases) {
      expect(validatePersistedV1(value, "user-1")).toBeNull();
    }
  });

  it("storage getItem/setItem 抛错时安全降级，导航不被拖垮", () => {
    expect(readPersistedWorkspaceState("user-1", new ThrowingStorage() as unknown as Storage)).toBeNull();
    const snapshot = projectPersistedState(openState("openapi.workspace", "/openapi"), "user-1", isRestorable);
    expect(writePersistedWorkspaceState(snapshot, new ThrowingStorage() as unknown as Storage)).toBe("workspace_storage_write_failed");
  });
});

describe("WorkspaceStorage 快照形状", () => {
  it("快照使用单一 host key 与版本化 schema", () => {
    const snapshot = projectPersistedState(emptyWorkspaceState(), "user-1", isRestorable);
    expect((snapshot as PersistedWorkspaceStateV1).version).toBe(1);
    expect(JSON.stringify(snapshot)).toContain("principalID");
    expect(WORKSPACE_STORAGE_KEY).toBe("community-go-webui-workspace");
    const storage = {
      getItem: () => JSON.stringify(snapshot),
      setItem: () => undefined,
      removeItem: () => undefined,
    };
    const read = readPersistedWorkspaceState("user-1", storage);
    expect(read?.principalID).toBe("user-1");
  });
});
