import type { AdminRouteMeta } from '@community-go/admin-framework/plugin';

/**
 * reference-resources 创建页。
 * 不声明 navigation；沿 canonical hierarchy 继承列表导航（孤儿检测必须通过）。
 */
export const routeMeta = {
  titleKey: 'referenceResources.create.title',
} as const satisfies AdminRouteMeta;
