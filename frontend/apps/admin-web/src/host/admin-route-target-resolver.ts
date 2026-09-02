'use client';

import { generatedSurfaceRegistry } from '@community-go/admin-surface/generated/composition';
import { resolveAdminRouteTarget } from '@community-go/admin-framework';

/**
 * Host Route Target Resolver —— 唯一解析 Route Target → href 的地方。
 *
 * Host 在 Root Provider 中一次性创建该 resolver，并注入 AdminHostNavigationPortProvider；
 * Plugin 不手写 URL，也不自行解析 Route Target。校验失败保持失败语义（抛错）。
 */
export const adminHostRouteTargetResolver = {
  resolveHref: (
    target: Readonly<{ routeId: string; params: Readonly<Record<string, string>> }>,
  ): string => {
    const result = resolveAdminRouteTarget(generatedSurfaceRegistry, target);
    if (result.diagnostics.length > 0) {
      const detail = result.diagnostics
        .map((diagnostic) => `[${diagnostic.code}] ${diagnostic.message}`)
        .join('; ');
      throw new Error(`Route Target 解析失败: ${detail}`);
    }
    return result.href;
  },
} as const;
