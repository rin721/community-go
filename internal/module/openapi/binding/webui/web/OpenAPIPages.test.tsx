// @vitest-environment jsdom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import enMessages from "./locale/en-US.json";
import { HostRuntimeProvider, type HostRuntime, type Manifest } from "@webui/sdk/runtime";
import OpenAPILayout, { OVERVIEW_NAV_ID, MODELS_NAV_ID, currentOpenAPISection, tagNavID } from "./OpenAPILayout";
import OpenAPIOverviewPage from "./OpenAPIOverviewPage";
import OpenAPITagPage from "./OpenAPITagPage";
import OpenAPIOperationPage from "./OpenAPIOperationPage";
import OpenAPIModelsPage from "./OpenAPIModelsPage";

// The module renders with platform components against the real generated
// contract snapshot (R075-007); execution is exercised through a mocked fetch.

function hostRuntime(navigate?: (path: string) => void): HostRuntime {
  const manifest: Manifest = { catalogRevision: "test", navigationRevision: "test", routes: [], menu: [] };
  return { manifest, completeAuthentication: async () => undefined, refreshManifest: async () => undefined, navigateToDefault: () => undefined, navigate };
}

function render(ui: React.ReactElement): { unmount: () => void; host: HTMLDivElement } {
  const host = document.createElement("div");
  document.body.appendChild(host);
  const root = createRoot(host);
  act(() => { root.render(ui); });
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

describe("OpenAPILayout shared hierarchy navigation (075-007)", () => {
  it("exposes dynamic category nav items and the active section resolver", () => {
    const rowsById = new Map<string, { tag: string }>([["get-/api/v1/iam/accounts", { tag: "IAM" }]]);
    expect(currentOpenAPISection("/openapi", "", rowsById)).toBe(OVERVIEW_NAV_ID);
    expect(currentOpenAPISection("/openapi/tags", "?tag=IAM", rowsById)).toBe(tagNavID("IAM"));
    expect(currentOpenAPISection("/openapi/operation", "?op=get-/api/v1/iam/accounts&mode=docs", rowsById)).toBe(tagNavID("IAM"));
    expect(currentOpenAPISection("/openapi/models", "", rowsById)).toBe(MODELS_NAV_ID);
  });

  it("navigates to the selected section href through the host runtime", () => {
    const paths: string[] = [];
    const { host, unmount } = render(<HostRuntimeProvider value={hostRuntime((path) => paths.push(path))}><OpenAPILayout><main data-testid="content">content</main></OpenAPILayout></HostRuntimeProvider>);
    expect(host.textContent).toContain("Overview");
    expect(host.textContent).toContain("Auth");
    expect(host.textContent).toContain("Data models");
    expect(host.querySelector('[data-testid="content"]')).not.toBeNull();
    const auth = [...host.querySelectorAll("[data-section-nav-id]")].find((candidate) => candidate.textContent?.trim() === "Auth");
    act(() => { (auth as HTMLElement).click(); });
    expect(paths).toContain("/openapi/tags?tag=Auth");
    unmount();
  });
});

describe("OpenAPIOverviewPage category directory", () => {
  it("renders the contract meta and a category card per tag", () => {
    const { host, unmount } = render(<OpenAPIOverviewPage />);
    expect(host.textContent).toContain("API Docs");
    expect(host.textContent).toContain("api/openapi.yaml");
    expect(host.textContent).toContain("Auth");
    const cards = host.querySelectorAll('[data-testid="openapi-category-card"]');
    expect(cards.length).toBeGreaterThan(0);
    expect(host.textContent).toContain("Data models");
    unmount();
  });

  it("navigates to the category page when a card is opened", () => {
    const paths: string[] = [];
    const { host, unmount } = render(<HostRuntimeProvider value={hostRuntime((path) => paths.push(path))}><OpenAPIOverviewPage /></HostRuntimeProvider>);
    const card = [...host.querySelectorAll('[data-testid="openapi-category-card"]')].find((candidate) => candidate.textContent?.includes("Todo"));
    act(() => { (card as HTMLElement).click(); });
    expect(paths.some((path) => path.startsWith("/openapi/tags?tag=Todo"))).toBe(true);
    unmount();
  });
});

describe("OpenAPITagPage category operations", () => {
  it("lists only the operations of the selected tag", () => {
    window.history.replaceState(null, "", "/openapi/tags?tag=IAM");
    const { host, unmount } = render(<OpenAPITagPage />);
    expect(host.textContent).toContain("iam.session.read");
    expect(host.textContent).not.toContain("auth.audit.list");
    unmount();
  });

  it("filters the category rows by the page search", () => {
    window.history.replaceState(null, "", "/openapi/tags?tag=IAM");
    const { host, unmount } = render(<OpenAPITagPage />);
    const input = host.querySelector("input[type=search]") as HTMLInputElement | null;
    expect(input).not.toBeNull();
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")!.set!;
    act(() => {
      setter.call(input, "accounts.list");
      input!.dispatchEvent(new Event("input", { bubbles: true }));
    });
    expect(host.textContent).toContain("iam.accounts.list");
    expect(host.textContent).not.toContain("iam.session.read");
    unmount();
  });

  it("shows an empty state for an unknown tag", () => {
    window.history.replaceState(null, "", "/openapi/tags?tag=Unknown");
    const { host, unmount } = render(<OpenAPITagPage />);
    expect(host.textContent).toContain("Category Unknown was not found");
    unmount();
  });

  it("navigates to the operation page from a row action", () => {
    window.history.replaceState(null, "", "/openapi/tags?tag=Todo");
    const paths: string[] = [];
    const { host, unmount } = render(<HostRuntimeProvider value={hostRuntime((path) => paths.push(path))}><OpenAPITagPage /></HostRuntimeProvider>);
    clickButtonIn(rowContaining(host, "createTodo"), "Docs");
    expect(paths.some((path) => path.startsWith("/openapi/operation?op=") && path.includes("mode=docs"))).toBe(true);
    unmount();
  });
});

describe("OpenAPIOperationPage docs and debug", () => {
  it("renders the docs section for the deep-linked operation", () => {
    window.history.replaceState(null, "", "/openapi/operation?op=get-/api/v1/iam/accounts&mode=docs");
    const { host, unmount } = render(<OpenAPIOperationPage />);
    expect(host.textContent).toContain("iam.accounts.list");
    expect(host.textContent).toContain("offset");
    expect(host.textContent).toContain("Responses");
    unmount();
  });

  it("switches to the debug mode and executes a request", async () => {
    window.history.replaceState(null, "", "/openapi/operation?op=get-/api/v1/iam/session&mode=docs");
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ hello: "world" }), { status: 200, statusText: "OK" }));
    vi.stubGlobal("fetch", fetchMock);
    const { host, unmount } = render(<OpenAPIOperationPage />);
    clickButtonIn(host, "Debug");
    expect(host.textContent).toContain("Send");
    const send = [...host.querySelectorAll("button")].find((candidate) => candidate.textContent?.trim() === "Send");
    act(() => { (send as HTMLButtonElement).click(); });
    await act(async () => { await new Promise((resolve) => setTimeout(resolve, 0)); });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const response = host.querySelector('[data-testid="openapi-response"]');
    expect(response).not.toBeNull();
    expect(response!.textContent).toContain("200 OK");
    expect(response!.textContent).toContain("hello");
    unmount();
  });

  it("disables execution in mock demo builds with an explicit notice", () => {
    vi.stubEnv("VITE_WEBUI_DATA_SOURCE", "mock");
    window.history.replaceState(null, "", "/openapi/operation?op=get-/api/v1/iam/session&mode=debug");
    const { host, unmount } = render(<OpenAPIOperationPage />);
    expect(host.textContent).toContain("Execution is unavailable in mock demo builds");
    const buttons = [...host.querySelectorAll("button")].map((candidate) => candidate.textContent?.trim() ?? "");
    expect(buttons.filter((text) => text === "Send")).toEqual([]);
    unmount();
  });

  it("shows an empty state for an unknown operation", () => {
    window.history.replaceState(null, "", "/openapi/operation?op=missing");
    const { host, unmount } = render(<OpenAPIOperationPage />);
    expect(host.textContent).toContain("Select an operation to view its documentation and debug it");
    unmount();
  });
});

describe("OpenAPIModelsPage model directory", () => {
  it("renders the first model's property table and switches selection", () => {
    const { host, unmount } = render(<OpenAPIModelsPage />);
    const firstItem = host.querySelector('[data-testid="openapi-model-item"]') as HTMLElement;
    expect(firstItem).not.toBeNull();
    act(() => { firstItem.click(); });
    expect(host.querySelector('[data-testid="openapi-model-pane"]')).not.toBeNull();
    unmount();
  });

  it("opens the deep-linked model from the query", () => {
    window.history.replaceState(null, "", "/openapi/models?model=AccountResponse");
    const { host, unmount } = render(<OpenAPIModelsPage />);
    const pane = host.querySelector('[data-testid="openapi-model-pane"]');
    expect(pane).not.toBeNull();
    expect(pane!.textContent).toContain("AccountResponse");
    expect(pane!.textContent).toContain("username");
    unmount();
  });
});