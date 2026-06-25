import { afterEach, describe, expect, it, vi } from "vitest";

import { createApiClient, resolveEndpointUrl } from "./client";
import { API_ENDPOINTS } from "./endpoints";

describe("api client", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("resolves relative API URLs with query parameters", () => {
    expect(resolveEndpointUrl(API_ENDPOINTS.orgs.users(1), { page: 2, empty: "" })).toBe(
      "http://localhost:3000/api/v1/orgs/1/users?page=2",
    );
  });

  it("unwraps backend Result payloads", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ code: 0, data: { ok: true } }), { status: 200 }),
    );

    const client = createApiClient();
    await expect(client.request<{ ok: boolean }>(API_ENDPOINTS.health)).resolves.toEqual({
      ok: true,
    });
  });

  it("passes abort signals to fetch", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(
        new Response(JSON.stringify({ code: 0, data: { ok: true } }), { status: 200 }),
      );
    const controller = new AbortController();

    const client = createApiClient();
    await client.request(API_ENDPOINTS.auth.captcha, { auth: false, signal: controller.signal });

    expect(fetchMock).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ signal: controller.signal }),
    );
  });

  it("normalizes failed backend Result payloads", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          code: "BAD_REQUEST",
          message: "Invalid request",
          messageArgs: { field: "name" },
          messageKey: "validation.common.required",
          serverTime: 1782129600,
          traceId: "trace-1",
        }),
        {
          status: 400,
        },
      ),
    );

    const client = createApiClient();
    await expect(client.request(API_ENDPOINTS.health)).rejects.toMatchObject({
      code: "BAD_REQUEST",
      message: "Invalid request",
      messageArgs: { field: "name" },
      messageKey: "validation.common.required",
      serverTime: 1782129600,
      status: 400,
      traceId: "trace-1",
    });
  });

  it("normalizes network failures without swallowing endpoint context", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new TypeError("Failed to fetch"));

    const client = createApiClient();
    await expect(client.request(API_ENDPOINTS.health)).rejects.toMatchObject({
      code: "NETWORK_ERROR",
      endpoint: API_ENDPOINTS.health,
      status: 0,
    });
  });

  it("keeps abort errors unchanged so callers can ignore cancellation", async () => {
    const abortError = new DOMException("The operation was aborted.", "AbortError");
    vi.spyOn(globalThis, "fetch").mockRejectedValue(abortError);

    const client = createApiClient();
    await expect(client.request(API_ENDPOINTS.health)).rejects.toBe(abortError);
  });

  it("rejects successful invalid json API payloads", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response("{not-json", {
        headers: { "content-type": "application/json" },
        status: 200,
      }),
    );

    const client = createApiClient();
    await expect(client.request(API_ENDPOINTS.health)).rejects.toMatchObject({
      code: "INVALID_JSON_RESPONSE",
      status: 200,
    });
  });

  it("rejects successful non-json API fallback payloads", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response("<!doctype html><html></html>", {
        headers: { "content-type": "text/html" },
        status: 200,
      }),
    );

    const client = createApiClient();
    await expect(client.request(API_ENDPOINTS.setup.status)).rejects.toMatchObject({
      code: "NON_JSON_RESPONSE",
      status: 200,
    });
  });
});
