// @vitest-environment jsdom
import { act, createElement, type ReactElement } from "react";
import { createRoot } from "react-dom/client";
import { beforeEach, describe, expect, it, vi } from "vitest";
import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import enMessages from "./locale/en-US.json";
import OpenAPIPage from "./OpenAPIPage";

// OpenAPIPage tests isolate the real third-party renderer: swagger-ui-react is
// mocked at module level (jsdom does not run the real Swagger UI; Playwright
// covers the real render, R075-001). The contract snapshot is NOT mocked: the
// test consumes the generator output (openapi-spec.ts), guarding its shape.
vi.mock("swagger-ui-react", () => ({ default: () => createElement("div", { "data-testid": "swagger-ui" }) }));

function renderPage(element: ReactElement): { unmount: () => void; host: HTMLDivElement } {
  const host = document.createElement("div");
  document.body.appendChild(host);
  const root = createRoot(host);
  act(() => { root.render(element); });
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

  it("renders the platform page shell with translated copy and mounts the spec view", () => {
    const { host, unmount } = renderPage(createElement(OpenAPIPage));
    expect(host.querySelector(".module-page")).not.toBeNull();
    expect(host.textContent).toContain("API Docs");
    expect(host.textContent).toContain("About this reference");
    expect(host.querySelector('[data-testid="swagger-ui"]')).not.toBeNull();
    // 契约快照来源行：真实生成文件的源 revision 随渲染进入页面。
    expect(host.textContent).toContain("Contract snapshot: api/openapi.yaml");
    unmount();
  });
});