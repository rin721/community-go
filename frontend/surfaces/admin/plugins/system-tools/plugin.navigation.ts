import type { AdminNavigationContribution } from '@community-go/admin-framework/navigation';

/**
 * system-tools —— Sidebar Navigation Contribution。
 *
 * Group `system`（plugins 公共 Group Alias）下的纯 Disclosure Parent
 * （无 routeId，Shell 点击只展开/收起）。icons 与 preferences 是两个可见 Child。
 */
export const navigationContribution = {
  parents: [
    {
      navigationId: 'system-tools.root',
      labelKey: 'systemTools.nav.root',
      groupId: 'system',
      iconId: 'settings',
      children: [
        {
          navigationId: 'system-tools.root.icons',
          labelKey: 'systemTools.nav.icons',
          routeId: 'system-tools.icons',
          order: 0,
        },
        {
          navigationId: 'system-tools.root.preferences',
          labelKey: 'systemTools.nav.preferences',
          routeId: 'system-tools.preferences',
          order: 1,
        },
      ],
    },
  ],
} as const satisfies AdminNavigationContribution;
