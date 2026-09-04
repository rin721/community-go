import type { PluginDefinition } from '@community-go/plugin-framework/plugin';

export const pluginDefinition = {
  pluginId: 'page-archetypes',
  mount: '/page-archetypes',
} as const satisfies PluginDefinition;
