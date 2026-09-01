import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ActiveFilters, FilterBar, FilterDateField, FilterSelect, FilterTextField, SearchInput, SelectField } from "./index";

describe("082 FilterBar / SearchInput", () => {
  it("FilterBar 渲染字段与 result count", () => {
    const markup = renderToStaticMarkup(
      createElement(FilterBar, {
        fields: [
          { key: "status", label: "Status", control: "select", value: "active", options: [{ value: "active", label: "Active" }], onValueChange: () => undefined },
          { key: "archived", label: "Archived", control: "switch", value: true, onValueChange: () => undefined },
        ],
        resultCount: 12,
        ariaLabel: "filters",
      }),
    );
    expect(markup).toContain("filter-bar");
    expect(markup).toContain("Status");
    expect(markup).toContain("Archived");
    expect(markup).toContain("12");
  });

  it("有激活 filter 且提供 onClear 时渲染清除按钮", () => {
    const markup = renderToStaticMarkup(
      createElement(FilterBar, {
        fields: [
          { key: "status", label: "Status", control: "select", value: "active", options: [], onValueChange: () => undefined },
        ],
        onClear: () => undefined,
        clearLabel: "清除",
      }),
    );
    expect(markup).toContain("filter-bar-clear");
    expect(markup).toContain("清除");
  });

  it("无激活 filter 时不渲染清除按钮", () => {
    const markup = renderToStaticMarkup(
      createElement(FilterBar, {
        fields: [
          { key: "status", label: "Status", control: "select", value: "", options: [], onValueChange: () => undefined },
        ],
        onClear: () => undefined,
      }),
    );
    expect(markup).not.toContain("filter-bar-clear");
  });

  it("searchInput 插槽渲染于 filter 行", () => {
    const markup = renderToStaticMarkup(
      createElement(FilterBar, {
        fields: [],
        searchInput: createElement(SearchInput, { value: "", onChange: () => undefined, label: "搜索" }),
      }),
    );
    expect(markup).toContain("search-input");
  });

  it("SearchInput 渲染受控输入与 aria-label", () => {
    const markup = renderToStaticMarkup(
      createElement(SearchInput, { value: "alice", onChange: () => undefined, label: "搜索用户" }),
    );
    expect(markup).toContain('type="search"');
    expect(markup).toContain('aria-label="搜索用户"');
    expect(markup).toContain('value="alice"');
    expect(markup).toContain('data-slot="search-field-group"');
    expect(markup.match(/data-slot="search-field-group"/g)?.length).toBe(1);
  });

  it("筛选日期与文本控件不嵌套完整表单字段壳", () => {
    const dateMarkup = renderToStaticMarkup(<FilterDateField label="开始日期" type="date" value="2026-08-29" onValueChange={() => undefined} />);
    const textMarkup = renderToStaticMarkup(<FilterTextField label="名称" value="alpha" onValueChange={() => undefined} />);
    expect(dateMarkup).toContain("filter-control-date");
    expect(dateMarkup).not.toContain("form-field");
    expect(textMarkup).toContain("filter-control-text");
    expect(textMarkup).not.toContain("form-field");
  });

  it("SelectField 既有契约保持（FilterBar select 复用）", () => {
    const markup = renderToStaticMarkup(
      createElement(SelectField, { label: "状态", value: "active", options: [{ value: "active", label: "Active" }], onValueChange: () => undefined }),
    );
    expect(markup).toContain("form-field");
  });

  it("FilterSelect 将空字符串业务值呈现为明确的全部选项", () => {
    const markup = renderToStaticMarkup(
      createElement(FilterSelect, {
        label: "状态",
        value: "",
        options: [{ value: "", label: "全部状态" }, { value: "active", label: "启用" }],
        onValueChange: () => undefined,
      }),
    );
    expect(markup).toContain("全部状态");
    expect(markup).toContain("__webui_empty_option__");
  });

  it("ActiveFilters 公开逐项清除语义", () => {
    const markup = renderToStaticMarkup(createElement(ActiveFilters, {
      items: [{ key: "status", label: "Status", value: "Active", onClear: () => undefined }],
      clearLabel: "清除",
    }));
    expect(markup).toContain("active-filter");
    expect(markup).toContain("Status: Active");
    expect(markup).toContain("aria-label=\"清除 Status\"");
  });
});
