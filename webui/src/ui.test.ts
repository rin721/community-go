import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { CapabilityBanner, ConfirmDialog, DataTable, DataToolbar, Drawer, EmptyState, FilterPanel, Pagination, Toast, createPaginationItems, getDataTableSelectionState } from "./ui";

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
    const markup = renderToStaticMarkup(createElement(Drawer, { open: true, title: "Create", closeLabel: "Close", onClose: () => undefined, children: createElement("input", { placeholder: "Name" }) }));

    expect(markup).toContain('role="dialog"');
    expect(markup).toContain('aria-modal="true"');
    expect(markup).toContain("aria-labelledby=");
    expect(markup).toContain('data-drawer-initial-focus="true"');
  });

  it("isolates a closed shared drawer from pointer and keyboard focus", () => {
    const markup = renderToStaticMarkup(createElement(Drawer, { open: false, title: "Create", closeLabel: "Close", onClose: () => undefined, children: null }));

    expect(markup).toContain('aria-hidden="true"');
    expect(markup).toContain('disabled=""');
    expect(markup).toContain('inert=""');
  });

  it("keeps toast feedback controlled by module-provided i18n labels", () => {
    const markup = renderToStaticMarkup(createElement(Toast, { open: true, tone: "success", title: "Saved", detail: "The record is ready.", closeLabel: "Dismiss", onClose: () => undefined }));

    expect(markup).toContain('role="status"');
    expect(markup).toContain('aria-live="polite"');
    expect(markup).toContain('aria-label="Dismiss"');
    expect(markup).toContain("The record is ready.");
    expect(renderToStaticMarkup(createElement(Toast, { open: false, title: "Hidden", closeLabel: "Dismiss", onClose: () => undefined }))).toBe("");
  });

  it("provides a focus-managed confirmation dialog with localized actions", () => {
    const markup = renderToStaticMarkup(createElement(ConfirmDialog, { open: true, title: "Delete record?", description: "This action cannot be undone.", confirmLabel: "Delete", cancelLabel: "Cancel", closeLabel: "Close", onConfirm: () => undefined, onCancel: () => undefined }));

    expect(markup).toContain('role="dialog"');
    expect(markup).toContain('aria-modal="true"');
    expect(markup).toContain('aria-describedby=');
    expect(markup).toContain('data-confirm-initial-focus="true"');
    expect(markup).toContain("Delete");
    expect(markup).toContain("Cancel");
  });

  it("isolates a closed confirmation dialog from pointer and keyboard focus", () => {
    const markup = renderToStaticMarkup(createElement(ConfirmDialog, { open: false, title: "Delete record?", confirmLabel: "Delete", cancelLabel: "Cancel", closeLabel: "Close", onConfirm: () => undefined, onCancel: () => undefined }));

    expect(markup).toContain('aria-hidden="true"');
    expect(markup).toContain('disabled=""');
    expect(markup).toContain('inert=""');
  });
});
