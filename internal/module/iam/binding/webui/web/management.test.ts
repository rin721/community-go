import { describe, expect, it } from "vitest";
import { splitIDs } from "./AccountsPage";
import { splitPermissionKeys } from "./RolesPage";

describe("IAM management input", () => {
  it("normalizes replacement identifiers without empty values", () => {
    expect(splitIDs(" role-a, ,role-b ")).toEqual(["role-a", "role-b"]);
    expect(splitPermissionKeys("iam:account:read, iam:role:read")).toEqual(["iam:account:read", "iam:role:read"]);
  });
});
