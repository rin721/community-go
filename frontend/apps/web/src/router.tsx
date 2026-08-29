import { createBrowserRouter } from 'react-router';

import { AppShell } from './shell/app-shell';
import { OverviewScreen } from './features/overview/overview-screen';

export const router = createBrowserRouter([
  {
    path: '/',
    Component: AppShell,
    hydrateFallbackElement: (
      <main
        aria-busy="true"
        aria-label="正在加载应用"
        className="grid min-h-screen place-items-center bg-canvas p-6 text-ink"
      >
        <div className="w-full max-w-sm animate-pulse space-y-4" role="status">
          <div className="h-4 w-28 rounded-full bg-border-strong" />
          <div className="h-10 w-full rounded-control bg-border" />
          <div className="h-28 w-full rounded-panel bg-surface-muted" />
          <span className="sr-only">正在加载应用</span>
        </div>
      </main>
    ),
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
