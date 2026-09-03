import type { AdminRouteMeta } from '@community-go/admin-framework/plugin';

/**
 * reference-resources 列表页（mount `/reference-resources`，根 Route）。
 * Sidebar 归属由 plugin.navigation.ts 声明（本文件不再含 navigation）。
 */
export const routeMeta = {
  titleKey: 'referenceResources.list.title',
} as const satisfies AdminRouteMeta;
