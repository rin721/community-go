import { describe, expect, it } from "vitest";
import { buildTree, effectivePolicy, type MenuTreeNode } from "./MenusPage";
import type { Menu } from "./api";

function makeMenu(partial: Partial<Menu> & { id: string; defaultParentId?: string; defaultOrder: number }): Menu {
  return {
    moduleId: "nav",
    routeId: "route",
    titleMessageId: "t",
    iconId: "",
    defaultParentId: partial.defaultParentId ?? "",
    defaultOrder: partial.defaultOrder,
    enabled: true,
    parentId: "",
    order: 0,
    version: 1,
    overridden: false,
    parentOverridden: false,
    orderOverridden: false,
    ...partial,
  } as Menu;
}

describe("082 MenusPage 导航树(REQ-019)", () => {
  it("effectivePolicy 返回默认或覆盖后的父级/顺序", () => {
    const defaultMenu = makeMenu({ id: "a", defaultParentId: "root", defaultOrder: 2 });
    expect(effectivePolicy(defaultMenu)).toEqual({ enabled: true, parent: "root", order: 2 });
    const overridden = makeMenu({ id: "b", defaultParentId: "root", defaultOrder: 2, parentId: "other", order: 5, parentOverridden: true, orderOverridden: true });
    expect(effectivePolicy(overridden)).toEqual({ enabled: true, parent: "other", order: 5 });
  });

  it("buildTree 按有效父级组装树且根节点排序稳定", () => {
    const tree = buildTree([
      makeMenu({ id: "child", defaultParentId: "root", defaultOrder: 1 }),
      makeMenu({ id: "root", defaultOrder: 2 }),
      makeMenu({ id: "rootB", defaultOrder: 1 }),
    ]);
    expect(tree.map((node: MenuTreeNode) => node.menu.id)).toEqual(["rootB", "root"]);
    const root = tree.find((node) => node.menu.id === "root");
    expect(root?.children.map((node) => node.menu.id)).toEqual(["child"]);
  });
});