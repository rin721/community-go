import { beforeAll, describe, expect, it } from "vitest";
import { createElement } from "react";
import { MemoryRouter } from "react-router-dom";
import { renderToStaticMarkup } from "react-dom/server";
import { initializeI18n } from "./i18n";
import { SystemStatePage } from "./pages/SystemStatePage";

describe("宿主系统状态页", () => {
  beforeAll(async () => {
    await initializeI18n();
  });

  it("以低敏文案表达模块路由加载失败", () => {
    const markup = renderToStaticMarkup(createElement(MemoryRouter, null, createElement(SystemStatePage, { kind: "routeError" })));

    expect(markup).toContain("页面加载失败");
    expect(markup).toContain("页面暂时无法显示");
    expect(markup).not.toContain("ErrorInfo");
  });
});
