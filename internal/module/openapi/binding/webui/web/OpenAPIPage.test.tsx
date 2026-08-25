// @vitest-environment jsdom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import enMessages from "./locale/en-US.json";
import OpenAPIPage from "./OpenAPIPage";

// The module renders with platform components against the real generated
// contract snapshot (R075-006); execution is exercised through a mocked fetch.
// The platform Drawer portals to the document body, so drawer assertions read
// document.body.textContent.

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

function rowContaining(host: HTMLElement, text: string): HTMLTableRowElement {
  const row = [...host.querySelectorAll("tr")].find((candidate) => candidate.textContent?.includes(text));
  if (!row) throw new Error(`row containing ${text} not found`);
  return row as HTMLTableRowElement;
}

function clickButtonIn(element: Element, text: string) {
  const button = [...element.querySelectorAll("button")].find((candidate) => candidate.textContent?.trim() === text);
  if (!button) throw new Error(`button ${text} not found`);
  act(() => { (button as HTMLButtonElement).click(); });
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

describe("OpenAPIPage integrated list and drawer", () => {
  it("renders the operation list with search filtering", () => {
    const { host, unmount } = renderPage();
    expect(host.textContent).toContain("API operations");
    expect(host.textContent).toContain("auth.audit.list");
    const input = host.querySelector("input[type=search]") as HTMLInputElement | null;
    expect(input).not.toBeNull();
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")!.set!;
    act(() => {
      setter.call(input, "navigation");
      input!.dispatchEvent(new Event("input", { bubbles: true }));
    });
    expect(host.textContent).not.toContain("auth.audit.list");
    expect(host.textContent).toContain("navigation.menus.list");
    unmount();
  });

  it("opens the docs drawer from a row action", () => {
    const { host, unmount } = renderPage();
    clickButtonIn(rowContaining(host, "iam.accounts.list"), "Docs");
    expect(document.body.textContent).toContain("iam.accounts.list");
    expect(document.body.textContent).toContain("offset");
    unmount();
  });

  it("opens the debug drawer and executes a request", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ hello: "world" }), { status: 200, statusText: "OK" }));
    vi.stubGlobal("fetch", fetchMock);
    const { host, unmount } = renderPage();
    clickButtonIn(rowContaining(host, "iam.session.read"), "Debug");
    expect(document.body.textContent).toContain("iam.session.read");
    const send = [...document.querySelectorAll("button")].find((candidate) => candidate.textContent?.trim() === "Send");
    act(() => { (send as HTMLButtonElement).click(); });
    await act(async () => { await new Promise((resolve) => setTimeout(resolve, 0)); });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const response = document.querySelector('[data-testid="openapi-response"]');
    expect(response).not.toBeNull();
    expect(response!.textContent).toContain("200 OK");
    expect(response!.textContent).toContain("hello");
    unmount();
  });

  it("disables execution in mock demo builds with an explicit notice", () => {
    vi.stubEnv("VITE_WEBUI_DATA_SOURCE", "mock");
    const { host, unmount } = renderPage();
    clickButtonIn(rowContaining(host, "iam.session.read"), "Debug");
    expect(document.body.textContent).toContain("Execution is unavailable in mock demo builds");
    const buttons = [...document.querySelectorAll("button")].map((candidate) => candidate.textContent?.trim() ?? "");
    expect(buttons.filter((text) => text === "Send")).toEqual([]);
    unmount();
  });

  it("opens the model drawer from the models section", () => {
    const { host, unmount } = renderPage();
    const item = [...host.querySelectorAll('[data-testid="openapi-model-item"]')].find((candidate) => candidate.textContent?.includes("AccountResponse")) as HTMLElement;
    act(() => { item.click(); });
    expect(document.body.textContent).toContain("AccountResponse");
    unmount();
  });

  it("restores the docs drawer from the deep link", () => {
    window.history.replaceState(null, "", "/openapi?op=get-/api/v1/iam/accounts&mode=docs");
    const { host, unmount } = renderPage();
    expect(document.body.textContent).toContain("iam.accounts.list");
    expect(document.body.textContent).toContain("Responses");
    unmount();
  });
});