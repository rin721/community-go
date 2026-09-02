import type { AdminRouteMeta } from '@community-go/admin-framework/plugin';

/**
 * reference-resources 详情页。
 * 不声明 navigation；沿 canonical hierarchy 继承列表导航。
 */
export const routeMeta = {
  titleKey: 'referenceResources.detail.title',
} as const satisfies AdminRouteMeta;
