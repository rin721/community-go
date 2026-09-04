import type { PluginDefinition } from '@community-go/plugin-framework/plugin';

export const pluginDefinition = {
  pluginId: 'motion',
  mount: '/motion',
} as const satisfies PluginDefinition;
