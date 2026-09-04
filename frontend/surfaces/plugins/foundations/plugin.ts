import type { PluginDefinition } from '@community-go/plugin-framework/plugin';

export const pluginDefinition = {
  pluginId: 'foundations',
  mount: '/foundations',
} as const satisfies PluginDefinition;
