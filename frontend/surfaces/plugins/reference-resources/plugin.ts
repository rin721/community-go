import type { PluginDefinition } from '@community-go/plugin-framework/plugin';

export const pluginDefinition = {
  pluginId: 'reference-resources',
  mount: '/reference-resources',
} as const satisfies PluginDefinition;
