// @vitest-environment jsdom
import { beforeAll, describe, expect, it } from "vitest";
import { createElement } from "react";
import { ThemeDrawer } from "./components/ThemeDrawer";
import { defaultTheme } from "./theme";
import { initializeI18n } from "./i18n";
import { renderClient } from "./test-utils";

describe("宿主主题 Drawer", () => {
  beforeAll(async () => {
    await initializeI18n();
  });

  it("公开对话框标题、分区和初始焦点入口", () => {
    const { unmount } = renderClient(createElement(ThemeDrawer, { open: true, theme: defaultTheme, onChange: () => undefined, onReset: () => undefined, onClose: () => undefined }));
    try {
      const html = document.body.innerHTML;
      // 069：RAC Modal/Dialog 客户端挂载（portal）。
      expect(html).toContain('role="dialog"');
      expect(html).toContain('role="radiogroup"');
      expect(html).toContain('value="appearance"');
      expect(html).toContain('aria-pressed="true"');
    } finally {
      unmount();
    }
  });

  it("关闭时不渲染遮罩与 Drawer（打开才挂载）", () => {
    const { unmount } = renderClient(createElement(ThemeDrawer, { open: false, theme: defaultTheme, onChange: () => undefined, onReset: () => undefined, onClose: () => undefined }));
    try {
      expect(document.body.innerHTML).not.toContain('role="dialog"');
    } finally {
      unmount();
    }
  });

});
