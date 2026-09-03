import type { AdminPluginDefinition } from '@community-go/admin-framework/plugin';

export const pluginDefinition = {
  pluginId: 'foundations',
  mount: '/foundations',
} as const satisfies AdminPluginDefinition;
