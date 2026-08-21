import { beforeAll, describe, expect, it } from "vitest";
import { changeLanguage, ensureRouteLocale, getAvailableLanguages, i18n, initializeI18n, namespaceForMessage, translateMessage } from "./i18n";
import type { ManifestRoute } from "@webui/sdk/runtime";

const authRoute = { titleMessageId: "webui.auth.setup.title" } as ManifestRoute;
const opsRoute = { titleMessageId: "webui.ops.dashboard.title" } as ManifestRoute;

describe("WebUI i18n contract", () => {
  beforeAll(async () => {
    await initializeI18n();
  });

  it("loads host first and module namespaces on eligible route demand", async () => {
    expect(i18n.isInitialized).toBe(true);
    expect(i18n.hasResourceBundle("zh-CN", "webui.host")).toBe(true);
    expect(i18n.hasResourceBundle("zh-CN", "webui.auth")).toBe(false);
    await ensureRouteLocale(authRoute);
    await ensureRouteLocale(opsRoute);
    expect(i18n.hasResourceBundle("zh-CN", "webui.auth")).toBe(true);
    expect(i18n.hasResourceBundle("zh-CN", "webui.ops")).toBe(true);
    expect(i18n.hasResourceBundle("en-US", "webui.host")).toBe(true);
    expect(i18n.hasResourceBundle("en-US", "webui.auth")).toBe(false);
    expect(i18n.hasResourceBundle("en-US", "webui.ops")).toBe(false);
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
    await ensureRouteLocale(authRoute);
    await ensureRouteLocale(opsRoute);
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
