import { beforeAll, describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import type { ManifestMenu, ManifestRoute } from "@webui/sdk/runtime";
import { buildMenuTree, findMenuAncestors, shouldIsolateMobileSidebar } from "./components/AppShell";
import { SidebarMenu } from "./components/shell/SidebarMenu";
import { initializeI18n } from "./i18n";

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
  beforeAll(async () => {
    await initializeI18n();
  });

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

  it("返回当前 route 的祖先链，不含 route 自身", () => {
    const tree = buildMenuTree([
      { item: menu("root"), route: route("root") },
      { item: menu("child", "root"), route: route("child") },
      { item: menu("grandchild", "child"), route: route("grandchild") },
    ]);

    expect(findMenuAncestors(tree, "grandchild")).toEqual(["root", "child"]);
    expect(findMenuAncestors(tree, "root")).toEqual([]);
    expect(findMenuAncestors(tree, "missing")).toEqual([]);
  });

  it("递归菜单子容器常驻 DOM，closed subtree 以 inert/aria-hidden 移出可访问树", async () => {
    const tree = buildMenuTree([
      { item: menu("root"), route: route("root") },
      { item: menu("child", "root"), route: route("child") },
    ]);
    const closed = renderToStaticMarkup(createElement(MemoryRouter, { initialEntries: ["/root"] }, createElement(SidebarMenu, { entries: tree, currentRouteID: "root", expandedMenuIDs: new Set<string>(), onToggle: () => undefined })));
    expect(closed).toContain('class="sidebar-submenu"');
    expect(closed).toContain('inert=""');
    expect(closed).toContain('aria-hidden="true"');
    expect(closed).not.toContain("sidebar-submenu open");

    const opened = renderToStaticMarkup(createElement(MemoryRouter, { initialEntries: ["/root"] }, createElement(SidebarMenu, { entries: tree, currentRouteID: "root", expandedMenuIDs: new Set<string>(["root"]), onToggle: () => undefined })));
    expect(opened).toContain("sidebar-submenu open");
    expect(opened).not.toContain('inert=""');
    expect(opened).toContain("sidebar-submenu-inner");
  });

  it("active link 保留可访问名称与 tooltip，文本层对辅助技术隐藏但引用仍存在", async () => {
    const tree = buildMenuTree([{ item: menu("root"), route: route("root") }]);
    const markup = renderToStaticMarkup(createElement(MemoryRouter, { initialEntries: ["/root"] }, createElement(SidebarMenu, { entries: tree, currentRouteID: "root", expandedMenuIDs: new Set<string>(), onToggle: () => undefined })));
    expect(markup).toMatch(/aria-label="[^"]+"/);
    expect(markup).toMatch(/title="[^"]+"/);
    expect(markup).toContain('<span aria-hidden="true">');
    expect(markup).toContain("sidebar-link active");
  });
});

describe("宿主移动侧栏", () => {
  it("仅在移动视口且抽屉关闭时隔离侧栏焦点", () => {
    expect(shouldIsolateMobileSidebar(true, false)).toBe(true);
    expect(shouldIsolateMobileSidebar(true, true)).toBe(false);
    expect(shouldIsolateMobileSidebar(false, false)).toBe(false);
  });
});
