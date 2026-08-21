import { describe, expect, it } from "vitest";
import { flatten } from "./DepartmentsPage";

describe("Organization 管理页面", () => {
  it("按树层级生成稳定的部门列表", () => {
    const result = flatten([{ id: "root", code: "root", name: "总部", active: true, archived: false, version: 1, children: [{ id: "child", code: "child", name: "子部门", parentId: "root", active: true, archived: false, version: 1, children: [] }] }]);
    expect(result.map(({ item, depth }) => [item.id, depth])).toEqual([["root", 0], ["child", 1]]);
  });
});
