/**
 * Admin Surface —— taxonomy 与 Registry → Shell model 转换。
 *
 * Shell 只消费 Registry resolved model；转换是纯函数，不读取 pathname、不依赖 Next。
 * taxonomy 把 plugin 声明的 groupId 映射为 Admin Surface 分组语义。
 */

import type { AdminRegistryModel } from '@community-go/admin-framework';
import type { NavigationGroup, NavigationLeaf } from '@community-go/types';

/** Admin Surface taxonomy：groupId → 分组 labelKey。 */
export type AdminTaxonomyEntry = Readonly<{
  groupId: string;
  labelKey: string;
}>;

/** 当前 Admin Surface 的 taxonomy 表。 */
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

/**
 * 将 Registry navigation tree 转换为 Host Shell 的 NavigationGroup[]。
 * 每个 taxonomy 命中项生成一个 Leaf-only group；children 为 registry group items。
 */
export function convertRegistryToShellNavigation(
  registry: AdminRegistryModel,
  taxonomy: readonly AdminTaxonomyEntry[] = adminSurfaceTaxonomy,
): readonly NavigationGroup[] {
  const groups: NavigationGroup[] = [];

  for (const registryGroup of registry.navigationTree) {
    const entry = findTaxonomyEntry(registryGroup.groupId, taxonomy);
    if (!entry) continue;
    const items = registryGroup.items.map((item): NavigationLeaf => ({
      kind: 'leaf',
      id: item.navigationId,
      labelKey: item.labelKey,
      href: item.href,
    }));
    if (items.length === 0) continue;
    groups.push({
      id: registryGroup.groupId,
      labelKey: entry.labelKey,
      items: items as [NavigationLeaf, ...NavigationLeaf[]],
    });
  }

  return groups;
}
