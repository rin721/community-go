import type { NavigationItem } from '@community-go/types';

const navigation = [
  { id: 'overview', labelKey: 'nav.overview', href: '/', group: 'workspace' },
  { id: 'foundations', labelKey: 'nav.foundations', href: '/foundations', group: 'workspace' },
  { id: 'states', labelKey: 'nav.states', href: '/states', group: 'workspace' },
  { id: 'preferences', labelKey: 'nav.preferences', href: '/preferences', group: 'system' },
] as const satisfies readonly NavigationItem[];

export function getNavigation(): readonly NavigationItem[] {
  return navigation;
}

export function isNavigationHrefActive(currentPath: string, href: string): boolean {
  return href === '/' ? currentPath === href : currentPath.startsWith(href);
}
