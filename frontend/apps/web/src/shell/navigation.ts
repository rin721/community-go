import type { NavigationGroup } from '@community-go/types';

export const shellNavigationGroups = [
  {
    id: 'workspace',
    labelKey: 'nav.workspace',
    items: [
      { kind: 'leaf', id: 'overview', labelKey: 'nav.overview', href: '/' },
      {
        kind: 'leaf',
        id: 'foundations',
        labelKey: 'nav.foundations',
        href: '/foundations',
      },
      {
        kind: 'branch',
        id: 'reference',
        labelKey: 'nav.reference',
        defaultHref: '/reference',
        children: [
          {
            kind: 'leaf',
            id: 'referenceWorkspace',
            labelKey: 'nav.referenceWorkspace',
            href: '/reference',
          },
          {
            kind: 'leaf',
            id: 'formReference',
            labelKey: 'nav.formReference',
            href: '/reference/form',
          },
        ],
      },
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
          {
            kind: 'leaf',
            id: 'uiData',
            labelKey: 'nav.uiData',
            href: '/ui-elements/data',
          },
          {
            kind: 'leaf',
            id: 'uiSurfaces',
            labelKey: 'nav.uiSurfaces',
            href: '/ui-elements/surfaces',
          },
          {
            kind: 'leaf',
            id: 'uiForms',
            labelKey: 'nav.uiForms',
            href: '/ui-elements/forms',
          },
          {
            kind: 'leaf',
            id: 'uiOverlays',
            labelKey: 'nav.uiOverlays',
            href: '/ui-elements/overlays',
          },
        ],
      },
      { kind: 'leaf', id: 'states', labelKey: 'nav.states', href: '/states' },
    ],
  },
  {
    id: 'system',
    labelKey: 'nav.system',
    items: [
      {
        kind: 'leaf',
        id: 'preferences',
        labelKey: 'nav.preferences',
        href: '/preferences',
      },
    ],
  },
] as const satisfies readonly NavigationGroup[];
