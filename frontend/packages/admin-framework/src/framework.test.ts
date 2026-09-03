import { describe, expect, it } from 'vitest';

import {
  buildRoutePattern,
  collectParamNames,
  dynamicParamName,
  isDynamicSegment,
} from './contract';
import { resolveAdminRouteTarget, createAdminRegistry, hasDynamicSegments } from './registry';
import { analyzeHostCapability, UNSUPPORTED_DYNAMIC_PLUGIN_ROUTE } from './host';
import { encodeSegment, resolveTargetHref, route } from './target';
import type { AdminRouteCatalog, AdminFileRouteDescriptor } from './contract';

const plugin = { pluginId: 'reference-resources', mount: '/reference-resources' } as const;

const listRoute: AdminFileRouteDescriptor = {
  routeId: 'reference-resources.list',
  pluginId: 'reference-resources',
  path: '',
  segments: [],
  pattern: '/reference-resources',
  paramNames: [],
  titleKey: 'referenceResources.list.title',
};

const createRoute: AdminFileRouteDescriptor = {
  routeId: 'reference-resources.create',
  pluginId: 'reference-resources',
  path: 'create',
  segments: ['create'],
  pattern: '/reference-resources/create',
  paramNames: [],
  titleKey: 'referenceResources.create.title',
};

const detailRoute: AdminFileRouteDescriptor = {
  routeId: 'reference-resources.detail',
  pluginId: 'reference-resources',
  path: '[id]',
  segments: ['[id]'],
  pattern: '/reference-resources/[id]',
  paramNames: ['id'],
  titleKey: 'referenceResources.detail.title',
};

const editRoute: AdminFileRouteDescriptor = {
  routeId: 'reference-resources.edit',
  pluginId: 'reference-resources',
  path: '[id]/edit',
  segments: ['[id]', 'edit'],
  pattern: '/reference-resources/[id]/edit',
  paramNames: ['id'],
  titleKey: 'referenceResources.edit.title',
};

const aliases = [{ groupId: 'reference', labelKey: 'adminGroups.reference', order: 0 }] as const;

/** reference-resources：Group `reference` 下单一可导航 Parent（无 children）。 */
const referenceContribution = {
  pluginId: 'reference-resources',
  contribution: {
    parents: [
      {
        navigationId: 'reference-resources.root',
        labelKey: 'referenceResources.nav.root',
        groupId: 'reference',
        iconId: 'resource',
        routeId: 'reference-resources.list',
      },
    ],
  },
} as const;

const catalog: AdminRouteCatalog = {
  plugins: [plugin],
  routes: [listRoute, createRoute, detailRoute, editRoute],
  aliases,
  contributions: [referenceContribution],
};

describe('Admin Framework contract', () => {
  it('识别动态段并提取参数名', () => {
    expect(isDynamicSegment('[id]')).toBe(true);
    expect(isDynamicSegment('create')).toBe(false);
    expect(dynamicParamName('[id]')).toBe('id');
    expect(dynamicParamName('create')).toBeNull();
  });

  it('构造 pattern 并收集参数名', () => {
    expect(buildRoutePattern('/reference-resources', [])).toBe('/reference-resources');
    expect(buildRoutePattern('/reference-resources', ['[id]', 'edit'])).toBe(
      '/reference-resources/[id]/edit',
    );
    expect(collectParamNames('/reference-resources/[id]/edit')).toEqual(['id']);
  });
});

describe('Admin Framework route target', () => {
  it('route() 只创建 symbolic target，不触发导航', () => {
    expect(route('reference-resources.detail', { id: 'abc' })).toEqual({
      routeId: 'reference-resources.detail',
      params: { id: 'abc' },
    });
  });

  it('逐段编码并替换动态参数', () => {
    expect(encodeSegment('a b/c')).toBe('a%20b%2Fc');
    expect(resolveTargetHref('/reference-resources/[id]', { id: 'a b' })).toBe(
      '/reference-resources/a%20b',
    );
  });
});

describe('Admin Framework registry — Sidebar navigation (Group → Parent → Child)', () => {
  it('resolved navigation：Group(reference) → Parent(root) → 可导航（routeId 静态解析 href）', () => {
    const registry = createAdminRegistry(catalog);
    expect(registry.navigation).toHaveLength(1);
    const group = registry.navigation[0];
    expect(group?.groupId).toBe('reference');
    expect(group?.labelKey).toBe('adminGroups.reference');
    expect(group?.parents).toHaveLength(1);
    const parent = group?.parents[0];
    expect(parent?.navigationId).toBe('reference-resources.root');
    expect(parent?.iconId).toBe('resource');
    expect(parent?.href).toBe('/reference-resources');
    expect(parent?.children).toEqual([]);
  });

  it('canonical hierarchy 与 activeNavigationId：隐藏 Route 关联到 Sidebar Node', () => {
    const registry = createAdminRegistry(catalog);
    // list route 自身命中 Node → activeNavigationId = Node
    expect(registry.routes['reference-resources.list']?.activeNavigationId).toBe(
      'reference-resources.root',
    );
    expect(registry.routes['reference-resources.list']?.orphan).toBe(false);
    // create/detail/edit 是隐藏 Route：沿 canonical 找到命中 Node 的祖先（list）
    expect(registry.routes['reference-resources.create']?.canonicalParentRouteId).toBe(
      'reference-resources.list',
    );
    expect(registry.routes['reference-resources.create']?.activeNavigationId).toBe(
      'reference-resources.root',
    );
    expect(registry.routes['reference-resources.create']?.orphan).toBe(false);
    expect(registry.routes['reference-resources.detail']?.canonicalParentRouteId).toBe(
      'reference-resources.list',
    );
    expect(registry.routes['reference-resources.edit']?.ancestorRouteIds).toEqual([
      'reference-resources.detail',
      'reference-resources.list',
    ]);
    expect(registry.routes['reference-resources.edit']?.activeNavigationId).toBe(
      'reference-resources.root',
    );
  });

  it('Parent 无 routeId → 纯 Disclosure（无 href）；无 routeId 且无 children → orphan 诊断', () => {
    const disclosureCatalog: AdminRouteCatalog = {
      plugins: [plugin],
      routes: [listRoute],
      aliases,
      contributions: [
        {
          pluginId: 'reference-resources',
          contribution: {
            parents: [
              {
                navigationId: 'reference-resources.group',
                labelKey: 'nav.group',
                groupId: 'reference',
                children: [
                  {
                    navigationId: 'reference-resources.group.list',
                    labelKey: 'nav.list',
                    routeId: 'reference-resources.list',
                  },
                ],
              },
            ],
          },
        },
      ],
    };
    const registry = createAdminRegistry(disclosureCatalog);
    const parent = registry.navigation[0]?.parents[0];
    expect(parent?.href).toBeUndefined(); // 纯 Disclosure
    expect(parent?.children.map((child) => child.href)).toEqual(['/reference-resources']);

    const orphanCatalog: AdminRouteCatalog = {
      plugins: [plugin],
      routes: [listRoute],
      aliases,
      contributions: [
        {
          pluginId: 'reference-resources',
          contribution: {
            parents: [
              {
                navigationId: 'reference-resources.bad',
                labelKey: 'nav.bad',
                groupId: 'reference',
                // 无 routeId 且无 children
              },
            ],
          },
        },
      ],
    };
    const orphanRegistry = createAdminRegistry(orphanCatalog);
    expect(orphanRegistry.diagnostics.map((d) => d.code)).toContain('NAVIGATION_NODE_ORPHAN');
  });

  it('Sidebar Node 引用不存在 routeId / 动态 route → deterministic diagnostics', () => {
    const unknownTarget: AdminRouteCatalog = {
      plugins: [plugin],
      routes: [listRoute],
      aliases,
      contributions: [
        {
          pluginId: 'reference-resources',
          contribution: {
            parents: [
              {
                navigationId: 'reference-resources.root',
                labelKey: 'nav',
                groupId: 'reference',
                routeId: 'reference-resources.nope',
              },
            ],
          },
        },
      ],
    };
    expect(createAdminRegistry(unknownTarget).diagnostics.map((d) => d.code)).toContain(
      'UNKNOWN_NAVIGATION_ROUTE_TARGET',
    );

    const dynamicTarget: AdminRouteCatalog = {
      plugins: [plugin],
      routes: [listRoute, detailRoute],
      aliases,
      contributions: [
        {
          pluginId: 'reference-resources',
          contribution: {
            parents: [
              {
                navigationId: 'reference-resources.root',
                labelKey: 'nav',
                groupId: 'reference',
                children: [
                  {
                    navigationId: 'reference-resources.detail',
                    labelKey: 'detail',
                    routeId: 'reference-resources.detail', // 动态 [id] route
                  },
                ],
              },
            ],
          },
        },
      ],
    };
    expect(createAdminRegistry(dynamicTarget).diagnostics.map((d) => d.code)).toContain(
      'NAVIGATION_DYNAMIC_TARGET_UNSUPPORTED',
    );
  });

  it('navigationId 越出 plugin namespace → deterministic diagnostics', () => {
    const badNamespace: AdminRouteCatalog = {
      plugins: [plugin],
      routes: [listRoute],
      aliases,
      contributions: [
        {
          pluginId: 'reference-resources',
          contribution: {
            parents: [
              {
                navigationId: 'other-plugin.root',
                labelKey: 'nav',
                groupId: 'reference',
                routeId: 'reference-resources.list',
              },
            ],
          },
        },
      ],
    };
    expect(createAdminRegistry(badNamespace).diagnostics.map((d) => d.code)).toContain(
      'NAVIGATION_NAMESPACE_VIOLATION',
    );
  });

  it('引用不存在的 Group Alias → UNKNOWN_ADMIN_NAVIGATION_GROUP', () => {
    const badAlias: AdminRouteCatalog = {
      plugins: [plugin],
      routes: [listRoute],
      aliases,
      contributions: [
        {
          pluginId: 'reference-resources',
          contribution: {
            parents: [
              {
                navigationId: 'reference-resources.root',
                labelKey: 'nav',
                groupId: 'nope.missing',
                routeId: 'reference-resources.list',
              },
            ],
          },
        },
      ],
    };
    expect(createAdminRegistry(badAlias).diagnostics.map((d) => d.code)).toContain(
      'UNKNOWN_ADMIN_NAVIGATION_GROUP',
    );
  });

  it('breadcrumb topology 沿 canonical hierarchy 派生', () => {
    const registry = createAdminRegistry(catalog);
    const breadcrumbs = registry.breadcrumbs['reference-resources.edit'];
    expect(breadcrumbs?.map((item) => item.routeId)).toEqual([
      'reference-resources.detail',
      'reference-resources.list',
    ]);
  });

  it('resolveAdminRouteTarget 校验缺失/多余参数并编码', () => {
    const registry = createAdminRegistry(catalog);
    const ok = resolveAdminRouteTarget(
      registry,
      route('reference-resources.detail', { id: 'a b' }),
    );
    expect(ok.diagnostics).toHaveLength(0);
    expect(ok.href).toBe('/reference-resources/a%20b');

    const missing = resolveAdminRouteTarget(registry, route('reference-resources.detail', {}));
    expect(missing.diagnostics.map((d) => d.code)).toContain('MISSING_PARAMS');

    const extra = resolveAdminRouteTarget(
      registry,
      route('reference-resources.detail', { id: '1', unused: 'x' }),
    );
    expect(extra.diagnostics.map((d) => d.code)).toContain('EXTRA_PARAMS');

    const unknown = resolveAdminRouteTarget(registry, route('nope.missing', {}));
    expect(unknown.diagnostics.map((d) => d.code)).toContain('UNKNOWN_ROUTE');
  });

  it('Route 无任何 Sidebar 归属（无 Node 命中、无 override）→ orphan 诊断', () => {
    const orphanCatalog: AdminRouteCatalog = {
      plugins: [plugin],
      routes: [
        {
          routeId: 'reference-resources.orphan',
          pluginId: 'reference-resources',
          path: 'orphan',
          segments: ['orphan'],
          pattern: '/reference-resources/orphan',
          paramNames: [],
        },
      ],
      aliases,
      contributions: [],
    };
    const registry = createAdminRegistry(orphanCatalog);
    expect(registry.routes['reference-resources.orphan']?.orphan).toBe(true);
    expect(registry.diagnostics.map((d) => d.code)).toContain('ORPHAN_ROUTE');
  });

  it('跨 Plugin override 与缺失 rationale 被诊断（Route Context metadata 保留）', () => {
    const badCatalog: AdminRouteCatalog = {
      plugins: [plugin],
      routes: [
        {
          ...listRoute,
          canonicalParentOverride: { routeId: 'other-plugin.route', rationale: '' },
          activeNavigationOverride: { navigationId: 'other-plugin.nav', rationale: '' },
        },
      ],
      aliases,
      contributions: [],
    };
    const registry = createAdminRegistry(badCatalog);
    const codes = registry.diagnostics.map((d) => d.code);
    expect(codes).toContain('CROSS_PLUGIN_REFERENCE');
    expect(codes).toContain('INVALID_OVERRIDE_RATIONALE');
  });
});

describe('Admin Framework host capability', () => {
  it('Static Export Host 对动态 Plugin Route 失败且不降级', () => {
    const result = analyzeHostCapability([listRoute, detailRoute]);
    expect(result.canDeploy).toBe(false);
    expect(result.unsupported.map((route) => route.routeId)).toEqual([
      'reference-resources.detail',
    ]);
    expect(result.diagnostics.map((d) => d.code)).toContain(UNSUPPORTED_DYNAMIC_PLUGIN_ROUTE);
    expect(hasDynamicSegments('/reference-resources/[id]')).toBe(true);
    expect(hasDynamicSegments('/reference-resources')).toBe(false);
  });

  it('全静态 Route 集合可通过 Host capability gate', () => {
    const result = analyzeHostCapability([listRoute, createRoute]);
    expect(result.canDeploy).toBe(true);
    expect(result.diagnostics).toHaveLength(0);
  });
});
