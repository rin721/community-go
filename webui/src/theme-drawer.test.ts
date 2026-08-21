import { beforeAll, describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { getThemePanelTargetIndex, ThemeDrawer } from "./components/ThemeDrawer";
import { defaultTheme } from "./theme";
import { initializeI18n } from "./i18n";

describe("宿主主题 Drawer", () => {
  beforeAll(async () => {
    await initializeI18n();
  });

  it("公开对话框标题、分区和初始焦点入口", () => {
    const markup = renderToStaticMarkup(createElement(ThemeDrawer, { open: true, theme: defaultTheme, onChange: () => undefined, onReset: () => undefined, onClose: () => undefined }));

    expect(markup).toContain('role="dialog"');
    expect(markup).toContain('aria-labelledby="webui-theme-drawer-title"');
    expect(markup).toContain('role="tablist"');
    expect(markup).toContain('role="tab"');
    expect(markup).toContain('tabindex="0"');
    expect(markup).toContain('aria-controls="theme-panel-appearance"');
    expect(markup).toContain('aria-labelledby="webui-theme-tab-appearance"');
    expect(markup).toContain('aria-pressed="true"');
    expect(markup).toContain('data-drawer-initial-focus="true"');
  });

  it("关闭时隔离遮罩和 Drawer 的焦点入口", () => {
    const markup = renderToStaticMarkup(createElement(ThemeDrawer, { open: false, theme: defaultTheme, onChange: () => undefined, onReset: () => undefined, onClose: () => undefined }));

    expect(markup).toContain('aria-hidden="true"');
    expect(markup).toContain('disabled=""');
    expect(markup).toContain('inert=""');
  });

  it("按 roving tab 规则计算主题分区焦点目标", () => {
    expect(getThemePanelTargetIndex("ArrowRight", 0, 4)).toBe(1);
    expect(getThemePanelTargetIndex("ArrowLeft", 0, 4)).toBe(3);
    expect(getThemePanelTargetIndex("ArrowDown", 3, 4)).toBe(0);
    expect(getThemePanelTargetIndex("Home", 2, 4)).toBe(0);
    expect(getThemePanelTargetIndex("End", 0, 4)).toBe(3);
    expect(getThemePanelTargetIndex("Enter", 0, 4)).toBeUndefined();
  });
});
