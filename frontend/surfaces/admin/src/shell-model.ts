/**
 * Admin Surface —— taxonomy / icon vocabulary 与 Registry → Shell model 转换。
 *
 * Shell 只消费 Registry resolved model；转换是纯函数，不读取 pathname、不依赖 Next。
 *
 * taxonomy 定义收敛到独立 authority `./navigation-taxonomy`（Admin Surface 全局
 * IA）；icon vocabulary 收敛到 `./navigation-icon`（semantic presentation metadata
 * 的合法集合）。本模块只做呈现转换与 re-export，不持有二者定义。
 *
 * 未知 groupId 不得静默丢弃：converter 在 taxonomy 未命中时 deterministic throw，
 * 拒绝消费未验证 Registry（Surface boundary 内的最后防线；codegen gate 已在源头拦截）。
 * iconId 是可选 metadata：converter 只透传 opaque id，不做合法性判断
 * （合法性由 codegen gate 与 composition assert 前置拦截）。
 */

import type { AdminRegistryModel } from '@community-go/admin-framework';
import type { NavigationGroup, NavigationLeaf } from '@community-go/types';

import {
  adminSurfaceTaxonomy,
  collectUnknownNavigationGroupDiagnostics,
  findTaxonomyEntry,
  type AdminTaxonomyEntry,
} from './navigation-taxonomy';

export type {
  AdminTaxonomyEntry,
  AdminNavigationGroupReference,
  AdminNavigationGroupDiagnostic,
} from './navigation-taxonomy';
export {
  adminSurfaceTaxonomy,
  findTaxonomyEntry,
  UNKNOWN_ADMIN_NAVIGATION_GROUP,
  collectUnknownNavigationGroupDiagnostics,
} from './navigation-taxonomy';

export type {
  AdminNavigationIconId,
  AdminNavigationIconReference,
  AdminNavigationIconDiagnostic,
} from './navigation-icon';
export {
  adminNavigationIconVocabulary,
  UNKNOWN_ADMIN_NAVIGATION_ICON,
  collectUnknownNavigationIconDiagnostics,
} from './navigation-icon';

/**
 * 将 Registry navigation tree 转换为 Host Shell 的 NavigationGroup[]。
 * 每个 taxonomy 命中项生成一个 Leaf-only group；children 为 registry group items。
 *
 * 未命中 taxonomy 的 group：deterministic throw（含 groupId 与 routeIds），
 * 保证 unknown group 在任何路径下都不会 quietly disappear。
 * item 的可选 iconId 作为 opaque presentation metadata 原样透传（不校验）。
 */
export function convertRegistryToShellNavigation(
  registry: AdminRegistryModel,
  taxonomy: readonly AdminTaxonomyEntry[] = adminSurfaceTaxonomy,
): readonly NavigationGroup[] {
  const groups: NavigationGroup[] = [];

  for (const registryGroup of registry.navigationTree) {
    const entry = findTaxonomyEntry(registryGroup.groupId, taxonomy);
    if (!entry) {
      const diagnostics = collectUnknownNavigationGroupDiagnostics(
        registryGroup.items.map((item) => ({
          groupId: registryGroup.groupId,
          routeId: item.routeId,
        })),
        taxonomy,
      );
      const detail = diagnostics
        .map((diagnostic) => `[${diagnostic.code}] ${diagnostic.message}`)
        .join('; ');
      throw new Error(`Registry navigation group 未命中 Admin Surface taxonomy: ${detail}`);
    }
    const items = registryGroup.items.map((item): NavigationLeaf => ({
      kind: 'leaf',
      id: item.navigationId,
      labelKey: item.labelKey,
      href: item.href,
      ...(item.iconId ? { iconId: item.iconId } : {}),
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
