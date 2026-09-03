import type { AdminPluginDefinition } from '@community-go/admin-framework/plugin';

export const pluginDefinition = {
  pluginId: 'ui-elements',
  mount: '/ui-elements',
} as const satisfies AdminPluginDefinition;
