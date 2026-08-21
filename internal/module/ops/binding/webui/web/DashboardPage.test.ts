import { describe, expect, it } from "vitest";
import { operationCapabilityState, refreshNoticeTone } from "./DashboardPage";

describe("Ops capability state", () => {
  it("keeps core failures unavailable", () => {
    expect(operationCapabilityState(true, false, true)).toBe("unavailable");
  });

  it("marks optional failures degraded and pending unavailable", () => {
    expect(operationCapabilityState(false, false, true)).toBe("degraded");
    expect(operationCapabilityState(false, true, false)).toBe("unavailable");
    expect(operationCapabilityState(false, false, false)).toBe("available");
  });

  it("keeps refresh feedback truthful when any real query fails", () => {
    expect(refreshNoticeTone(0)).toBe("success");
    expect(refreshNoticeTone(1)).toBe("danger");
  });
});
