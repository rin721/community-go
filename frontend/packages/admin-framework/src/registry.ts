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

import type { AdminFileRouteDescriptor, AdminRouteCatalog } from './contract';
import { isDynamicSegment } from './contract';
import type { AdminDiagnostic } from './diagnostics';
import { collectDiagnostics } from './diagnostics';
import { resolveTargetHref } from './target';
import type { AdminRouteTarget } from './target-types';

/** 解析后的单条 Route：descriptor + canonical 派生信息。 */
export type ResolvedAdminRoute = Readonly<{
  descriptor: AdminFileRouteDescriptor;
  /** 普通 canonical parent 为最近祖先 page；覆盖时使用 canonicalParentOverride。 */
  canonicalParentRouteId?: string;
  /** 沿 canonical hierarchy 的祖先 routeId 列表（不含自身）。 */
  ancestorRouteIds: readonly string[];
  /** 最近可见 navigation 贡献（沿 hierarchy 继承）。 */
  activeNavigationId?: string;
  /** 找不到可见 navigation 的普通 Route 判定为 orphan。 */
  orphan: boolean;
  /** breadcrumb 文本层（静态 labelKey 或 titleKey）。 */
  breadcrumbLabelKey?: string;
}>;

/** Registry 解析结果。 */
export type AdminRegistryModel = Readonly<{
  catalog: AdminRouteCatalog;
  routes: Readonly<Record<string, ResolvedAdminRoute>>;
  navigationTree: readonly AdminNavigationGroup[];
  breadcrumbs: Readonly<Record<string, readonly AdminBreadcrumbItem[]>>;
  commands: readonly AdminCommandItem[];
  permissions: AdminPermissionModel;
  diagnostics: readonly AdminDiagnostic[];
}>;

export type AdminNavigationItem = Readonly<{
  routeId: string;
  navigationId: string;
  labelKey: string;
  href: string;
  /** 可选 semantic presentation metadata（opaque 透传，不校验；Shell 按自己 presentation policy 消费）。 */
  iconId?: string;
}>;

export type AdminNavigationGroup = Readonly<{
  groupId: string;
  items: readonly AdminNavigationItem[];
}>;

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

  // 4. Navigation inheritance：沿 canonical hierarchy 找最近可见 ancestor。
  for (const descriptor of catalog.routes) {
    const current = routes.get(descriptor.routeId);
    if (!current) continue;

    let activeNavigationId: string | undefined;
    if (descriptor.hasNavigation && descriptor.navigationId) {
      activeNavigationId = descriptor.navigationId;
    } else {
      for (const ancestorId of current.ancestorRouteIds) {
        const ancestor = routes.get(ancestorId);
        if (ancestor?.descriptor.hasNavigation && ancestor.descriptor.navigationId) {
          activeNavigationId = ancestor.descriptor.navigationId;
          break;
        }
      }
    }

    if (descriptor.activeNavigationOverride) {
      activeNavigationId = descriptor.activeNavigationOverride.navigationId;
    }

    const orphan = !activeNavigationId && !descriptor.hasNavigation;
    if (orphan) {
      collectDiagnostics(errors, {
        code: 'ORPHAN_ROUTE',
        routeId: descriptor.routeId,
        message: `Route 无可见 navigation 且无可见 ancestor: ${descriptor.routeId}`,
      });
    }

    routes.set(descriptor.routeId, {
      ...current,
      ...(activeNavigationId ? { activeNavigationId } : {}),
      orphan,
      ...((descriptor.titleKey ?? descriptor.labelKey)
        ? { breadcrumbLabelKey: descriptor.titleKey ?? descriptor.labelKey }
        : {}),
    });
  }

  // 5. Navigation tree：只有声明 navigation 的 Route 进入；按 group 聚合，组内保持 catalog 顺序。
  const groups = new Map<string, AdminNavigationGroup>();
  for (const descriptor of catalog.routes) {
    if (!descriptor.hasNavigation || !descriptor.navigationId || !descriptor.groupId) continue;
    if (!pluginById.has(descriptor.pluginId)) continue;
    const item: AdminNavigationItem = {
      routeId: descriptor.routeId,
      navigationId: descriptor.navigationId,
      labelKey: descriptor.labelKey ?? descriptor.titleKey ?? '',
      href: buildHref(descriptor),
      ...(descriptor.iconId ? { iconId: descriptor.iconId } : {}),
    };
    const existing = groups.get(descriptor.groupId);
    if (existing) {
      groups.set(descriptor.groupId, { ...existing, items: [...existing.items, item] });
    } else {
      groups.set(descriptor.groupId, { groupId: descriptor.groupId, items: [item] });
    }
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
          labelKey: ancestor?.breadcrumbLabelKey ?? ancestor?.descriptor.labelKey ?? ancestorId,
          ...(ancestor ? { href: buildHref(ancestor.descriptor) } : {}),
          ...(isLast ? { current: true } : {}),
        };
      },
    );
    breadcrumbs[descriptor.routeId] = items;
  }

  // 7. Command model。
  const commands: AdminCommandItem[] = catalog.routes
    .filter((descriptor) => descriptor.hasNavigation || descriptor.titleKey)
    .map((descriptor) => ({
      routeId: descriptor.routeId,
      labelKey: descriptor.labelKey ?? descriptor.titleKey ?? '',
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
    navigationTree: [...groups.values()],
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
