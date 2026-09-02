/**
 * Admin Framework —— 插件契约与静态 File Route 描述符。
 *
 * 本模块只定义类型与纯规则，不包含 React、Next 或 Browser 依赖。
 * Framework 不进行 pathname matching、不维护 history、不复制 Next Route Runtime；
 * Next.js App Router 是唯一真实 Router，具体导航由 Host Navigation Port 承载。
 */

/** 静态 URL 段：普通文本段或 `[param]` 动态段。 */
export type AdminRouteSegment = string;

/** Plugin 定义：目录名与 pluginId 一致，mount 为静态前缀（默认 `/<plugin-directory>`）。 */
export type AdminPluginDefinition = Readonly<{
  pluginId: string;
  mount: string;
}>;

/** Navigation 贡献：只有声明 navigation 的 Route 才进入 Sidebar/Command。 */
export type AdminRouteNavigation = Readonly<{
  navigationId: string;
  labelKey: string;
  groupId: string;
}>;

/** 跨 Plugin 引用被禁止；覆盖必须位于同 Plugin 并附带 rationale。 */
export type AdminRouteOverride = Readonly<{
  routeId: string;
  rationale: string;
}>;

/** 同 Plugin 的 active navigation 覆盖。 */
export type AdminActiveNavigationOverride = Readonly<{
  navigationId: string;
  rationale: string;
}>;

/**
 * route.meta.ts 的静态声明契约。
 *
 * 规则：
 * - 不声明 path、普通 parentRouteId 或 page import（URL 只由 mount + 文件树决定）。
 * - canonicalParentOverride / activeNavigationOverride 必须为同 Plugin 引用并附 rationale。
 */
export type AdminRouteMeta = Readonly<{
  navigation?: AdminRouteNavigation;
  titleKey?: string;
  canonicalParentOverride?: AdminRouteOverride;
  activeNavigationOverride?: AdminActiveNavigationOverride;
  permissions?: readonly string[];
}>;

/** 受治理的 Route Module 文件类型。 */
export type AdminRouteModuleKind = 'page' | 'layout' | 'loading' | 'error';

/**
 * 静态 Framework Descriptor：由 Generator 从文件树 + metadata 静态提取。
 * 不包含 resolved Navigation/Breadcrumb/Command/Permission model（Registry 统一负责）。
 */
export type AdminFileRouteDescriptor = Readonly<{
  routeId: string;
  pluginId: string;
  /** 相对 plugin routes/ 根目录的文件树路径，如 `create`、`[id]/edit`。 */
  path: string;
  /** 文件树段（含 `[param]` 标记）。 */
  segments: readonly AdminRouteSegment[];
  /** URL pattern（含 `[param]` 占位），如 `/reference-resources/[id]`。 */
  pattern: string;
  /** 动态参数名集合（来自 `[param]` 段）。 */
  paramNames: readonly string[];
  /** 是否贡献可见 navigation。 */
  hasNavigation: boolean;
  navigationId?: string;
  labelKey?: string;
  groupId?: string;
  titleKey?: string;
  canonicalParentOverride?: AdminRouteOverride;
  activeNavigationOverride?: AdminActiveNavigationOverride;
  permissions?: readonly string[];
}>;

/** Surface Route Catalog：generated 静态目录，Registry 只消费该模型。 */
export type AdminRouteCatalog = Readonly<{
  plugins: readonly AdminPluginDefinition[];
  routes: readonly AdminFileRouteDescriptor[];
}>;

/** 判定段是否为动态段 `[param]`。 */
export function isDynamicSegment(segment: string): boolean {
  return /^\[[A-Za-z0-9_]+]$/.test(segment);
}

/** 提取动态段参数名；非动态段返回 null。 */
export function dynamicParamName(segment: string): string | null {
  const match = /^\[([A-Za-z0-9_]+)]$/.exec(segment);
  return match?.[1] ?? null;
}

/** 由 plugin mount + 文件树段构造 URL pattern。 */
export function buildRoutePattern(mount: string, segments: readonly AdminRouteSegment[]): string {
  const path = segments.length > 0 ? `/${segments.join('/')}` : '';
  return `${mount}${path}`;
}

/** 提取 pattern 中的动态参数名（按出现顺序）。 */
export function collectParamNames(pattern: string): readonly string[] {
  const names: string[] = [];
  for (const match of pattern.matchAll(/\[([A-Za-z0-9_]+)]/g)) {
    const name = match[1];
    if (name && !names.includes(name)) names.push(name);
  }
  return names;
}
