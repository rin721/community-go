import type { ManifestActionPermission, ManifestRoute } from "../contracts";

/** CommandDefinition 是全局命令中心的最小语义模型。执行行为由宿主注入，
 * 注册表只负责表达搜索范围、权限和可用性，不绕过页面自身的授权边界。 */
export type CommandDefinition = {
  id: string;
  kind: "route" | "action";
  titleMessageId: string;
  keywords?: string[];
  path?: string;
  operationId?: string;
  dangerous?: boolean;
  execute?: () => void;
};

function routeIsLoadable(route: ManifestRoute): boolean {
  return route.availability === undefined
    || route.availability === "available"
    || (route.availability === "degraded" && (route.availableCapabilities?.length ?? 0) > 0);
}

/** buildRouteCommands 只投影可访问、已实现且当前可加载的页面。 */
export function buildRouteCommands(routes: ManifestRoute[]): CommandDefinition[] {
  return routes
    .filter((route) => route.layout === "app" && route.access === "allowed" && route.deliveryState === "implemented" && routeIsLoadable(route))
    .map((route) => ({
      id: `route:${route.id}`,
      kind: "route" as const,
      titleMessageId: route.titleMessageId,
      keywords: [route.path, route.id],
      path: route.path,
    }));
}

/** projectActionCommands 将服务端投影的 operation 权限应用到宿主动作。
 * 未声明的动作默认可见，但真正执行仍必须由业务边界再次授权。 */
export function projectActionCommands(commands: CommandDefinition[], permissions?: ManifestActionPermission[]): CommandDefinition[] {
  const accessByOperation = new Map((permissions ?? []).map((permission) => [permission.operationId, permission.access]));
  return commands.filter((command) => {
    if (!command.operationId || !permissions) return true;
    return accessByOperation.get(command.operationId) === "allowed";
  });
}

/** filterCommands 对标题、稳定 id、路径和关键词做统一不区分大小写匹配。 */
export function filterCommands(commands: CommandDefinition[], query: string, resolveTitle: (messageId: string) => string): CommandDefinition[] {
  const needle = query.trim().toLocaleLowerCase();
  if (!needle) return commands;
  return commands.filter((command) => [resolveTitle(command.titleMessageId), command.id, command.path ?? "", ...(command.keywords ?? [])]
    .some((value) => value.toLocaleLowerCase().includes(needle)));
}
