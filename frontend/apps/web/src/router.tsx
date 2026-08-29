import { createBrowserRouter } from 'react-router';

import { AppShell } from './shell/app-shell';
import { OverviewScreen } from './features/overview/overview-screen';

export const router = createBrowserRouter([
  {
    path: '/',
    Component: AppShell,
    children: [
      { index: true, Component: OverviewScreen },
      {
        path: 'foundations',
        lazy: async () => ({
          Component: (await import('./features/foundations/foundations-screen')).FoundationsScreen,
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
