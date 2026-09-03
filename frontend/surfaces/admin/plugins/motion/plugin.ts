import type { AdminPluginDefinition } from '@community-go/admin-framework/plugin';

export const pluginDefinition = {
  pluginId: 'motion',
  mount: '/motion',
} as const satisfies AdminPluginDefinition;
