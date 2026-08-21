import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { DataTable, EmptyState, Pagination, createPaginationItems } from "./ui";

describe("公共管理 UI 模式", () => {
  it("renders a selectable data table with an empty state", () => {
    const markup = renderToStaticMarkup(createElement(DataTable<{ name: string }>, { columns: [{ id: "name", header: "Name", cell: (row) => row.name }], rows: [], selectable: true, selectionLabel: "Select row", emptyState: createElement(EmptyState, { title: "No records" }) }));
    expect(markup).toContain("data-table");
    expect(markup).toContain("No records");
    expect(markup).toContain("Select row");
  });

  it("keeps pagination compact while preserving first, current and last pages", () => {
    expect(createPaginationItems(6, 20)).toEqual([1, "ellipsis-left", 5, 6, 7, "ellipsis-right", 20]);
    const markup = renderToStaticMarkup(createElement(Pagination, { page: 6, pageCount: 20, total: 200, totalLabel: (total) => `Total ${total}`, pageLabel: (page) => `Page ${page}`, previousLabel: "Previous", nextLabel: "Next", onPageChange: () => undefined }));
    expect(markup).toContain("aria-current=\"page\"");
    expect(markup).toContain("Total 200");
  });
});
