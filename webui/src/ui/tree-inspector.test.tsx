import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { InspectorPanel, TreeView } from "./index";

type Node = { id: string; name: string; children: Node[] };
const tree: Node[] = [
  { id: "root", name: "Root", children: [{ id: "child", name: "Child", children: [] }] },
];

const getChildren = (node: Node) => node.children;
const getKey = (node: Node) => node.id;

describe("082 TreeView / InspectorPanel", () => {
  it("TreeView 渲染树节点与展开/折叠控件", () => {
    const markup = renderToStaticMarkup(
      createElement(TreeView<Node>, { nodes: tree, getChildren, getKey, renderNode: (node) => node.name, expandAll: true }),
    );
    expect(markup).toContain("tree-view");
    expect(markup).toContain("Root");
    expect(markup).toContain("Child");
    expect(markup).toContain('role="tree"');
  });

  it("TreeView 未展开时折叠子节点", () => {
    const markup = renderToStaticMarkup(
      createElement(TreeView<Node>, { nodes: tree, getChildren, getKey, renderNode: (node) => node.name }),
    );
    expect(markup).toContain("Root");
    expect(markup).not.toContain(">Child<");
  });

  it("InspectorPanel 渲染标题、字段(mono)与状态区", () => {
    const markup = renderToStaticMarkup(
      createElement(InspectorPanel, {
        title: "Root",
        fields: [
          { label: "code", value: "root", mono: true },
          { label: "status", value: "active" },
        ],
      }),
    );
    expect(markup).toContain("inspector-panel");
    expect(markup).toContain("Root");
    expect(markup).toContain("code-text-value");
    expect(markup).toContain("inspector-field-value");
  });
});