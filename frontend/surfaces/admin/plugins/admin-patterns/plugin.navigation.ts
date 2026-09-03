import type { AdminNavigationContribution } from '@community-go/admin-framework/navigation';

/**
 * admin-patterns —— Sidebar Navigation Contribution。
 *
 * Group `development`（plugins 公共 Group Alias）下可展开 Parent + 5 个 Pattern Child。
 * Parent 无 routeId（纯 Disclosure，点击展开/收起）；Child 各指向静态 Route。
 */
export const navigationContribution = {
  parents: [
    {
      navigationId: 'admin-patterns.root',
      labelKey: 'adminPatterns.nav.root',
      groupId: 'development',
      iconId: 'catalog',
      children: [
        {
          navigationId: 'admin-patterns.root.layout-navigation',
          labelKey: 'adminPatterns.nav.layoutNavigation',
          routeId: 'admin-patterns.layout-navigation',
          order: 0,
        },
        {
          navigationId: 'admin-patterns.root.collections-data',
          labelKey: 'adminPatterns.nav.collectionsData',
          routeId: 'admin-patterns.collections-data',
          order: 1,
        },
        {
          navigationId: 'admin-patterns.root.forms-actions',
          labelKey: 'adminPatterns.nav.formsActions',
          routeId: 'admin-patterns.forms-actions',
          order: 2,
        },
        {
          navigationId: 'admin-patterns.root.states-feedback',
          labelKey: 'adminPatterns.nav.statesFeedback',
          routeId: 'admin-patterns.states-feedback',
          order: 3,
        },
        {
          navigationId: 'admin-patterns.root.detail-settings',
          labelKey: 'adminPatterns.nav.detailSettings',
          routeId: 'admin-patterns.detail-settings',
          order: 4,
        },
      ],
    },
  ],
} as const satisfies AdminNavigationContribution;
