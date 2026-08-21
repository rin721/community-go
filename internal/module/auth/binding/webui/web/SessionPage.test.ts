import { describe, expect, it } from "vitest";
import { sessionCapabilityState } from "./SessionPage";

describe("Auth session capability state", () => {
  it("only reports an available session when the host has a session", () => {
    expect(sessionCapabilityState(true)).toBe("available");
    expect(sessionCapabilityState(false)).toBe("unavailable");
  });
});
