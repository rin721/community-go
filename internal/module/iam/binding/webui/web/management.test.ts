import { describe, expect, it } from "vitest";
import { checklistCandidates } from "./AccountsPage";
import { diffKeys, groupByOwnerModule } from "./RolesPage";
import { groupByModule } from "./PermissionsPage";
import type { Role } from "./api";

describe("IAM management selection", () => {
  it("groups the catalog by owner module in stable key order", () => {
    const groups = groupByOwnerModule([
      { key: "iam:role:read", ownerModuleId: "iam", descriptionMessageId: "permission.iam.role.read" },
      { key: "todo:item:read", ownerModuleId: "todo", descriptionMessageId: "permission.todo.read" },
      { key: "iam:account:read", ownerModuleId: "iam", descriptionMessageId: "permission.iam.account.read" },
    ]);
    expect(groups.map((group) => group.ownerModuleId)).toEqual(["iam", "todo"]);
    expect(groups[0].definitions.map((definition) => definition.key)).toEqual(["iam:account:read", "iam:role:read"]);
  });

  it("computes added and removed counts without free text", () => {
    expect(diffKeys(["iam:account:read"], ["iam:account:read"])).toEqual({ added: 0, removed: 0 });
    expect(diffKeys(["iam:account:read"], ["iam:account:read", "iam:role:read"])).toEqual({ added: 1, removed: 0 });
    expect(diffKeys(["iam:account:read", "iam:role:read"], ["iam:account:read"])).toEqual({ added: 0, removed: 1 });
  });

  it("filters inactive and archived roles out of the checklist", () => {
    const roles: Role[] = [
      { id: "a", code: "active", name: "Active", description: "", active: true, archived: false, system: false, version: 1 },
      { id: "b", code: "inactive", name: "Inactive", description: "", active: false, archived: false, system: false, version: 1 },
      { id: "c", code: "archived", name: "Archived", description: "", active: true, archived: true, system: false, version: 1 },
    ];
    expect(checklistCandidates(roles).map((role) => role.id)).toEqual(["a"]);
  });
});

describe("082 Permission catalog grouping (REQ-015)", () => {
  it("groups permission items by owner module in stable key order", () => {
    const groups = groupByModule([
      { key: "iam.roles.list", ownerModuleId: "iam", descriptionMessageId: "permission.iam.roles.list" },
      { key: "todo.item.read", ownerModuleId: "todo", descriptionMessageId: "permission.todo.read" },
      { key: "iam.accounts.list", ownerModuleId: "iam", descriptionMessageId: "permission.iam.accounts.list" },
    ]);
    expect(groups.map((group) => group.ownerModuleId)).toEqual(["iam", "todo"]);
    expect(groups[0].definitions.map((definition) => definition.key)).toEqual(["iam.accounts.list", "iam.roles.list"]);
  });

  it("keeps module order stable when keys sort identically", () => {
    const groups = groupByModule([
      { key: "ops.diagnostics", ownerModuleId: "ops", descriptionMessageId: "permission.ops.diagnostics" },
      { key: "ops.metrics", ownerModuleId: "ops", descriptionMessageId: "permission.ops.metrics" },
    ]);
    expect(groups).toHaveLength(1);
    expect(groups[0].definitions.map((definition) => definition.key)).toEqual(["ops.diagnostics", "ops.metrics"]);
  });
});