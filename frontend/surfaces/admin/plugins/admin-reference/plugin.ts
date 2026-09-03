import type { AdminPluginDefinition } from '@community-go/admin-framework/plugin';

export const pluginDefinition = {
  pluginId: 'admin-reference',
  mount: '/admin-reference',
} as const satisfies AdminPluginDefinition;
