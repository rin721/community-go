/**
 * Admin Surface —— Composition 装配。
 *
 * `composeAdminSurface` 接收 Plugin Registry model 与 Plugin i18n resources，
 * 返回 Host Composition Root 一次性安装所需的 Surface Bundle：
 * - registryModel：Registry resolved model（Shell/Command/Breadcrumb/Permission 消费）
 * - i18nResources：聚合后的 Plugin i18n（Host 合并进 Frontend i18n resources）
 *
 * 本模块不读取 pathname、不创建 Registry、不实现 Router；只做纯装配。
 */

import type { AdminRegistryModel } from '@community-go/admin-framework';
import type { TranslationResources } from '@community-go/i18n';

export type AdminSurfaceComposition = Readonly<{
  registryModel: AdminRegistryModel;
  i18nResources: TranslationResources;
}>;

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
