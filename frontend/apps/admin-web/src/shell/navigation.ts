import type { NavigationGroup } from '@community-go/types';

import { createPluginNavigationGroups } from './plugin-navigation';

export const shellNavigationGroups = [
  {
    id: 'universal',
    labelKey: 'nav.universalFoundation',
    items: [
      { kind: 'leaf', id: 'overview', labelKey: 'nav.overview', href: '/', iconId: 'dashboard' },
      {
        kind: 'leaf',
        id: 'foundations',
        labelKey: 'nav.foundations',
        href: '/foundations',
        iconId: 'foundations',
      },
      { kind: 'leaf', id: 'motion', labelKey: 'nav.motion', href: '/motion' },
    ],
  },
  {
    id: 'admin',
    labelKey: 'nav.adminFoundation',
    items: [
      {
        kind: 'branch',
        id: 'adminPatterns',
        labelKey: 'nav.adminPatterns',
        defaultHref: '/admin-patterns/layout-navigation',
        children: [
          {
            kind: 'leaf',
            id: 'adminLayoutNavigation',
            labelKey: 'nav.adminLayoutNavigation',
            href: '/admin-patterns/layout-navigation',
          },
          {
            kind: 'leaf',
            id: 'adminCollectionsData',
            labelKey: 'nav.adminCollectionsData',
            href: '/admin-patterns/collections-data',
          },
          {
            kind: 'leaf',
            id: 'adminFormsActions',
            labelKey: 'nav.adminFormsActions',
            href: '/admin-patterns/forms-actions',
          },
          {
            kind: 'leaf',
            id: 'adminStatesFeedback',
            labelKey: 'nav.adminStatesFeedback',
            href: '/admin-patterns/states-feedback',
          },
          {
            kind: 'leaf',
            id: 'adminDetailSettings',
            labelKey: 'nav.adminDetailSettings',
            href: '/admin-patterns/detail-settings',
          },
        ],
      },
      {
        kind: 'branch',
        id: 'adminReference',
        labelKey: 'nav.adminReference',
        defaultHref: '/admin-reference/overview',
        children: [
          {
            kind: 'leaf',
            id: 'adminOverview',
            labelKey: 'nav.adminOverview',
            href: '/admin-reference/overview',
          },
          {
            kind: 'leaf',
            id: 'adminResourceList',
            labelKey: 'nav.adminResourceList',
            href: '/admin-reference/resource-list',
          },
          {
            kind: 'leaf',
            id: 'adminDetail',
            labelKey: 'nav.adminDetail',
            href: '/admin-reference/detail',
          },
          {
            kind: 'leaf',
            id: 'adminCreateEdit',
            labelKey: 'nav.adminCreateEdit',
            href: '/admin-reference/create-edit',
          },
          {
            kind: 'leaf',
            id: 'adminSettings',
            labelKey: 'nav.adminSettings',
            href: '/admin-reference/settings',
          },
          {
            kind: 'leaf',
            id: 'adminMasterDetail',
            labelKey: 'nav.adminMasterDetail',
            href: '/admin-reference/master-detail',
          },
          {
            kind: 'leaf',
            id: 'adminOperation',
            labelKey: 'nav.adminOperation',
            href: '/admin-reference/operation',
          },
        ],
      },
      { kind: 'leaf', id: 'states', labelKey: 'nav.states', href: '/states', iconId: 'states' },
    ],
  },
] as const satisfies readonly NavigationGroup[];

/** 合并静态 Shell Navigation 与 Admin Surface Registry 派生的 Plugin Navigation（最小 Shell bridge）。 */
export const combinedShellNavigationGroups: readonly NavigationGroup[] = [
  ...shellNavigationGroups,
  ...createPluginNavigationGroups(),
];
