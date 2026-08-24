// @vitest-environment jsdom
import { act, createElement } from "react";
import { createRoot } from "react-dom/client";
import { beforeEach, describe, expect, it } from "vitest";
import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import enMessages from "./locale/en-US.json";
import OpenAPIPage from "./OpenAPIPage";

// OpenAPIPage 以真实平台组件 + 真实契约快照渲染（R075-003）：不 mock 任何第三方，
// 生成器产物（openapi-spec.ts）直接进入测试，同时守护快照形状可解析。

function renderPage(): { unmount: () => void; host: HTMLDivElement } {
  const host = document.createElement("div");
  document.body.appendChild(host);
  const root = createRoot(host);
  act(() => { root.render(<OpenAPIPage />); });
  return {
    unmount: () => {
      act(() => { root.unmount(); });
      host.remove();
    },
    host,
  };
}

describe("OpenAPIPage", () => {
  beforeEach(async () => {
    await i18n.use(initReactI18next).init({
      lng: "en-US",
      fallbackLng: "en-US",
      resources: { "en-US": { "webui.openapi": enMessages } },
      initImmediate: false,
      interpolation: { escapeValue: false },
    });
  });

  it("renders the platform page shell with translated copy", () => {
    const { host, unmount } = renderPage();
    expect(host.querySelector(".module-page")).not.toBeNull();
    expect(host.textContent).toContain("API Docs");
    expect(host.textContent).toContain("About this reference");
    expect(host.textContent).toContain("Contract snapshot: api/openapi.yaml");
    unmount();
  });

  it("renders operations grouped with method badges and known operation ids", () => {
    const { host, unmount } = renderPage();
    const operations = host.querySelectorAll('[data-testid="openapi-operation"]');
    expect(operations.length).toBeGreaterThan(0);
    // 真实契约包含 auth/iam/organization/navigation/todo 的全部 operation。
    expect(host.textContent).toContain("auth.audit.list");
    expect(host.textContent).toContain("iam.session.read");
    expect(host.textContent).toContain("createTodo");
    expect(host.querySelectorAll("[data-method]").length).toBe(operations.length);
    unmount();
  });

  it("expands an operation to show parameter and response tables", () => {
    const { host, unmount } = renderPage();
    const first = host.querySelector('[data-testid="openapi-operation"]') as HTMLElement;
    const toggle = first.querySelector("button") as HTMLButtonElement;
    act(() => { toggle.click(); });
    expect(first.querySelectorAll("table").length).toBeGreaterThan(0);
    // 响应表列头为本地化文案。
    expect(first.textContent).toContain("Status");
    unmount();
  });

  it("renders schema cards with property tables", () => {
    const { host, unmount } = renderPage();
    const schemas = host.querySelectorAll('[data-testid="openapi-schema"]');
    expect(schemas.length).toBeGreaterThan(0);
    expect(host.textContent).toContain("AccountResponse");
    unmount();
  });
});