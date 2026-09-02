import type { AdminRouteMeta } from '@community-go/admin-framework/plugin';

/**
 * reference-resources 列表页（mount `/reference-resources`，根 Route）。
 * 声明 navigation 贡献：进入 Sidebar/Command，groupId 为 Admin Surface taxonomy。
 * routeId = pluginId（根 Route 不带后缀）。
 */
export const routeMeta = {
  navigation: {
    navigationId: 'reference-resources',
    labelKey: 'referenceResources.nav.list',
    groupId: 'admin.reference',
  },
  titleKey: 'referenceResources.list.title',
} as const satisfies AdminRouteMeta;
