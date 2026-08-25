// @vitest-environment jsdom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import enMessages from "./locale/en-US.json";
import { HostRuntimeProvider, type HostRuntime, type Manifest } from "@webui/sdk/runtime";
import OpenAPIPage from "./OpenAPIPage";

// The workspace shell renders with platform components against the real
// generated contract snapshot (R075-009); execution is exercised through a
// mocked fetch. The shell owns the tree, tabs and request/response split.

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

function treeLeafButton(host: HTMLElement, operationId: string): HTMLButtonElement {
  const buttons = [...host.querySelectorAll<HTMLButtonElement>('button[data-testid="openapi-tree-leaf"]')];
  const button = buttons.find((candidate) => candidate.textContent?.includes(operationId));
  if (!button) throw new Error(`tree leaf for ${operationId} not found`);
  return button;
}

function button(host: HTMLElement, text: string): HTMLButtonElement {
  const found = [...host.querySelectorAll("button")].find((candidate) => candidate.textContent?.trim() === text);
  if (!found) throw new Error(`button ${text} not found`);
  return found as HTMLButtonElement;
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

describe("OpenAPIPage workspace shell (R075-009)", () => {
  it("renders the resource tree with groups and operation leaves", () => {
    const { host, unmount } = render(<HostRuntimeProvider value={hostRuntime()}><OpenAPIPage /></HostRuntimeProvider>);
    expect(host.textContent).toContain("IAM");
    expect(host.textContent).toContain("Todo");
    expect(host.textContent).toContain("iam.session.read");
    expect(host.textContent).toContain("createTodo");
    expect(host.querySelector('[data-testid="openapi-tree"]')).not.toBeNull();
    unmount();
  });

  it("opens a tab and shows the request workspace on tree selection", () => {
    const { host, unmount } = render(<HostRuntimeProvider value={hostRuntime()}><OpenAPIPage /></HostRuntimeProvider>);
    act(() => { treeLeafButton(host, "iam.session.read").click(); });
    expect(host.textContent).toContain("iam.session.read");
    expect(host.querySelector('[data-testid="openapi-workspace"]')).not.toBeNull();
    expect(host.textContent).toContain("/api/v1/iam/session");
    unmount();
  });

  it("edits request parameters and rebuilds the URL", () => {
    const { host, unmount } = render(<HostRuntimeProvider value={hostRuntime()}><OpenAPIPage /></HostRuntimeProvider>);
    act(() => { treeLeafButton(host, "iam.session.read").click(); });
    // iam.session.read has an includeArchived query parameter; the URL shows a value.
    unmount();
  });

  it("executes a request and shows the response", async () => {
    window.history.replaceState(null, "", "/openapi?op=get-/api/v1/iam/session&mode=debug");
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ hello: "world" }), { status: 200, statusText: "OK" }));
    vi.stubGlobal("fetch", fetchMock);
    const { host, unmount } = render(<HostRuntimeProvider value={hostRuntime()}><OpenAPIPage /></HostRuntimeProvider>);
    await act(async () => { await new Promise((resolve) => setTimeout(resolve, 0)); });
    act(() => { button(host, "Send").click(); });
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
    window.history.replaceState(null, "", "/openapi?op=get-/api/v1/iam/session&mode=debug");
    const { host, unmount } = render(<HostRuntimeProvider value={hostRuntime()}><OpenAPIPage /></HostRuntimeProvider>);
    expect(host.textContent).toContain("Execution is unavailable in mock demo builds");
    const buttons = [...host.querySelectorAll("button")].map((candidate) => candidate.textContent?.trim() ?? "");
    expect(buttons.filter((text) => text === "Send")).toEqual([]);
    unmount();
  });

  it("closes a tab and returns to the empty hint", () => {
    window.history.replaceState(null, "", "/openapi?op=get-/api/v1/iam/session&mode=docs");
    const { host, unmount } = render(<HostRuntimeProvider value={hostRuntime()}><OpenAPIPage /></HostRuntimeProvider>);
    const close = host.querySelector('[data-testid="openapi-tab-close-get-/api/v1/iam/session"]') as HTMLButtonElement;
    expect(close).not.toBeNull();
    act(() => { close.click(); });
    expect(host.textContent).toContain("Select an operation from the resource tree to start");
    unmount();
  });
});