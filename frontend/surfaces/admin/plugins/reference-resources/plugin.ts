import type { AdminPluginDefinition } from '@community-go/admin-framework/plugin';

export const pluginDefinition = {
  pluginId: 'reference-resources',
  mount: '/reference-resources',
} as const satisfies AdminPluginDefinition;
