/**
 * Admin Surface —— Navigation Taxonomy Authority。
 *
 * `groupId` 属于 Admin Surface global taxonomy（整个后台产品的信息架构），
 * 不是普通 Plugin 私有扩展点。普通 Plugin 只能引用既有合法 groupId；
 * 新增全局导航分组属于 Admin Surface IA 变更，必须经本模块（中央 taxonomy）治理。
 *
 * 本模块只承担：
 * - taxonomy definition（adminSurfaceTaxonomy）；
 * - taxonomy types；
 * - navigation group reference 的纯 validation / diagnostic。
 *
 * 无副作用：不读取 pathname、不依赖 React/Next/Host/Shell presentation。
 * `shell-model.ts` 与 `tooling/admin-codegen` 均消费本 authority；
 * codegen 不依赖 Shell presentation 模块。
 */

/** taxonomy 命中项：groupId → 分组 labelKey。 */
export type AdminTaxonomyEntry = Readonly<{
  groupId: string;
  labelKey: string;
}>;

/** 当前 Admin Surface 的 taxonomy 表（全局 IA authority，唯一维护点）。 */
export const adminSurfaceTaxonomy: readonly AdminTaxonomyEntry[] = [
  {
    groupId: 'admin.reference',
    labelKey: 'adminShell.referenceGroup',
  },
];

/** 在 taxonomy 中查找 groupId。 */
export function findTaxonomyEntry(
  groupId: string,
  taxonomy: readonly AdminTaxonomyEntry[] = adminSurfaceTaxonomy,
): AdminTaxonomyEntry | undefined {
  return taxonomy.find((entry) => entry.groupId === groupId);
}

/** 未知导航分组诊断 code（Surface governance，不进入 framework diagnostics union）。 */
export const UNKNOWN_ADMIN_NAVIGATION_GROUP = 'UNKNOWN_ADMIN_NAVIGATION_GROUP';

/** 一条 navigation group 引用：哪个 Route 声明了哪个 groupId。 */
export type AdminNavigationGroupReference = Readonly<{
  groupId: string;
  routeId: string;
}>;

/** 未知导航分组诊断：同一未知 groupId 聚合其声明 Route。 */
export type AdminNavigationGroupDiagnostic = Readonly<{
  code: typeof UNKNOWN_ADMIN_NAVIGATION_GROUP;
  groupId: string;
  routeIds: readonly string[];
  message: string;
}>;

/**
 * 唯一 group-reference 合法性 validator（单点构造 code 与 message）。
 *
 * 调用方只负责把自身模型适配成 references：
 * - codegen：discovery descriptors（hasNavigation 且含 groupId）适配；
 * - Surface composition assert：registry.navigationTree 适配。
 *
 * 合法性规则、diagnostic code 与 message 构造不得在调用方复制漂移。
 */
export function collectUnknownNavigationGroupDiagnostics(
  references: readonly AdminNavigationGroupReference[],
  taxonomy: readonly AdminTaxonomyEntry[] = adminSurfaceTaxonomy,
): readonly AdminNavigationGroupDiagnostic[] {
  const byGroup = new Map<string, string[]>();
  for (const reference of references) {
    if (findTaxonomyEntry(reference.groupId, taxonomy)) continue;
    const routeIds = byGroup.get(reference.groupId) ?? [];
    routeIds.push(reference.routeId);
    byGroup.set(reference.groupId, routeIds);
  }
  return [...byGroup.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([groupId, routeIds]) => ({
      code: UNKNOWN_ADMIN_NAVIGATION_GROUP,
      groupId,
      routeIds,
      message: `navigation.groupId 未命中 Admin Surface taxonomy: ${groupId}（声明于 ${routeIds.join(', ')}）`,
    }));
}
