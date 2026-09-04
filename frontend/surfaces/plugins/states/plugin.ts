import type { PluginDefinition } from '@community-go/plugin-framework/plugin';

export const pluginDefinition = {
  pluginId: 'states',
  mount: '/states',
} as const satisfies PluginDefinition;
