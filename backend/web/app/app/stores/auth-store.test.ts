import { describe, expect, it } from "vitest";

import { hasSessionPermission } from "./auth-store";

const grants = [
  { code: "permission:read", productCode: "console-platform", scope: "platform" },
  { code: "*:*", productCode: "console-platform", scope: "tenant" },
];

describe("hasSessionPermission", () => {
  it("matches the current product, scope and permission code", () => {
    expect(
      hasSessionPermission(grants, {
        code: "permission:read",
        productCode: "console-platform",
        scope: "platform",
      }),
    ).toBe(true);
  });

  it("rejects grants from another scope or product", () => {
    expect(
      hasSessionPermission(grants, {
        code: "audit:read",
        productCode: "console-platform",
        scope: "platform",
      }),
    ).toBe(false);
    expect(
      hasSessionPermission(grants, {
        code: "permission:read",
        productCode: "another-product",
        scope: "platform",
      }),
    ).toBe(false);
  });

  it("supports wildcard permission codes within the matched scope", () => {
    expect(
      hasSessionPermission(grants, {
        code: "audit:read",
        productCode: "console-platform",
        scope: "tenant",
      }),
    ).toBe(true);
  });
});
