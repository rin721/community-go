import { describe, expect, it } from 'vitest';

import {
  generatedAdminSurfaceComposition,
  generatedSurfaceI18nResources,
  generatedSurfaceRegistry,
} from '../generated/composition/composition';

describe('Generated composition (deterministic bootstrap)', () => {
  it('Registry 解析 reference-resources 四条静态 Route', () => {
    const registry = generatedSurfaceRegistry;
    expect(registry.catalog.plugins).toHaveLength(1);
    expect(registry.catalog.plugins[0]?.pluginId).toBe('reference-resources');
    expect(registry.catalog.routes).toHaveLength(4);

    const root = registry.routes['reference-resources'];
    expect(root?.descriptor.hasNavigation).toBe(true);
    expect(root?.descriptor.pattern).toBe('/reference-resources');
    expect(root?.activeNavigationId).toBe('reference-resources');
    expect(root?.orphan).toBe(false);

    // edit canonical parent = detail；detail canonical parent = root list
    const edit = registry.routes['reference-resources.edit'];
    expect(edit?.canonicalParentRouteId).toBe('reference-resources.detail');
    expect(edit?.activeNavigationId).toBe('reference-resources');
    expect(edit?.orphan).toBe(false);

    const detail = registry.routes['reference-resources.detail'];
    expect(detail?.canonicalParentRouteId).toBe('reference-resources');
    expect(detail?.orphan).toBe(false);

    // navigation tree 只有声明 navigation 的根 Route
    expect(registry.navigationTree).toHaveLength(1);
    expect(registry.navigationTree[0]?.items).toHaveLength(1);
    expect(registry.navigationTree[0]?.items[0]?.href).toBe('/reference-resources');
  });

  it('i18n composition 聚合 surface + plugin 资源', () => {
    const zhCN = generatedSurfaceI18nResources['zh-CN'];
    expect(zhCN?.translation['adminShell']).toBeTruthy();
    expect(zhCN?.translation['referenceResources']).toBeTruthy();
    const en = generatedSurfaceI18nResources['en'];
    expect(en?.translation['adminShell']).toBeTruthy();
    expect(en?.translation['referenceResources']).toBeTruthy();
  });

  it('composition 包含 registryModel 与 i18nResources', () => {
    expect(generatedAdminSurfaceComposition.registryModel).toBe(generatedSurfaceRegistry);
    expect(generatedAdminSurfaceComposition.i18nResources).toBe(generatedSurfaceI18nResources);
  });
});
