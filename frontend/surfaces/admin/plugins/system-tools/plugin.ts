import type { AdminPluginDefinition } from '@community-go/admin-framework/plugin';

export const pluginDefinition = {
  pluginId: 'system-tools',
  mount: '/system-tools',
} as const satisfies AdminPluginDefinition;
