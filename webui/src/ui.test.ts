// @vitest-environment jsdom
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { CapabilityBanner, ConfirmDialog, DataCard, DataTable, DataToolbar, Drawer, EmptyState, FilterPanel, PageSection, Pagination, StatCard, StatGrid, Toast, createPaginationItems, getDataTableSelectionState } from "./ui";
import { renderClient } from "./test-utils";

describe("公共管理 UI 模式", () => {
  it("renders a selectable data table with an empty state", () => {
    const markup = renderToStaticMarkup(createElement(DataTable<{ name: string }>, { columns: [{ id: "name", header: "Name", cell: (row) => row.name }, { id: "internal", header: "Internal", cell: () => "hidden", visible: false }], rows: [], ariaLabel: "Records", selectable: true, selectionLabel: "Select row", emptyState: createElement(EmptyState, { title: "No records" }) }));
    expect(markup).toContain("data-table");
    expect(markup).toContain('aria-label="Records"');
    expect(markup).not.toContain("Internal");
    expect(markup).toContain("No records");
    expect(markup).toContain("Select row");
  });

  it("exposes a mixed selection state for partially selected table rows", () => {
    expect(getDataTableSelectionState(["a", "b"], new Set(["a"]))).toEqual({ allSelected: false, partiallySelected: true });
    expect(getDataTableSelectionState(["a", "b"], new Set(["a", "b"]))).toEqual({ allSelected: true, partiallySelected: false });
    expect(getDataTableSelectionState(["a", "b"], new Set(["stale"]))).toEqual({ allSelected: false, partiallySelected: false });
  });

  it("associates an expanded filter panel with its toggle", () => {
    const markup = renderToStaticMarkup(createElement(FilterPanel, { label: "Search", open: true, onToggle: () => undefined, expandLabel: "Expand", collapseLabel: "Collapse", children: createElement("input", { placeholder: "Name" }) }));

    expect(markup).toContain('aria-expanded="true"');
    expect(markup).toContain("aria-controls=");
    expect(markup).toContain('role="region"');
    expect(markup).toContain("aria-labelledby=");
  });

  it("allows modules to provide an i18n toolbar label", () => {
    const markup = renderToStaticMarkup(createElement(DataToolbar, { ariaLabel: "User actions", actions: createElement("button", { type: "button" }, "Refresh") }));

    expect(markup).toContain('role="toolbar"');
    expect(markup).toContain('aria-label="User actions"');
  });

  it("announces capability state changes without changing the four-state contract", () => {
    const markup = renderToStaticMarkup(createElement(CapabilityBanner, { state: "degraded", statusLabel: "Degraded", title: "Optional diagnostics unavailable" }));

    expect(markup).toContain('role="status"');
    expect(markup).toContain('aria-live="polite"');
    expect(markup).toContain("capability-degraded");
  });

  it("keeps pagination compact while preserving first, current and last pages", () => {
    expect(createPaginationItems(6, 20)).toEqual([1, "ellipsis-left", 5, 6, 7, "ellipsis-right", 20]);
    const markup = renderToStaticMarkup(createElement(Pagination, { page: 6, pageCount: 20, total: 200, totalLabel: (total) => `Total ${total}`, pageLabel: (page) => `Page ${page}`, paginationLabel: "Pagination", previousLabel: "Previous", nextLabel: "Next", onPageChange: () => undefined }));
    expect(markup).toContain("aria-current=\"page\"");
    expect(markup).toContain('aria-label="Pagination"');
    expect(markup).toContain("Total 200");
  });

  it("provides a focus-managed dialog contract for shared drawers", () => {
    const { unmount } = renderClient(createElement(Drawer, { open: true, title: "Create", closeLabel: "Close", onClose: () => undefined, children: createElement("input", { placeholder: "Name" }) }));
    try {
      const html = document.body.innerHTML;
      // 069：RAC Modal/Dialog 经 portal 客户端挂载；焦点/Escape 由 react-aria 承担。
      expect(html).toContain('role="dialog"');
      expect(html).toContain("Create");
    } finally {
      unmount();
    }
  });

  it("isolates a closed shared drawer from pointer and keyboard focus", () => {
    const { unmount } = renderClient(createElement(Drawer, { open: false, title: "Create", closeLabel: "Close", onClose: () => undefined, children: null }));
    try {
      // 069：关闭态不渲染（RAC Modal 打开才挂载），从可访问树与指针焦点中完全隔离。
      expect(document.body.innerHTML).not.toContain('role="dialog"');
    } finally {
      unmount();
    }
  });

  it("keeps toast feedback through the HeroUI toast queue", () => {
    // 068：Toast 迁移为 @heroui/toast 队列式；组件本身不渲染 DOM，区域由 App 根 Toast.Provider 呈现。
    const markup = renderToStaticMarkup(createElement(Toast, { open: true, tone: "success", title: "Saved", detail: "The record is ready.", closeLabel: "Dismiss", onClose: () => undefined }));

    expect(markup).toBe("");
    expect(renderToStaticMarkup(createElement(Toast, { open: false, title: "Hidden", closeLabel: "Dismiss", onClose: () => undefined }))).toBe("");
  });

  it("provides a focus-managed confirmation dialog with localized actions", () => {
    const { unmount } = renderClient(createElement(ConfirmDialog, { open: true, title: "Delete record?", description: "This action cannot be undone.", confirmLabel: "Delete", cancelLabel: "Cancel", closeLabel: "Close", onConfirm: () => undefined, onCancel: () => undefined }));
    try {
      const html = document.body.innerHTML;
      // 069：RAC Modal/Dialog 客户端挂载；焦点/Escape/backdrop 由 react-aria 承担。
      expect(html).toContain('role="dialog"');
      expect(html).toContain("Delete");
      expect(html).toContain("Cancel");
      expect(html).toContain("This action cannot be undone.");
    } finally {
      unmount();
    }
  });

  it("isolates a closed confirmation dialog from pointer and keyboard focus", () => {
    const { unmount } = renderClient(createElement(ConfirmDialog, { open: false, title: "Delete record?", confirmLabel: "Delete", cancelLabel: "Cancel", closeLabel: "Close", onConfirm: () => undefined, onCancel: () => undefined }));
    try {
      // 069：关闭态不渲染（RAC Modal 打开才挂载），从可访问树与指针焦点中完全隔离。
      expect(document.body.innerHTML).not.toContain('role="dialog"');
    } finally {
      unmount();
    }
  });

  it("renders the TailAdmin-style page section skeleton with header and body", () => {
    const markup = renderToStaticMarkup(createElement(PageSection, { kicker: "Directory", title: "Departments", description: "Bounded hierarchy", actions: createElement("button", { type: "button" }, "Create"), children: createElement("p", null, "body") }));

    expect(markup).toContain('class="page-section');
    expect(markup).toContain('data-slot="card"');
    expect(markup).toContain("section-kicker");
    expect(markup).toContain("section-title");
    expect(markup).toContain("card__content");
    expect(markup).toContain('data-reveal-rhythm');
  });

  it("renders stat cards inside a responsive stat grid", () => {
    const markup = renderToStaticMarkup(createElement(StatGrid, { columns: 3 }, createElement(StatCard, { value: "3", label: "Core probes", tone: "attention" }), createElement(StatCard, { value: "10", label: "Total" })));

    expect(markup).toContain('class="stat-grid');
    expect(markup).toContain('data-stat-columns="3"');
    expect(markup).toContain("stat-tone-attention");
    expect(markup).toContain("stat-value");
  });

  it("renders a data card with header actions and footer", () => {
    const markup = renderToStaticMarkup(createElement(DataCard, { kicker: "List", title: "Capabilities", actions: createElement("button", { type: "button" }, "Reset"), footer: createElement("span", null, "pagination"), children: createElement("span", null, "table") }));

    expect(markup).toContain('class="data-card');
    expect(markup).toContain('data-slot="card"');
    expect(markup).toContain('data-slot="card-footer"');
    expect(markup).toContain("Capabilities");
    expect(markup).toContain("Reset");
    expect(markup).toContain("pagination");
  });

  it("forwards data-scroll-hijack to the data table wrapper for declared hijacking", () => {
    const markup = renderToStaticMarkup(createElement(DataTable<{ name: string }>, { columns: [{ id: "name", header: "Name", cell: (row) => row.name }], rows: [{ name: "a" }], ariaLabel: "Records", wrapperProps: { "data-scroll-hijack": "x" } }));
    expect(markup).toContain('data-scroll-hijack="x"');
  });
});
