import type { NavigationGroup } from '@community-go/types';

import { createPluginNavigationGroups } from './plugin-navigation';

export const shellNavigationGroups = [
  {
    id: 'universal',
    labelKey: 'nav.universalFoundation',
    items: [
      { kind: 'leaf', id: 'overview', labelKey: 'nav.overview', href: '/', iconId: 'dashboard' },
    ],
  },
] as const satisfies readonly NavigationGroup[];

/** 合并静态 Shell Navigation 与 Admin Surface Registry 派生的 Plugin Navigation（最小 Shell bridge）。 */
export const combinedShellNavigationGroups: readonly NavigationGroup[] = [
  ...shellNavigationGroups,
  ...createPluginNavigationGroups(),
];
