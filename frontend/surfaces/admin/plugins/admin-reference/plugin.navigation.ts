import type { AdminNavigationContribution } from '@community-go/admin-framework/navigation';

/**
 * admin-reference —— Sidebar Navigation Contribution。
 *
 * Group `development`（plugins 公共 Group Alias）下可展开 Parent + 7 个页面 Child。
 * Parent 无 routeId（纯 Disclosure）；页面文案 reference 与 formReference namespace
 * 是跨 Plugin shared 词汇（ui-elements 亦消费），保留在 Host i18n resources，
 * 非本 Plugin 私有。
 */
export const navigationContribution = {
  parents: [
    {
      navigationId: 'admin-reference.root',
      labelKey: 'adminReference.nav.root',
      groupId: 'development',
      iconId: 'resource',
      children: [
        {
          navigationId: 'admin-reference.root.overview',
          labelKey: 'adminReference.nav.overview',
          routeId: 'admin-reference.overview',
          order: 0,
        },
        {
          navigationId: 'admin-reference.root.resource-list',
          labelKey: 'adminReference.nav.resourceList',
          routeId: 'admin-reference.resource-list',
          order: 1,
        },
        {
          navigationId: 'admin-reference.root.detail',
          labelKey: 'adminReference.nav.detail',
          routeId: 'admin-reference.detail',
          order: 2,
        },
        {
          navigationId: 'admin-reference.root.create-edit',
          labelKey: 'adminReference.nav.createEdit',
          routeId: 'admin-reference.create-edit',
          order: 3,
        },
        {
          navigationId: 'admin-reference.root.settings',
          labelKey: 'adminReference.nav.settings',
          routeId: 'admin-reference.settings',
          order: 4,
        },
        {
          navigationId: 'admin-reference.root.master-detail',
          labelKey: 'adminReference.nav.masterDetail',
          routeId: 'admin-reference.master-detail',
          order: 5,
        },
        {
          navigationId: 'admin-reference.root.operation',
          labelKey: 'adminReference.nav.operation',
          routeId: 'admin-reference.operation',
          order: 6,
        },
      ],
    },
  ],
} as const satisfies AdminNavigationContribution;
