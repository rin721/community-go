import type { AdminRouteMeta } from '@community-go/admin-framework/plugin';

/**
 * reference-resources 编辑页。
 * 不声明 navigation；canonicalParentOverride 指向同 Plugin 的 detail Route，
 * 形成 detail → list 的层级；孤儿检测必须通过。
 */
export const routeMeta = {
  titleKey: 'referenceResources.edit.title',
  canonicalParentOverride: {
    routeId: 'reference-resources.detail',
    rationale: '编辑是详情下的子任务，canonical parent 必须落在同 Plugin 的 detail Route。',
  },
} as const satisfies AdminRouteMeta;
