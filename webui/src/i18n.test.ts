import { beforeAll, describe, expect, it } from "vitest";
import { i18n, initializeI18n, namespaceForMessage, translateMessage } from "./i18n";

describe("WebUI i18n contract", () => {
  beforeAll(async () => {
    await initializeI18n();
  });

  it("loads host and module namespaces through the single instance", () => {
    expect(i18n.isInitialized).toBe(true);
    expect(i18n.hasResourceBundle("zh-CN", "webui.host")).toBe(true);
    expect(i18n.hasResourceBundle("zh-CN", "webui.auth")).toBe(true);
    expect(i18n.hasResourceBundle("zh-CN", "webui.ops")).toBe(true);
    expect(namespaceForMessage("webui.auth.setup.title")).toBe("webui.auth");
    expect(translateMessage("webui.auth.setup.title")).toBe("首次设置");
  });

  it("fails closed with a diagnostic message when a key is missing", () => {
    expect(translateMessage("webui.auth.notDeclared")).toBe("翻译资源缺失");
    expect(translateMessage("webui.unknown.notDeclared")).toBe("翻译资源缺失");
  });
});
