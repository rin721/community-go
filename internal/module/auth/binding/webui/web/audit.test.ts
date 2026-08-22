import { describe, expect, it } from "vitest";
import { outcomeTone } from "./AuditPage";

describe("Auth 审计结果色调", () => {
  it("succeeded 映射 available，denied 映射 degraded，failed 映射 unavailable", () => {
    expect(outcomeTone("succeeded")).toBe("available");
    expect(outcomeTone("denied")).toBe("degraded");
    expect(outcomeTone("failed")).toBe("unavailable");
  });
});