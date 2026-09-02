import { describe, expect, it } from 'vitest';

import { resolveAdminRouteTarget } from '@community-go/admin-framework';

import { assertValidAdminSurfaceRegistry } from './composition';
import {
  adminSurfaceTaxonomy,
  collectUnknownNavigationGroupDiagnostics,
} from './navigation-taxonomy';
import { collectUnknownNavigationIconDiagnostics } from './navigation-icon';
import {
  generatedAdminSurfaceComposition,
  generatedSurfaceI18nResources,
  generatedSurfaceRegistry,
} from '../generated/composition/composition';

/**
 * Production generated registry 的 invariant 测试。
 *
 * 不锁定真实生产插件集合（数量/名称/精确结构）——新增或删除普通插件不应要求
 * 修改本文件。精确数量/结构场景测试见 shell.test.ts / framework.test.ts 的
 * 自包含 fixture catalog。
 */

/** 在 merged TranslationResources 中按 dotted key 查找文本；找不到返回 undefined。 */
function lookupTranslation(
  resources: typeof generatedSurfaceI18nResources,
  locale: string,
  key: string,
): unknown {
  const translation = resources[locale]?.translation;
  if (!translation || typeof translation !== 'object') return undefined;
  let current: unknown = translation;
  for (const segment of key.split('.')) {
    if (typeof current !== 'object' || current === null) return undefined;
    current = (current as Record<string, unknown>)[segment];
  }
  return current;
}

describe('Generated composition (production invariant)', () => {
  it('Registry topology 完整：无 diagnostics', () => {
    expect(generatedSurfaceRegistry.diagnostics).toEqual([]);
  });

  it('plugin ownership valid：route.pluginId ∈ catalog.plugins，routes 键与 catalog 一一对应', () => {
    const registry = generatedSurfaceRegistry;
    const pluginIds = new Set(registry.catalog.plugins.map((plugin) => plugin.pluginId));
    for (const descriptor of registry.catalog.routes) {
      expect(pluginIds.has(descriptor.pluginId)).toBe(true);
    }
    const routeKeys = Object.keys(registry.routes).sort();
    const catalogRouteIds = registry.catalog.routes.map((route) => route.routeId).sort();
    expect(routeKeys).toEqual(catalogRouteIds);
    // routeId 唯一（catalog 无重复）
    expect(new Set(catalogRouteIds).size).toBe(catalogRouteIds.length);
  });

  it('navigationId 跨 navigationTree 唯一', () => {
    const registry = generatedSurfaceRegistry;
    const navigationIds = registry.navigationTree.flatMap((group) =>
      group.items.map((item) => item.navigationId),
    );
    expect(new Set(navigationIds).size).toBe(navigationIds.length);
  });

  it('every static route resolvable：resolveAdminRouteTarget 无 diagnostics 且 href === pattern', () => {
    const registry = generatedSurfaceRegistry;
    for (const descriptor of registry.catalog.routes) {
      if (descriptor.paramNames.length > 0) continue; // 动态 route 由 Host capability gate 隔离，不进真实 Surface
      const result = resolveAdminRouteTarget(registry, {
        routeId: descriptor.routeId,
        params: {},
      });
      expect(result.diagnostics).toEqual([]);
      expect(result.href).toBe(descriptor.pattern);
    }
  });

  it('navigation group references valid：命中 Admin Surface taxonomy', () => {
    const registry = generatedSurfaceRegistry;
    const references = registry.navigationTree.flatMap((group) =>
      group.items.map((item) => ({ groupId: group.groupId, routeId: item.routeId })),
    );
    expect(collectUnknownNavigationGroupDiagnostics(references, adminSurfaceTaxonomy)).toEqual([]);
  });

  it('navigation icon references valid：每个声明的 iconId 命中 Admin Surface icon vocabulary', () => {
    const registry = generatedSurfaceRegistry;
    const references = registry.navigationTree.flatMap((group) =>
      group.items
        .filter((item) => item.iconId !== undefined)
        .map((item) => ({ iconId: item.iconId as string, routeId: item.routeId })),
    );
    expect(collectUnknownNavigationIconDiagnostics(references)).toEqual([]);
  });

  it('assertValidAdminSurfaceRegistry 通过（Surface boundary runtime invariant）', () => {
    expect(() => assertValidAdminSurfaceRegistry(generatedSurfaceRegistry)).not.toThrow();
  });

  it('i18n contribution consistency：按 Contract 声明的键在双 locale 均可解析', () => {
    const registry = generatedSurfaceRegistry;
    for (const descriptor of registry.catalog.routes) {
      // 有 navigation 贡献且声明 labelKey → 必须可解析
      if (descriptor.hasNavigation && descriptor.labelKey) {
        for (const locale of ['zh-CN', 'en']) {
          expect(
            lookupTranslation(generatedSurfaceI18nResources, locale, descriptor.labelKey),
          ).toBeTruthy();
        }
      }
      // 声明 titleKey → 必须可解析（无论是否隐藏 route）
      if (descriptor.titleKey) {
        for (const locale of ['zh-CN', 'en']) {
          expect(
            lookupTranslation(generatedSurfaceI18nResources, locale, descriptor.titleKey),
          ).toBeTruthy();
        }
      }
      // 隐藏 route（无 navigation）不强制 labelKey —— 不在此断言
    }
  });

  it('composition 一致性：model/resource 结构一致、registry 通过 assert（不锁内部对象身份）', () => {
    // singleton identity 不是正式 Contract（Host 直接消费 generatedSurfaceRegistry /
    // generatedSurfaceI18nResources）；这里验证 model/resource 一致性 + invariants。
    expect(generatedAdminSurfaceComposition.registryModel.catalog).toEqual(
      generatedSurfaceRegistry.catalog,
    );
    expect(generatedAdminSurfaceComposition.i18nResources).toEqual(generatedSurfaceI18nResources);
    expect(() =>
      assertValidAdminSurfaceRegistry(generatedAdminSurfaceComposition.registryModel),
    ).not.toThrow();
  });
});
