import { describe, expect, it } from 'vitest';

import type { AdminRouteCatalog } from '@community-go/admin-framework';
import { createAdminRegistry } from '@community-go/admin-framework';

import {
  adminSurfaceTaxonomy,
  convertRegistryToShellNavigation,
  findTaxonomyEntry,
} from './shell-model';
import { mergeTranslationResources } from './composition';
import { surfaceShellI18nResources } from './i18n';

const catalog: AdminRouteCatalog = {
  plugins: [{ pluginId: 'reference-resources', mount: '/reference-resources' }],
  routes: [
    {
      routeId: 'reference-resources',
      pluginId: 'reference-resources',
      path: '',
      segments: [],
      pattern: '/reference-resources',
      paramNames: [],
      hasNavigation: true,
      navigationId: 'reference-resources',
      labelKey: 'referenceResources.nav.list',
      groupId: 'admin.reference',
      titleKey: 'referenceResources.list.title',
    },
    {
      routeId: 'reference-resources.create',
      pluginId: 'reference-resources',
      path: 'create',
      segments: ['create'],
      pattern: '/reference-resources/create',
      paramNames: [],
      hasNavigation: false,
      titleKey: 'referenceResources.create.title',
    },
  ],
};

describe('Admin Surface taxonomy', () => {
  it('groupId → 分组 labelKey 映射命中', () => {
    const entry = findTaxonomyEntry('admin.reference');
    expect(entry?.labelKey).toBe('adminShell.referenceGroup');
    expect(findTaxonomyEntry('nope.missing')).toBeUndefined();
  });
});

describe('Registry → Shell navigation 转换', () => {
  it('只转换声明 navigation 的 registry group，叶子映射为 NavigationLeaf', () => {
    const registry = createAdminRegistry(catalog);
    const groups = convertRegistryToShellNavigation(registry, adminSurfaceTaxonomy);
    expect(groups).toHaveLength(1);
    const group = groups[0];
    expect(group?.labelKey).toBe('adminShell.referenceGroup');
    expect(group?.items[0]).toEqual({
      kind: 'leaf',
      id: 'reference-resources',
      labelKey: 'referenceResources.nav.list',
      href: '/reference-resources',
    });
  });

  it('未命中 taxonomy 的 group 不进入 Shell', () => {
    const registry = createAdminRegistry({
      plugins: [{ pluginId: 'other', mount: '/other' }],
      routes: [
        {
          routeId: 'other',
          pluginId: 'other',
          path: '',
          segments: [],
          pattern: '/other',
          paramNames: [],
          hasNavigation: true,
          navigationId: 'other',
          labelKey: 'other.nav',
          groupId: 'other.taxonomy',
        },
      ],
    });
    const groups = convertRegistryToShellNavigation(registry, adminSurfaceTaxonomy);
    expect(groups).toHaveLength(0);
  });
});

describe('i18n Composition 聚合', () => {
  it('合并 surface 与 plugin 资源，同 locale translation 深度合并', () => {
    const pluginResources = {
      'zh-CN': {
        translation: {
          referenceResources: {
            nav: { list: '参考资源' },
            list: { title: '参考资源列表' },
          },
        },
      },
    } as const;
    const merged = mergeTranslationResources(surfaceShellI18nResources, pluginResources);
    const zhCN = merged['zh-CN'];
    expect(zhCN?.translation['adminShell']).toBeTruthy();
    expect(zhCN?.translation['referenceResources']).toBeTruthy();
  });
});
