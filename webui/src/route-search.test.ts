// @vitest-environment jsdom
import { beforeAll, describe, expect, it } from "vitest";
import { createElement } from "react";
import { MemoryRouter } from "react-router-dom";
import type { ManifestRoute } from "@webui/sdk/runtime";
import { RouteSearch } from "./components/RouteSearch";
import { initializeI18n } from "./i18n";
import { renderClient } from "./test-utils";

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

function bodyHTML(): string {
  return document.body.innerHTML;
}

describe("宿主路由搜索", () => {
  beforeAll(async () => {
    await initializeI18n();
  });

  it("暴露对话框、组合框和当前选中项语义", () => {
    const { unmount } = renderClient(createElement(MemoryRouter, null, createElement(RouteSearch, { open: true, routes: [route], onClose: () => undefined })));
    try {
      const html = bodyHTML();
      // RAC Modal 经 portal 挂载到 body 附近 fragment（069：overlay 客户端渲染）
      expect(html).toContain('role="dialog"');
      expect(html).toContain('type="search"');
      expect(html).toContain('role="listbox"');
      expect(html).toContain('data-command-kind="route"');
      expect(html).toContain('role="option"');
      expect(html).toContain('aria-selected="true"');
    } finally {
      unmount();
    }
  });

  it("没有可访问路由时表达空结果状态", () => {
    const { unmount } = renderClient(createElement(MemoryRouter, null, createElement(RouteSearch, { open: true, routes: [], onClose: () => undefined })));
    try {
      expect(bodyHTML()).toContain('role="status"');
    } finally {
      unmount();
    }
  });
});
