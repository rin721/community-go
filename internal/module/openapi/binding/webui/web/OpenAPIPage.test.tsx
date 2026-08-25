// @vitest-environment jsdom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import enMessages from "./locale/en-US.json";
import OpenAPIPage from "./OpenAPIPage";

// The workspace renders the real HeroUI controls against the real generated
// contract snapshot (openapi-spec.ts); execution is exercised through mocked
// fetch/session (R075-005).

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

function clickByTestId(host: HTMLElement, testId: string): HTMLElement {
  const element = host.querySelector(`[data-testid="${testId}"]`);
  if (!element) throw new Error(`testid ${testId} not found`);
  act(() => { (element as HTMLElement).click(); });
  return element as HTMLElement;
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
  vi.unstubAllGlobals();
});

describe("OpenAPIPage Apifox workspace", () => {
  it("renders the resource tree with operations and models", () => {
    const { host, unmount } = renderPage();
    expect(host.querySelectorAll('[data-testid="openapi-tree-item"]').length).toBeGreaterThan(0);
    expect(host.querySelectorAll('[data-testid="openapi-model-item"]').length).toBeGreaterThan(0);
    expect(host.textContent).toContain("auth.audit.list");
    unmount();
  });

  it("opens a tab, toggles docs/debug and shows the request bar", () => {
    const { host, unmount } = renderPage();
    const item = [...host.querySelectorAll('[data-testid="openapi-tree-item"]')].find((candidate) => candidate.textContent?.includes("iam.accounts.list")) as HTMLElement;
    act(() => { item.click(); });
    expect(host.querySelector('[data-testid="openapi-tab-op:get-/api/v1/iam/accounts"]')).not.toBeNull();
    // Debug is the default mode: parameter inputs + Send button visible.
    expect(host.querySelectorAll("input").length).toBeGreaterThan(0);
    expect(host.textContent).toContain("Send");
    // Switch to docs mode: parameter read table + response table visible.
    clickByTestId(host, "openapi-mode-docs");
    expect(host.textContent).toContain("Responses");
    unmount();
  });

  it("executes a request and renders the right response panel", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ hello: "world" }), { status: 200, statusText: "OK" }));
    vi.stubGlobal("fetch", fetchMock);
    const { host, unmount } = renderPage();
    const item = [...host.querySelectorAll('[data-testid="openapi-tree-item"]')].find((candidate) => candidate.textContent?.includes("iam.session.read")) as HTMLElement;
    act(() => { item.click(); });
    const send = [...host.querySelectorAll("button")].find((candidate) => candidate.textContent?.includes("Send"));
    act(() => { send!.click(); });
    await act(async () => { await new Promise((resolve) => setTimeout(resolve, 0)); });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const panel = host.querySelector('[data-testid="openapi-response"]');
    expect(panel).not.toBeNull();
    expect(panel!.textContent).toContain("200 OK");
    expect(panel!.textContent).toContain("hello");
    expect(panel!.textContent).toContain("world");
    unmount();
  });

  // The idle panel shows "Send a request…"; the executed state shows the status
  // and the highlighted body; the assertion above covers the happy path.
  it("disables execution in mock demo builds with an explicit notice", () => {
    vi.stubEnv("VITE_WEBUI_DATA_SOURCE", "mock");
    const { host, unmount } = renderPage();
    const item = [...host.querySelectorAll('[data-testid="openapi-tree-item"]')].find((candidate) => candidate.textContent?.includes("iam.session.read")) as HTMLElement;
    act(() => { item.click(); });
    expect(host.textContent).toContain("Execution is unavailable in mock demo builds");
    const buttons = [...host.querySelectorAll("button")].map((candidate) => candidate.textContent ?? "");
    expect(buttons.some((text) => text.includes("Send"))).toBe(false);
    unmount();
  });

  it("opens a model tab from the tree", () => {
    const { host, unmount } = renderPage();
    const item = [...host.querySelectorAll('[data-testid="openapi-model-item"]')].find((candidate) => candidate.textContent?.includes("AccountResponse")) as HTMLElement;
    act(() => { item.click(); });
    expect(host.querySelector('[data-testid="openapi-model-pane"]')).not.toBeNull();
    expect(host.textContent).toContain("AccountResponse");
    unmount();
  });

  it("restores the active tab from the deep link", () => {
    window.history.replaceState(null, "", "/openapi?op=get-/api/v1/iam/session&mode=docs");
    const { host, unmount } = renderPage();
    expect(host.querySelector('[data-testid="openapi-tab-op:get-/api/v1/iam/session"]')).not.toBeNull();
    // docs mode: response table present, parameter input grid absent.
    expect(host.textContent).toContain("Responses");
    unmount();
  });
});