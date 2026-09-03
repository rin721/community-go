import type { AdminRouteMeta } from '@community-go/admin-framework/plugin';

/**
 * 偏好设置 Route（隐藏 route 也可带 titleKey 供 breadcrumb）。
 * Sidebar 归属由 plugin.navigation.ts 声明（system-tools.root.preferences）。
 */
export const routeMeta = {
  titleKey: 'systemTools.preferences.title',
} as const satisfies AdminRouteMeta;
