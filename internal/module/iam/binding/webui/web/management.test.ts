import { describe, expect, it } from "vitest";
import { checklistCandidates, sameRoleIDs } from "./AccountsPage";
import { diffKeys, groupByOwnerModule } from "./RolesPage";
import { groupByModule } from "./PermissionsPage";
import { groupScopesByModule } from "./ApiTokensPage";
import type { Role } from "./api";

describe("IAM management selection", () => {
  it("groups the catalog by owner module in stable key order", () => {
    const groups = groupByOwnerModule([
      { key: "iam:role:read", ownerModuleId: "iam", descriptionMessageId: "permission.iam.role.read", risk: "elevated" },
      { key: "todo:item:read", ownerModuleId: "todo", descriptionMessageId: "permission.todo.read", risk: "standard" },
      { key: "iam:account:read", ownerModuleId: "iam", descriptionMessageId: "permission.iam.account.read", risk: "elevated" },
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

  it("treats role order as irrelevant when deciding whether the form is dirty", () => {
    expect(sameRoleIDs(["role-b", "role-a"], ["role-a", "role-b"])).toBe(true);
    expect(sameRoleIDs(["role-a"], [])).toBe(false);
  });
});

describe("082 Permission catalog grouping (REQ-015)", () => {
  it("groups permission items by owner module in stable key order", () => {
    const groups = groupByModule([
      { key: "iam.roles.list", ownerModuleId: "iam", descriptionMessageId: "permission.iam.roles.list", risk: "elevated" },
      { key: "todo.item.read", ownerModuleId: "todo", descriptionMessageId: "permission.todo.read", risk: "standard" },
      { key: "iam.accounts.list", ownerModuleId: "iam", descriptionMessageId: "permission.iam.accounts.list", risk: "elevated" },
    ]);
    expect(groups.map((group) => group.ownerModuleId)).toEqual(["iam", "todo"]);
    expect(groups[0].definitions.map((definition) => definition.key)).toEqual(["iam.accounts.list", "iam.roles.list"]);
  });

  it("keeps module order stable when keys sort identically", () => {
    const groups = groupByModule([
      { key: "ops.diagnostics", ownerModuleId: "ops", descriptionMessageId: "permission.ops.diagnostics", risk: "elevated" },
      { key: "ops.metrics", ownerModuleId: "ops", descriptionMessageId: "permission.ops.metrics", risk: "elevated" },
    ]);
    expect(groups).toHaveLength(1);
    expect(groups[0].definitions.map((definition) => definition.key)).toEqual(["ops.diagnostics", "ops.metrics"]);
  });
});

describe("082 API token scope grouping (REQ-022/040)", () => {
  it("groups scopes by owner prefix in stable order", () => {
    const groups = groupScopesByModule(["iam:account:self:read", "todo:item:read", "iam:role:read"]);
    expect(groups.map((group) => group.ownerModuleId)).toEqual(["iam", "todo"]);
    expect(groups[0].scopes).toEqual(["iam:account:self:read", "iam:role:read"]);
  });
});
