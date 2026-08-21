import { beforeAll, describe, expect, it } from "vitest";
import { createElement } from "react";
import { MemoryRouter } from "react-router-dom";
import { renderToStaticMarkup } from "react-dom/server";
import { BlankLayout } from "./components/AppShell";
import { initializeI18n } from "./i18n";

describe("宿主认证壳", () => {
  beforeAll(async () => {
    await initializeI18n();
  });

  it("提供与宿主一致的品牌、语言和主题入口", () => {
    const markup = renderToStaticMarkup(createElement(MemoryRouter, null, createElement(BlankLayout)));

    expect(markup).toContain('class="blank-header"');
    expect(markup).toContain('aria-label="语言"');
    expect(markup).toContain('aria-label="切换主题模式"');
    expect(markup).toContain('aria-label="主题配置"');
    expect(markup).toContain('class="blank-content"');
  });
});
