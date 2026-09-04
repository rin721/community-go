import type { NavigationContribution } from '@community-go/plugin-framework/navigation';

/**
 * governance —— Sidebar Navigation Contribution。
 *
 * Group `development`（plugins 公共 Group Alias）下带 routeId 的 Parent，
 * routeId 指向 Dashboard Route（/governance）。不加新 iconId（不扩展
 * Product Surface icon vocabulary）。
 */
export const navigationContribution = {
  parents: [
    {
      navigationId: 'governance.root',
      labelKey: 'governanceNav.root',
      groupId: 'development',
      routeId: 'governance.dashboard',
    },
  ],
} as const satisfies NavigationContribution;
