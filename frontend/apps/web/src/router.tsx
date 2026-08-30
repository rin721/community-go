import { createBrowserRouter } from 'react-router';

import { AppLoadingSurface } from './app/app-loading-surface';
import { AppShell } from './shell/app-shell';
import { OverviewScreen } from './features/overview/overview-screen';
import { i18n } from './i18n/i18n';

export const router = createBrowserRouter([
  {
    path: '/',
    Component: AppShell,
    hydrateFallbackElement: <AppLoadingSurface label={i18n.t('common.appLoading')} />,
    children: [
      { index: true, Component: OverviewScreen },
      {
        path: 'foundations',
        lazy: async () => ({
          Component: (await import('./features/foundations/foundations-screen')).FoundationsScreen,
        }),
      },
      {
        path: 'reference',
        lazy: async () => ({
          Component: (await import('./features/reference/reference-workspace-screen'))
            .ReferenceWorkspaceScreen,
        }),
      },
      {
        path: 'reference/form',
        lazy: async () => ({
          Component: (await import('./features/reference/reference-form-screen'))
            .ReferenceFormScreen,
        }),
      },
      {
        path: 'showcase',
        lazy: async () => ({
          Component: (await import('./features/showcase/showcase-screen')).ShowcaseScreen,
        }),
      },
      {
        path: 'states',
        lazy: async () => ({
          Component: (await import('./features/states/states-screen')).StatesScreen,
        }),
      },
      {
        path: 'preferences',
        lazy: async () => ({
          Component: (await import('./features/preferences/preferences-screen')).PreferencesScreen,
        }),
      },
    ],
  },
]);
