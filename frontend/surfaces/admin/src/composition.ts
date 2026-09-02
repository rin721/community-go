/**
 * Admin Surface —— Composition 装配。
 *
 * `composeAdminSurface` 接收 Plugin Registry model 与 Plugin i18n resources，
 * 返回 Host Composition Root 一次性安装所需的 Surface Bundle：
 * - registryModel：Registry resolved model（Shell/Command/Breadcrumb/Permission 消费）
 * - i18nResources：聚合后的 Plugin i18n（Host 合并进 Frontend i18n resources）
 *
 * 本模块不读取 pathname、不创建 Registry、不实现 Router；只做纯装配。
 * Surface composition/model boundary 在此对生成的 Registry 做 runtime invariant
 * assertion（navigation group 必须命中 Admin Surface taxonomy），保证 Host 只消费
 * 已验证的 valid navigation model。
 */

import type { AdminRegistryModel } from '@community-go/admin-framework';
import type { TranslationResources } from '@community-go/i18n';

import { collectUnknownNavigationGroupDiagnostics } from './navigation-taxonomy';
import { collectUnknownNavigationIconDiagnostics } from './navigation-icon';

export type AdminSurfaceComposition = Readonly<{
  registryModel: AdminRegistryModel;
  i18nResources: TranslationResources;
}>;

/**
 * Surface boundary invariant assertion：Registry navigation 引用的每个 groupId
 * 必须命中 Admin Surface taxonomy；每个声明的 iconId 必须命中 icon vocabulary。
 * 任一非空即 throw（诊断来自 taxonomy/icon authority），不允许 unknown group 或
 * unknown icon 静默进入 Shell。
 */
export function assertValidAdminSurfaceRegistry(registry: AdminRegistryModel): void {
  const navigationReferences = registry.navigationTree.flatMap((group) =>
    group.items.map((item) => ({
      groupId: group.groupId,
      routeId: item.routeId,
    })),
  );
  const groupDiagnostics = collectUnknownNavigationGroupDiagnostics(navigationReferences);

  const iconReferences = registry.navigationTree.flatMap((group) =>
    group.items
      .filter((item) => item.iconId !== undefined)
      .map((item) => ({
        iconId: item.iconId as string,
        routeId: item.routeId,
      })),
  );
  const iconDiagnostics = collectUnknownNavigationIconDiagnostics(iconReferences);

  const diagnostics = [...groupDiagnostics, ...iconDiagnostics];
  if (diagnostics.length > 0) {
    const detail = diagnostics
      .map((diagnostic) => `[${diagnostic.code}] ${diagnostic.message}`)
      .join('; ');
    throw new Error(`Admin Surface Registry 校验失败: ${detail}`);
  }
}

/** 合并多个 locale 资源为一个 TranslationResources（plugin + surface）。 */
export function mergeTranslationResources(
  ...resources: readonly TranslationResources[]
): TranslationResources {
  const merged: Record<string, Readonly<{ translation: Readonly<Record<string, unknown>> }>> = {};
  for (const resource of resources) {
    for (const [locale, block] of Object.entries(resource)) {
      const existing = merged[locale];
      merged[locale] = {
        translation: {
          ...(existing?.translation ?? {}),
          ...block.translation,
        },
      };
    }
  }
  return merged;
}
