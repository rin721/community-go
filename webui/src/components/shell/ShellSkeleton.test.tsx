import { beforeAll, describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { initializeI18n } from "../../i18n";
import { PageSkeleton, ShellSkeleton } from "./ShellSkeleton";

describe("宿主 loading skeleton", () => {
  beforeAll(async () => {
    await initializeI18n();
  });

  it("ShellSkeleton 只输出中性几何与低敏 label，不包含业务值", () => {
    const markup = renderToStaticMarkup(createElement(ShellSkeleton));
    expect(markup).toContain("shell-skeleton");
    expect(markup).toContain('aria-busy="true"');
    expect(markup).toContain("visually-hidden");
    expect(markup).toMatch(/后台骨架加载中/);
    expect(markup).toContain("shell-skeleton-sidebar");
    expect(markup).toContain("shell-skeleton-workspace");
  });

  it("PageSkeleton 保留 PageHeader 与主体 surface 几何，并带可访问 label", () => {
    const markup = renderToStaticMarkup(createElement(PageSkeleton));
    expect(markup).toContain("page-skeleton");
    expect(markup).toContain('aria-busy="true"');
    expect(markup).toContain("page-skeleton-header");
    expect(markup).toMatch(/页面内容加载中/);
  });
});