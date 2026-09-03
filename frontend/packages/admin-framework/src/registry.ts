/**
 * Admin Framework —— Registry。
 *
 * Registry 统一负责：
 * - Canonical hierarchy（文件树派生）
 * - Navigation inheritance
 * - Navigation tree/group ordering
 * - Breadcrumb topology
 * - Command/Permission model
 * - Route Target resolution
 * - Ownership、Legacy 和 topology diagnostics
 *
 * Registry 是纯函数模型，不读取 pathname、不创建导航栈、不实现 Router。
 * Shell 只消费 Registry resolved model。
 */

import type {
  AdminFileRouteDescriptor,
  AdminPluginNavigationContribution,
  AdminRouteCatalog,
} from './contract';
import { isDynamicSegment } from './contract';
import type { AdminDiagnostic } from './diagnostics';
import { collectDiagnostics } from './diagnostics';
import {
  resolveNavigationWithPlugins,
  type ResolvedNavigationGroup,
} from './navigation-resolution';
import { resolveTargetHref } from './target';
import type { AdminRouteTarget } from './target-types';

/** 解析后的单条 Route：descriptor + canonical 派生信息。 */
export type ResolvedAdminRoute = Readonly<{
  descriptor: AdminFileRouteDescriptor;
  /** 普通 canonical parent 为最近祖先 page；覆盖时使用 canonicalParentOverride。 */
  canonicalParentRouteId?: string;
  /** 沿 canonical hierarchy 的祖先 routeId 列表（不含自身）。 */
  ancestorRouteIds: readonly string[];
  /** 当前 Route 应激活的 Sidebar Node navigationId（沿 canonical 匹配 Node routeId / 显式覆盖）。 */
  activeNavigationId?: string;
  /** Route 是否无任何可见归属（无 activeNavigationId）。 */
  orphan: boolean;
  /** breadcrumb 文本层（titleKey 或 routeId）。 */
  breadcrumbLabelKey?: string;
}>;

/** Registry 解析结果。 */
export type AdminRegistryModel = Readonly<{
  catalog: AdminRouteCatalog;
  routes: Readonly<Record<string, ResolvedAdminRoute>>;
  /** Resolved Sidebar model（Group → Parent → Child），Shell 唯一导航数据源。 */
  navigation: readonly ResolvedNavigationGroup[];
  breadcrumbs: Readonly<Record<string, readonly AdminBreadcrumbItem[]>>;
  commands: readonly AdminCommandItem[];
  permissions: AdminPermissionModel;
  diagnostics: readonly AdminDiagnostic[];
}>;

export type {
  ResolvedNavigationGroup,
  ResolvedNavigationParent,
  ResolvedNavigationChild,
} from './navigation-resolution';

export type AdminBreadcrumbItem = Readonly<{
  routeId: string;
  labelKey: string;
  href?: string;
  current?: boolean;
}>;

export type AdminPermissionModel = Readonly<{
  /** routeId -> 要求权限。 */
  byRoute: Readonly<Record<string, readonly string[]>>;
}>;

export type AdminCommandItem = Readonly<{
  routeId: string;
  labelKey: string;
  href: string;
  ancestors: readonly string[];
}>;

/** 构造 Registry：输入静态 catalog，输出 resolved model。 */
export function createAdminRegistry(catalog: AdminRouteCatalog): AdminRegistryModel {
  const errors: AdminDiagnostic[] = [];
  const routes = new Map<string, ResolvedAdminRoute>();
  const routeIds = new Set<string>();
  const patterns = new Set<string>();
  const pluginById = new Map(catalog.plugins.map((plugin) => [plugin.pluginId, plugin]));

  const pluginIdOf = (routeId: string): string => routeId.split('.')[0] ?? '';

  // 1. 校验 routeId/pattern 唯一性并建立基础 map。
  for (const descriptor of catalog.routes) {
    if (routeIds.has(descriptor.routeId)) {
      collectDiagnostics(errors, {
        code: 'DUPLICATE_ROUTE_ID',
        routeId: descriptor.routeId,
        message: `重复 routeId: ${descriptor.routeId}`,
      });
      continue;
    }
    routeIds.add(descriptor.routeId);
    if (patterns.has(descriptor.pattern)) {
      collectDiagnostics(errors, {
        code: 'DUPLICATE_PATTERN',
        routeId: descriptor.routeId,
        message: `重复 pattern: ${descriptor.pattern}`,
      });
    }
    patterns.add(descriptor.pattern);
    const plugin = pluginById.get(descriptor.pluginId);
    if (!plugin) {
      collectDiagnostics(errors, {
        code: 'UNKNOWN_ROUTE',
        routeId: descriptor.routeId,
        message: `pluginId 不存在: ${descriptor.pluginId}`,
      });
    }
  }

  // 2. canonical parent 派生：最近祖先 page（文件树），或 canonicalParentOverride。
  const byPath = new Map<string, AdminFileRouteDescriptor>();
  for (const descriptor of catalog.routes) {
    byPath.set(descriptor.path, descriptor);
  }

  const canonicalParentOf = (descriptor: AdminFileRouteDescriptor): string | undefined => {
    const override = descriptor.canonicalParentOverride;
    if (override) return override.routeId;
    const segments = descriptor.path.split('/').filter(Boolean);
    for (let index = segments.length - 1; index >= 0; index -= 1) {
      const ancestorPath = segments.slice(0, index).join('/');
      const ancestor = byPath.get(ancestorPath);
      if (ancestor) return ancestor.routeId;
    }
    return undefined;
  };

  for (const descriptor of catalog.routes) {
    const canonicalParentRouteId = canonicalParentOf(descriptor);

    // canonicalParentOverride 必须为同 Plugin 引用并附 rationale。
    if (descriptor.canonicalParentOverride) {
      const override = descriptor.canonicalParentOverride;
      if (pluginIdOf(override.routeId) !== descriptor.pluginId) {
        collectDiagnostics(errors, {
          code: 'CROSS_PLUGIN_REFERENCE',
          routeId: descriptor.routeId,
          message: `canonicalParentOverride 跨 Plugin 引用: ${override.routeId}`,
        });
      }
      if (!override.rationale.trim()) {
        collectDiagnostics(errors, {
          code: 'INVALID_OVERRIDE_RATIONALE',
          routeId: descriptor.routeId,
          message: 'canonicalParentOverride 缺少 rationale',
        });
      }
    }
    if (descriptor.activeNavigationOverride) {
      const override = descriptor.activeNavigationOverride;
      if (pluginIdOf(override.navigationId) !== descriptor.pluginId) {
        collectDiagnostics(errors, {
          code: 'CROSS_PLUGIN_REFERENCE',
          routeId: descriptor.routeId,
          message: `activeNavigationOverride 跨 Plugin 引用: ${override.navigationId}`,
        });
      }
      if (!override.rationale.trim()) {
        collectDiagnostics(errors, {
          code: 'INVALID_OVERRIDE_RATIONALE',
          routeId: descriptor.routeId,
          message: 'activeNavigationOverride 缺少 rationale',
        });
      }
    }

    routes.set(descriptor.routeId, {
      descriptor,
      ...(canonicalParentRouteId ? { canonicalParentRouteId } : {}),
      ancestorRouteIds: [],
      orphan: false,
    });
  }

  // 3. 补全 ancestorRouteIds。
  const ancestorChain = (
    routeId: string,
    resolved: ReadonlyMap<string, ResolvedAdminRoute>,
    seen: ReadonlySet<string> = new Set(),
  ): string[] => {
    if (seen.has(routeId)) return [];
    const current = resolved.get(routeId);
    const parentId = current?.canonicalParentRouteId;
    if (!parentId) return [];
    return [parentId, ...ancestorChain(parentId, resolved, new Set([...seen, routeId]))];
  };

  for (const descriptor of catalog.routes) {
    const current = routes.get(descriptor.routeId);
    if (!current) continue;
    routes.set(descriptor.routeId, {
      ...current,
      ancestorRouteIds: ancestorChain(descriptor.routeId, routes),
    });
  }

  // 4. Sidebar Navigation resolution：aliases + contributions → Group → Parent → Child。
  const navigationResult = resolveNavigationWithPlugins({
    aliases: catalog.aliases,
    contributionsByPlugin: catalog.contributions.map(
      (entry: AdminPluginNavigationContribution) => ({
        pluginId: entry.pluginId,
        contribution: entry.contribution,
      }),
    ),
    routes: catalog.routes,
  });
  for (const diagnostic of navigationResult.diagnostics) collectDiagnostics(errors, diagnostic);

  // 5. Route-level activeNavigationId：routeId → Sidebar Node 反查表，沿 canonical 祖先匹配。
  // ResolvedNavigationParent/Child 只含 href（Shell 消费形状），不携带 routeId 双源；
  // 反查表由 registry 用 catalog.contributions 原始声明构造：
  //   - 自身 routeId 命中某 Node → 该 Node navigationId；
  //   - 隐藏 Route（create/detail/edit）沿 canonical 找最近命中 Node 的祖先 route；
  //   - activeNavigationOverride 显式指向 Node navigationId（Route Context metadata 保留）。
  const nodeNavigationIdByRouteId = new Map<string, string>();
  for (const entry of catalog.contributions) {
    for (const parent of entry.contribution.parents) {
      if (parent.routeId !== undefined) {
        nodeNavigationIdByRouteId.set(parent.routeId, parent.navigationId);
      }
      for (const child of parent.children ?? []) {
        nodeNavigationIdByRouteId.set(child.routeId, child.navigationId);
      }
    }
  }

  for (const descriptor of catalog.routes) {
    const current = routes.get(descriptor.routeId);
    if (!current) continue;

    // 1) 显式覆盖优先；2) 自身 routeId 命中 Sidebar Node；3) 沿 canonical 找命中 Node 的祖先。
    let activeNavigationId: string | undefined;
    if (descriptor.activeNavigationOverride) {
      activeNavigationId = descriptor.activeNavigationOverride.navigationId;
    } else {
      const selfHit = nodeNavigationIdByRouteId.get(descriptor.routeId);
      if (selfHit) {
        activeNavigationId = selfHit;
      } else {
        for (const ancestorId of current.ancestorRouteIds) {
          const hit = nodeNavigationIdByRouteId.get(ancestorId);
          if (hit) {
            activeNavigationId = hit;
            break;
          }
        }
      }
    }

    const orphan = activeNavigationId === undefined;
    if (orphan) {
      collectDiagnostics(errors, {
        code: 'ORPHAN_ROUTE',
        routeId: descriptor.routeId,
        message: `Route 未关联任何 Sidebar Node 且无 visible ancestor: ${descriptor.routeId}`,
      });
    }

    routes.set(descriptor.routeId, {
      ...current,
      ...(activeNavigationId ? { activeNavigationId } : {}),
      orphan,
      ...(descriptor.titleKey ? { breadcrumbLabelKey: descriptor.titleKey } : {}),
    });
  }

  // 6. Breadcrumb topology：沿 canonical hierarchy 构建。
  const breadcrumbs: Record<string, readonly AdminBreadcrumbItem[]> = {};
  for (const descriptor of catalog.routes) {
    const current = routes.get(descriptor.routeId);
    const items: AdminBreadcrumbItem[] = (current?.ancestorRouteIds ?? []).map(
      (ancestorId, index, ancestors) => {
        const ancestor = routes.get(ancestorId);
        const isLast = index === ancestors.length - 1;
        return {
          routeId: ancestorId,
          labelKey: ancestor?.breadcrumbLabelKey ?? ancestorId,
          ...(ancestor ? { href: buildHref(ancestor.descriptor) } : {}),
          ...(isLast ? { current: true } : {}),
        };
      },
    );
    breadcrumbs[descriptor.routeId] = items;
  }

  // 7. Command model（不改 Command Contract：保留 route 级 titleKey 命令源；后续独立演进）。
  const commands: AdminCommandItem[] = catalog.routes
    .filter((descriptor) => descriptor.titleKey)
    .map((descriptor) => ({
      routeId: descriptor.routeId,
      labelKey: descriptor.titleKey ?? '',
      href: buildHref(descriptor),
      ancestors: routes.get(descriptor.routeId)?.ancestorRouteIds ?? [],
    }));

  // 8. Permission model。
  const byRoute: Record<string, readonly string[]> = {};
  for (const descriptor of catalog.routes) {
    if (descriptor.permissions && descriptor.permissions.length > 0) {
      byRoute[descriptor.routeId] = descriptor.permissions;
    }
  }

  return {
    catalog,
    routes: Object.fromEntries(routes),
    navigation: navigationResult.groups,
    breadcrumbs,
    commands,
    permissions: { byRoute },
    diagnostics: errors,
  };
}

function buildHref(descriptor: AdminFileRouteDescriptor): string {
  if (descriptor.paramNames.length > 0) {
    // 动态 Route 没有可静态构造的 href；由 Host capability gate 阻止进入真实 Surface。
    // 隔离 fixtures 只用于验证参数校验与编码，不进入 Host inventory。
    return descriptor.pattern;
  }
  return resolveTargetHref(descriptor.pattern, {});
}

/** 解析 Route Target 为 href；校验 routeId 与缺失/多余 params。 */
export function resolveAdminRouteTarget(
  registry: AdminRegistryModel,
  target: AdminRouteTarget,
): { href: string; diagnostics: AdminDiagnostic[] } {
  const errors: AdminDiagnostic[] = [];
  const resolved = registry.routes[target.routeId];
  if (!resolved) {
    collectDiagnostics(errors, {
      code: 'UNKNOWN_ROUTE',
      routeId: target.routeId,
      message: `未知 routeId: ${target.routeId}`,
    });
    return { href: '', diagnostics: errors };
  }

  const paramNames = resolved.descriptor.paramNames;
  for (const name of paramNames) {
    if (target.params[name] === undefined) {
      collectDiagnostics(errors, {
        code: 'MISSING_PARAMS',
        routeId: target.routeId,
        message: `缺少参数 ${name}`,
      });
    }
  }
  for (const name of Object.keys(target.params)) {
    if (!paramNames.includes(name)) {
      collectDiagnostics(errors, {
        code: 'EXTRA_PARAMS',
        routeId: target.routeId,
        message: `多余参数 ${name}`,
      });
    }
  }

  return {
    href: resolveTargetHref(resolved.descriptor.pattern, target.params),
    diagnostics: errors,
  };
}

/** 判断 pattern 是否含动态段。 */
export function hasDynamicSegments(pattern: string): boolean {
  return pattern.split('/').some((segment) => isDynamicSegment(segment));
}
