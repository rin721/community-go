/**
 * Admin Framework —— 公共入口。
 *
 * Framework 只定义可扩展 Catalog protocol 与静态模型；
 * 具体 Route Catalog 由 Surface generated catalog 提供（surfaces/admin/generated/），
 * 不生成到 Framework。
 */

export {
  isDynamicSegment,
  dynamicParamName,
  buildRoutePattern,
  collectParamNames,
  type AdminPluginDefinition,
  type AdminRouteSegment,
  type AdminNavigationGroupAlias,
  type AdminNavigationContribution,
  type AdminNavigationParent,
  type AdminNavigationChild,
  type AdminPluginNavigationContribution,
  type AdminRouteOverride,
  type AdminActiveNavigationOverride,
  type AdminRouteMeta,
  type AdminRouteModuleKind,
  type AdminFileRouteDescriptor,
  type AdminRouteCatalog,
} from './contract';

export type { AdminDiagnostic, AdminDiagnosticCode, AdminDiagnostics } from './diagnostics';
export { collectDiagnostics, finalizeDiagnostics, formatDiagnostics } from './diagnostics';

export type {
  ResolvedAdminRoute,
  AdminRegistryModel,
  AdminBreadcrumbItem,
  AdminPermissionModel,
  AdminCommandItem,
} from './registry';
export type {
  ResolvedNavigationGroup,
  ResolvedNavigationParent,
  ResolvedNavigationChild,
} from './registry';
export { createAdminRegistry, resolveAdminRouteTarget, hasDynamicSegments } from './registry';
export {
  resolveNavigationWithPlugins,
  navigationIdInPluginNamespace,
  UNKNOWN_ADMIN_NAVIGATION_GROUP,
  NAVIGATION_NAMESPACE_VIOLATION,
  UNKNOWN_NAVIGATION_ROUTE_TARGET,
  NAVIGATION_DYNAMIC_TARGET_UNSUPPORTED,
  NAVIGATION_NODE_ORPHAN,
} from './navigation-resolution';

export {
  UNSUPPORTED_DYNAMIC_PLUGIN_ROUTE,
  analyzeHostCapability,
  type AdminHostCapabilityResult,
  type AdminHostNavigationPort,
  type AdminRouteTargetResolver,
} from './host';

export type { AdminRouteTarget } from './target-types';
export { route, encodeSegment, resolveTargetHref } from './target';
