import { describe, expect, it } from "vitest";
import { toggleSelection } from "./SessionsPage";

describe("IAM 会话管理选择集", () => {
  it("切换单个会话并保持不可变", () => {
    const empty = new Set<string>();
    const added = toggleSelection(empty, "hash-a");
    expect([...added]).toEqual(["hash-a"]);
    expect(empty.size).toBe(0);
    const removed = toggleSelection(added, "hash-a");
    expect(removed.size).toBe(0);
  });

  it("多个会话独立切换", () => {
    let selection = new Set<string>();
    selection = toggleSelection(selection, "a");
    selection = toggleSelection(selection, "b");
    expect([...selection].sort()).toEqual(["a", "b"]);
    selection = toggleSelection(selection, "a");
    expect([...selection]).toEqual(["b"]);
  });
});