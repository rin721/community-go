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
  hasNavigation: true,
  navigationId: 'reference-resources.list',
  labelKey: 'referenceResources.nav.list',
  groupId: 'reference',
  titleKey: 'referenceResources.list.title',
};

const createRoute: AdminFileRouteDescriptor = {
  routeId: 'reference-resources.create',
  pluginId: 'reference-resources',
  path: 'create',
  segments: ['create'],
  pattern: '/reference-resources/create',
  paramNames: [],
  hasNavigation: false,
  titleKey: 'referenceResources.create.title',
};

const detailRoute: AdminFileRouteDescriptor = {
  routeId: 'reference-resources.detail',
  pluginId: 'reference-resources',
  path: '[id]',
  segments: ['[id]'],
  pattern: '/reference-resources/[id]',
  paramNames: ['id'],
  hasNavigation: false,
  titleKey: 'referenceResources.detail.title',
};

const editRoute: AdminFileRouteDescriptor = {
  routeId: 'reference-resources.edit',
  pluginId: 'reference-resources',
  path: '[id]/edit',
  segments: ['[id]', 'edit'],
  pattern: '/reference-resources/[id]/edit',
  paramNames: ['id'],
  hasNavigation: false,
  titleKey: 'referenceResources.edit.title',
};

const catalog: AdminRouteCatalog = {
  plugins: [plugin],
  routes: [listRoute, createRoute, detailRoute, editRoute],
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

describe('Admin Framework registry', () => {
  it('派生 canonical hierarchy：create/detail/edit 继承 list navigation', () => {
    const registry = createAdminRegistry(catalog);

    expect(registry.routes['reference-resources.list']?.orphan).toBe(false);
    expect(registry.routes['reference-resources.list']?.activeNavigationId).toBe(
      'reference-resources.list',
    );
    expect(registry.routes['reference-resources.create']?.canonicalParentRouteId).toBe(
      'reference-resources.list',
    );
    expect(registry.routes['reference-resources.create']?.activeNavigationId).toBe(
      'reference-resources.list',
    );
    expect(registry.routes['reference-resources.create']?.orphan).toBe(false);

    // edit hierarchy 为 list -> detail -> edit
    expect(registry.routes['reference-resources.detail']?.canonicalParentRouteId).toBe(
      'reference-resources.list',
    );
    expect(registry.routes['reference-resources.edit']?.canonicalParentRouteId).toBe(
      'reference-resources.detail',
    );
    expect(registry.routes['reference-resources.edit']?.ancestorRouteIds).toEqual([
      'reference-resources.detail',
      'reference-resources.list',
    ]);
    expect(registry.routes['reference-resources.edit']?.activeNavigationId).toBe(
      'reference-resources.list',
    );
  });

  it('只有声明 navigation 的 Route 进入 Navigation tree，且派生 href', () => {
    const registry = createAdminRegistry(catalog);
    expect(registry.navigationTree).toHaveLength(1);
    expect(registry.navigationTree[0]?.groupId).toBe('reference');
    expect(registry.navigationTree[0]?.items).toHaveLength(1);
    expect(registry.navigationTree[0]?.items[0]).toMatchObject({
      routeId: 'reference-resources.list',
      navigationId: 'reference-resources.list',
      href: '/reference-resources',
    });
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

  it('orphan Route 被诊断', () => {
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
          hasNavigation: false,
        },
      ],
    };
    const registry = createAdminRegistry(orphanCatalog);
    expect(registry.routes['reference-resources.orphan']?.orphan).toBe(true);
    expect(registry.diagnostics.map((d) => d.code)).toContain('ORPHAN_ROUTE');
  });

  it('跨 Plugin override 与缺失 rationale 被诊断', () => {
    const badCatalog: AdminRouteCatalog = {
      plugins: [plugin],
      routes: [
        {
          ...listRoute,
          canonicalParentOverride: { routeId: 'other-plugin.route', rationale: '' },
          activeNavigationOverride: { navigationId: 'other-plugin.nav', rationale: '' },
        },
      ],
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
