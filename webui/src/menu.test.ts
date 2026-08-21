import { describe, expect, it } from "vitest";
import type { ManifestMenu, ManifestRoute } from "@webui/contracts";
import { buildMenuTree, getWorkspaceTabTargetIndex, isWorkspaceTabClosable, shouldIsolateMobileSidebar } from "./components/AppShell";

const route = (id: string): ManifestRoute => ({
  moduleId: "test",
  id,
  path: `/${id}`,
  entryId: id,
  titleMessageId: `webui.test.${id}`,
  layout: "app",
  deliveryState: "implemented",
  default: false,
  unauthenticatedDefault: false,
  access: "allowed",
});

const menu = (id: string, parentId?: string): ManifestMenu => ({
  moduleId: "test",
  id,
  parentId,
  routeId: id,
  titleMessageId: `webui.test.${id}`,
  iconId: "activity",
  order: 1,
});

describe("宿主菜单树", () => {
  it("按 parentId 组装多级菜单，并把孤立父级保留为根节点", () => {
    const tree = buildMenuTree([
      { item: menu("root"), route: route("root") },
      { item: menu("child", "root"), route: route("child") },
      { item: menu("grandchild", "child"), route: route("grandchild") },
      { item: menu("orphan", "missing"), route: route("orphan") },
    ]);

    expect(tree.map((entry) => entry.item.id)).toEqual(["root", "orphan"]);
    expect(tree[0].children[0].item.id).toBe("child");
    expect(tree[0].children[0].children[0].item.id).toBe("grandchild");
  });
});

describe("宿主工作区页签", () => {
  it("保留默认页签不可关闭，其他已访问页签可关闭", () => {
    expect(isWorkspaceTabClosable({ ...route("home"), default: true })).toBe(false);
    expect(isWorkspaceTabClosable(route("detail"))).toBe(true);
  });

  it("按 roving tab 规则计算方向键目标", () => {
    expect(getWorkspaceTabTargetIndex("ArrowRight", 1, 3)).toBe(2);
    expect(getWorkspaceTabTargetIndex("ArrowRight", 2, 3)).toBe(0);
    expect(getWorkspaceTabTargetIndex("ArrowLeft", 0, 3)).toBe(2);
    expect(getWorkspaceTabTargetIndex("Home", 2, 3)).toBe(0);
    expect(getWorkspaceTabTargetIndex("End", 0, 3)).toBe(2);
    expect(getWorkspaceTabTargetIndex("Enter", 0, 3)).toBeUndefined();
  });
});

describe("宿主移动侧栏", () => {
  it("仅在移动视口且抽屉关闭时隔离侧栏焦点", () => {
    expect(shouldIsolateMobileSidebar(true, false)).toBe(true);
    expect(shouldIsolateMobileSidebar(true, true)).toBe(false);
    expect(shouldIsolateMobileSidebar(false, false)).toBe(false);
  });
});
