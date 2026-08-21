import { describe, expect, it } from "vitest";
import { filterOperationNames, opsOperations } from "./operations";

describe("Ops capability list filters", () => {
  it("filters by translated title and core/optional scope", () => {
    const readiness = opsOperations.find((operation) => operation.name === "readyz");
    const metrics = opsOperations.find((operation) => operation.name === "metrics");
    expect(readiness).toBeDefined();
    expect(metrics).toBeDefined();
    expect(filterOperationNames(readiness!, "就绪", "core", "就绪探针")).toBe(true);
    expect(filterOperationNames(readiness!, "就绪", "optional", "就绪探针")).toBe(false);
    expect(filterOperationNames(metrics!, "指标", "optional", "指标")).toBe(true);
  });
});
