// @vitest-environment jsdom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import enMessages from "./locale/en-US.json";
import OpenAPIPage from "./OpenAPIPage";

// The workspace renders the real platform components against the real
// generated contract snapshot (openapi-spec.ts); no third-party is involved
// (R075-004). Execution is exercised through mocked fetch/session below.

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

function clickButtonContaining(host: HTMLElement, text: string) {
  const button = [...host.querySelectorAll("button")].find((candidate) => candidate.textContent?.includes(text));
  if (!button) throw new Error(`button containing ${text} not found`);
  act(() => { button.click(); });
}

beforeEach(async () => {
  await i18n.use(initReactI18next).init({
    lng: "en-US",
    fallbackLng: "en-US",
    resources: { "en-US": { "webui.openapi": enMessages } },
    initImmediate: false,
    interpolation: { escapeValue: false },
  });
  window.history.replaceState(null, "", "/openapi");
  vi.restoreAllMocks();
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("OpenAPIPage workspace", () => {
  it("renders the operation tree with known operation ids", () => {
    const { host, unmount } = renderPage();
    const items = host.querySelectorAll('[data-testid="openapi-tree-item"]');
    expect(items.length).toBeGreaterThan(0);
    expect(host.textContent).toContain("auth.audit.list");
    expect(host.textContent).toContain("iam.session.read");
    unmount();
  });

  it("filters the tree by search input", () => {
    const { host, unmount } = renderPage();
    const input = host.querySelector("input[type=search]") as HTMLInputElement;
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")!.set!;
    act(() => {
      setter.call(input, "navigation");
      input.dispatchEvent(new Event("input", { bubbles: true }));
    });
    const items = host.querySelectorAll('[data-testid="openapi-tree-item"]');
    expect(items.length).toBeGreaterThan(0);
    for (const item of items) expect(item.textContent).toContain("navigation");
    unmount();
  });

  it("opens an operation detail with params, body and execute button", () => {
    const { host, unmount } = renderPage();
    // iam.accounts.list 在真实契约中有查询参数（offset/limit）。
    const item = [...host.querySelectorAll('[data-testid="openapi-tree-item"]')].find((candidate) => candidate.textContent?.includes("iam.accounts.list")) as HTMLElement | undefined;
    expect(item).toBeDefined();
    act(() => { item!.click(); });
    expect(host.querySelector('[data-testid="openapi-operation"]')).not.toBeNull();
    expect(host.textContent).toContain("Parameters");
    expect(host.textContent).toContain("Responses");
    expect(host.textContent).toContain("Execute");
    // deep link was written to the URL (op id 含路径，会被 URL 编码)。
    expect(window.location.search).toContain("view=operations&op=get-");
    expect(window.location.search).toContain("iam%2Faccounts");
    unmount();
  });

  it("executes a request and shows the response panel", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ hello: "world" }), { status: 200, statusText: "OK" }));
    vi.stubGlobal("fetch", fetchMock);
    const { host, unmount } = renderPage();
    const item = [...host.querySelectorAll('[data-testid="openapi-tree-item"]')].find((candidate) => candidate.textContent?.includes("iam.session.read")) as HTMLElement | undefined;
    act(() => { item!.click(); });
    clickButtonContaining(host, "Execute");
    await act(async () => { await Promise.resolve(); });
    expect(fetchMock).toHaveBeenCalled();
    expect(host.querySelector('[data-testid="openapi-response"]')).not.toBeNull();
    expect(host.textContent).toContain("200 OK");
    expect(host.textContent).toContain('"hello": "world"');
    unmount();
  });

  it("disables execution in mock demo builds with an explicit notice", () => {
    vi.stubEnv("VITE_WEBUI_DATA_SOURCE", "mock");
    const { host, unmount } = renderPage();
    const item = [...host.querySelectorAll('[data-testid="openapi-tree-item"]')].find((candidate) => candidate.textContent?.includes("iam.session.read")) as HTMLElement | undefined;
    act(() => { item!.click(); });
    expect(host.textContent).toContain("Execution is unavailable in mock demo builds");
    const buttons = [...host.querySelectorAll("button")].map((candidate) => candidate.textContent ?? "");
    expect(buttons.some((text) => text.includes("Execute"))).toBe(false);
    unmount();
  });

  it("switches to the schemas view listing models", () => {
    const { host, unmount } = renderPage();
    clickButtonContaining(host, "Schemas");
    const models = host.querySelectorAll('[data-testid="openapi-model-item"]');
    expect(models.length).toBeGreaterThan(0);
    expect(host.textContent).toContain("AccountResponse");
    unmount();
  });
});