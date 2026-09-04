import type { PluginDefinition } from '@community-go/plugin-framework/plugin';

export const pluginDefinition = {
  pluginId: 'system-tools',
  mount: '/system-tools',
} as const satisfies PluginDefinition;
