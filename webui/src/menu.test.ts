import { describe, expect, it } from "vitest";
import type { ManifestMenu, ManifestRoute } from "@webui/contracts";
import { buildMenuTree } from "./components/AppShell";

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
