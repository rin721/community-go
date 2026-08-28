import { describe, expect, it } from "vitest";
import type { ManifestRoute } from "../contracts";
import { buildRouteCommands, filterCommands, projectActionCommands, type CommandDefinition } from "./registry";

const baseRoute: ManifestRoute = {
  moduleId: "iam", id: "iam.accounts", path: "/admin/accounts", entryId: "iam.accounts",
  titleMessageId: "accounts", layout: "app", deliveryState: "implemented", default: false,
  unauthenticatedDefault: false, access: "allowed", availability: "available",
};

describe("全局命令注册表", () => {
  it("不投影 denied、未实现或不可用页面", () => {
    const commands = buildRouteCommands([
      baseRoute,
      { ...baseRoute, id: "denied", access: "denied" },
      { ...baseRoute, id: "pending", deliveryState: "not-implemented" },
      { ...baseRoute, id: "down", availability: "unavailable" },
    ]);
    expect(commands.map((command) => command.id)).toEqual(["route:iam.accounts"]);
  });

  it("按 actionPermissions 隐藏 denied 动作并保留危险语义", () => {
    const commands: CommandDefinition[] = [
      { id: "safe", kind: "action", titleMessageId: "safe", operationId: "iam.read" },
      { id: "danger", kind: "action", titleMessageId: "danger", operationId: "iam.archive", dangerous: true },
    ];
    const projected = projectActionCommands(commands, [
      { operationId: "iam.read", access: "allowed" },
      { operationId: "iam.archive", access: "denied" },
    ]);
    expect(projected.map((command) => command.id)).toEqual(["safe"]);
  });

  it("支持标题、路径和关键词检索", () => {
    const commands = buildRouteCommands([baseRoute]);
    expect(filterCommands(commands, "accounts", (messageId) => messageId === "accounts" ? "Accounts" : messageId)).toHaveLength(1);
    expect(filterCommands(commands, "/admin", () => "Accounts")).toHaveLength(1);
    expect(filterCommands(commands, "missing", () => "Accounts")).toHaveLength(0);
  });
});
