import type { NavigationGroup } from '@community-go/types';

import { createPluginNavigationGroups } from './plugin-navigation';

export const shellNavigationGroups = [
  {
    id: 'universal',
    labelKey: 'nav.universalFoundation',
    items: [
      { kind: 'leaf', id: 'overview', labelKey: 'nav.overview', href: '/' },
      { kind: 'leaf', id: 'foundations', labelKey: 'nav.foundations', href: '/foundations' },
      { kind: 'leaf', id: 'motion', labelKey: 'nav.motion', href: '/motion' },
      {
        kind: 'branch',
        id: 'uiElements',
        labelKey: 'nav.uiElements',
        defaultHref: '/ui-elements/actions-selection',
        children: [
          {
            kind: 'leaf',
            id: 'uiActionsSelection',
            labelKey: 'nav.uiActionsSelection',
            href: '/ui-elements/actions-selection',
          },
          {
            kind: 'leaf',
            id: 'uiFeedback',
            labelKey: 'nav.uiFeedback',
            href: '/ui-elements/feedback',
          },
          {
            kind: 'leaf',
            id: 'uiStatusAsync',
            labelKey: 'nav.uiStatusAsync',
            href: '/ui-elements/status-async',
          },
          {
            kind: 'leaf',
            id: 'uiIdentityDisplay',
            labelKey: 'nav.uiIdentityDisplay',
            href: '/ui-elements/identity-display',
          },
          {
            kind: 'leaf',
            id: 'uiNavigation',
            labelKey: 'nav.uiNavigation',
            href: '/ui-elements/navigation',
          },
          { kind: 'leaf', id: 'uiData', labelKey: 'nav.uiData', href: '/ui-elements/data' },
          {
            kind: 'leaf',
            id: 'uiSurfaces',
            labelKey: 'nav.uiSurfaces',
            href: '/ui-elements/surfaces',
          },
          { kind: 'leaf', id: 'uiForms', labelKey: 'nav.uiForms', href: '/ui-elements/forms' },
          {
            kind: 'leaf',
            id: 'uiOverlays',
            labelKey: 'nav.uiOverlays',
            href: '/ui-elements/overlays',
          },
        ],
      },
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
      { kind: 'leaf', id: 'states', labelKey: 'nav.states', href: '/states' },
    ],
  },
  {
    id: 'system',
    labelKey: 'nav.system',
    items: [{ kind: 'leaf', id: 'preferences', labelKey: 'nav.preferences', href: '/preferences' }],
  },
] as const satisfies readonly NavigationGroup[];

/** 合并静态 Shell Navigation 与 Admin Surface Registry 派生的 Plugin Navigation（最小 Shell bridge）。 */
export const combinedShellNavigationGroups: readonly NavigationGroup[] = [
  ...shellNavigationGroups,
  ...createPluginNavigationGroups(),
];
