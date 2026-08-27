import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { DataTable, DataTableRowMenu } from "./index";

interface DemoRow {
  id: string;
  name: string;
  state: string;
}

const demoRows: DemoRow[] = [
  { id: "u1", name: "Alice", state: "active" },
  { id: "u2", name: "Bob", state: "disabled" },
];

const demoColumns = [
  { id: "name", header: "Name", cell: (row: DemoRow) => row.name },
  { id: "state", header: "State", cell: (row: DemoRow) => row.state },
];

function tableWith(
  props: Partial<Parameters<typeof DataTable<DemoRow>>[0]> = {},
) {
  return createElement(DataTable<DemoRow>, {
    columns: demoColumns,
    rows: demoRows,
    ariaLabel: "demo table",
    getRowKey: (row) => row.id,
    ...props,
  });
}

describe("082 DataTable 增强", () => {
  it("默认不渲染增强工具条与行菜单（兼容既有调用），密度保持 default", () => {
    const markup = renderToStaticMarkup(tableWith());
    expect(markup).not.toContain("data-table-toolbar");
    expect(markup).not.toContain("data-table-row-menu");
    expect(markup).toContain('data-density="default"');
    expect(markup).toContain("Alice");
    expect(markup).toContain("Bob");
  });

  it("density 档落到 data-density 属性", () => {
    const markup = renderToStaticMarkup(tableWith({ enhancements: { density: "compact" } }));
    expect(markup).toContain('data-density="compact"');
  });

  it("stickyHeader 落到 data-sticky 属性", () => {
    const markup = renderToStaticMarkup(tableWith({ enhancements: { stickyHeader: true } }));
    expect(markup).toContain('data-sticky="true"');
  });

  it("columnVisibility 渲染列显隐菜单且排除已经 invisible 的列", () => {
    const cols = [
      { id: "name", header: "Name", cell: (row: DemoRow) => row.name },
      { id: "state", header: "State", cell: (row: DemoRow) => row.state, visible: false },
    ];
    const markup = renderToStaticMarkup(
      createElement(DataTable<DemoRow>, {
        columns: cols,
        rows: demoRows,
        ariaLabel: "demo",
        getRowKey: (row) => row.id,
        enhancements: { columnVisibility: { initialVisible: ["name", "state"] } },
      }),
    );
    expect(markup).toContain("data-table-toolbar");
    expect(markup).toContain("data-table-columns-menu");
    // visible:false 的列不出现在菜单（不可被恢复，保持既有语义）
    expect(markup).not.toContain('aria-checked="false"');
  });

  it("renderRowMenu 渲染真实操作按钮并在空数组时不渲染菜单列", () => {
    const withItems = renderToStaticMarkup(
      createElement(DataTable<DemoRow>, {
        columns: demoColumns,
        rows: demoRows,
        ariaLabel: "demo",
        getRowKey: (row) => row.id,
        enhancements: {
          renderRowMenu: (_row) => [{ key: "revoke", label: "吊销", onSelect: () => undefined }],
        },
      }),
    );
    expect(withItems).toContain("吊销");
    expect(withItems).toContain("data-table-row-menu");

    const empty = renderToStaticMarkup(
      createElement(DataTable<DemoRow>, {
        columns: demoColumns,
        rows: demoRows,
        ariaLabel: "demo",
        getRowKey: (row) => row.id,
        enhancements: { renderRowMenu: () => [] },
      }),
    );
    expect(empty).not.toContain("data-table-row-menu");
  });

  it("DataTableRowMenu 对空菜单返回 null", () => {
    const markup = renderToStaticMarkup(
      createElement(DataTableRowMenu<DemoRow>, {
        row: demoRows[0],
        index: 0,
        renderRowMenu: () => [],
      }),
    );
    expect(markup).toBe("");
  });
});