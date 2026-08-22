import { describe, expect, it } from "vitest";
import { readWebUIDataSource } from "./index";

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
});