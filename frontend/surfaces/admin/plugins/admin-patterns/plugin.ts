import type { AdminPluginDefinition } from '@community-go/admin-framework/plugin';

export const pluginDefinition = {
  pluginId: 'admin-patterns',
  mount: '/admin-patterns',
} as const satisfies AdminPluginDefinition;
