import { beforeAll, describe, expect, it } from "vitest";
import { changeLanguage, getAvailableLanguages, i18n, initializeI18n, namespaceForMessage, translateMessage } from "./i18n";

describe("WebUI i18n contract", () => {
  beforeAll(async () => {
    await initializeI18n();
  });

  it("loads host and module namespaces through the single instance", () => {
    expect(i18n.isInitialized).toBe(true);
    expect(i18n.hasResourceBundle("zh-CN", "webui.host")).toBe(true);
    expect(i18n.hasResourceBundle("zh-CN", "webui.auth")).toBe(true);
    expect(i18n.hasResourceBundle("zh-CN", "webui.ops")).toBe(true);
    expect(i18n.hasResourceBundle("en-US", "webui.host")).toBe(true);
    expect(i18n.hasResourceBundle("en-US", "webui.auth")).toBe(true);
    expect(i18n.hasResourceBundle("en-US", "webui.ops")).toBe(true);
    expect(getAvailableLanguages()).toEqual(["en-US", "zh-CN"]);
    expect(namespaceForMessage("webui.auth.setup.title")).toBe("webui.auth");
    expect(translateMessage("webui.auth.setup.title")).toBe("首次设置");
  });

  it("fails closed with a diagnostic message when a key is missing", () => {
    expect(translateMessage("webui.auth.notDeclared")).toBe("翻译资源缺失");
    expect(translateMessage("webui.unknown.notDeclared")).toBe("翻译资源缺失");
  });

  it("switches host and module namespaces through the registry-backed language list", async () => {
    await changeLanguage("en-US");
    expect(translateMessage("webui.host.language")).toBe("Language");
    expect(translateMessage("webui.auth.login.title")).toBe("Sign in");
    expect(translateMessage("webui.ops.dashboard.title")).toBe("Runtime status");
    await changeLanguage("zh-CN");
  });

  it("rejects languages that are not assembled by the host registry", async () => {
    await changeLanguage("zh-CN");
    await expect(changeLanguage("fr-FR")).rejects.toThrow("webui_language_unsupported");
    expect(i18n.language).toBe("zh-CN");
  });
});
