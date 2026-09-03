import type { AdminPluginDefinition } from '@community-go/admin-framework/plugin';

export const pluginDefinition = {
  pluginId: 'states',
  mount: '/states',
} as const satisfies AdminPluginDefinition;
