import { beforeAll, describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import type { ManifestRoute } from "@webui/contracts";
import { RouteSearch } from "./components/RouteSearch";
import { initializeI18n } from "./i18n";

const route: ManifestRoute = {
  moduleId: "test",
  id: "dashboard",
  path: "/dashboard",
  entryId: "dashboard",
  titleMessageId: "webui.test.dashboard",
  layout: "app",
  deliveryState: "implemented",
  default: true,
  unauthenticatedDefault: false,
  access: "allowed",
};

describe("宿主路由搜索", () => {
  beforeAll(async () => {
    await initializeI18n();
  });

  it("暴露对话框、组合框和当前选中项语义", () => {
    const markup = renderToStaticMarkup(createElement(MemoryRouter, null, createElement(RouteSearch, { open: true, routes: [route], onClose: () => undefined })));

    expect(markup).toContain('role="dialog"');
    expect(markup).toContain('aria-modal="true"');
    expect(markup).toContain('role="combobox"');
    expect(markup).toContain('aria-controls="webui-route-search-results"');
    expect(markup).toContain('aria-activedescendant="webui-route-search-dashboard"');
    expect(markup).toContain('role="option"');
    expect(markup).toContain('aria-selected="true"');
  });

  it("没有可访问路由时表达空结果状态", () => {
    const markup = renderToStaticMarkup(createElement(MemoryRouter, null, createElement(RouteSearch, { open: true, routes: [], onClose: () => undefined })));

    expect(markup).toContain('role="status"');
  });
});
