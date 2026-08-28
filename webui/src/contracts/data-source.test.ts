import { describe, expect, it, vi } from "vitest";
import { readWebUIDataSource, requestJSON, requestText } from "./index";

describe("readWebUIDataSource", () => {
  it("defaults to server-hosted when nothing is declared", () => {
    expect(readWebUIDataSource({})).toBe("server-hosted");
  });

  it("honors every explicit declaration", () => {
    expect(readWebUIDataSource({ VITE_WEBUI_DATA_SOURCE: "server-hosted" })).toBe("server-hosted");
    expect(readWebUIDataSource({ VITE_WEBUI_DATA_SOURCE: "separated" })).toBe("separated");
    expect(readWebUIDataSource({ VITE_WEBUI_DATA_SOURCE: "mock" })).toBe("mock");
  });

  it("falls back to the default for missing or invalid values", () => {
    expect(readWebUIDataSource({ VITE_WEBUI_DATA_SOURCE: "offline" })).toBe("server-hosted");
    expect(readWebUIDataSource({ VITE_WEBUI_DATA_SOURCE: "" })).toBe("server-hosted");
  });

  it("projects Problem JSON and request correlation into a typed error", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ code: "conflict", detail: "version changed", instance: "urn:request:req%2F123" }), {
      status: 409,
      headers: { "Content-Type": "application/problem+json" },
    })));
    await expect(requestJSON("/api/v1/example")).rejects.toMatchObject({ status: 409, code: "conflict", detail: "version changed", requestId: "req/123" });
    await expect(requestText("/api/v1/example")).rejects.toMatchObject({ status: 409, code: "conflict", requestId: "req/123" });
    vi.unstubAllGlobals();
  });
});
