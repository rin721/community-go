/**
 * Admin Framework —— Host Port / Capability Contract。
 *
 * Host Port 属于 application runtime context，由 Composition Root 一次性安装；
 * Generated Route Entry 不安装 Host Port、不创建 Registry。
 * Host Capability Analysis 在 Host entry generation 之前执行，
 * Static Export Host 对动态 Route 必须失败（UNSUPPORTED_DYNAMIC_PLUGIN_ROUTE），不降级为 warning。
 */

import type { AdminFileRouteDescriptor } from './contract';
import type { AdminDiagnostic } from './diagnostics';
import { collectDiagnostics } from './diagnostics';
import { hasDynamicSegments } from './registry';
import type { AdminRouteTarget } from './target-types';

/** 当前 Static Export Host 不支持动态 Plugin Route。 */
export const UNSUPPORTED_DYNAMIC_PLUGIN_ROUTE = 'UNSUPPORTED_DYNAMIC_PLUGIN_ROUTE';

/** Host 能力分析结果：静态模型，不生成 Host entry。 */
export type AdminHostCapabilityResult = Readonly<{
  /** 无法承载的 Route 列表。 */
  unsupported: readonly AdminFileRouteDescriptor[];
  diagnostics: readonly AdminDiagnostic[];
  /** 是否全部承载（无 unsupported）。 */
  canDeploy: boolean;
}>;

/** 分析给定 Route 集合在当前 Host 下的承载能力。 */
export function analyzeHostCapability(
  routes: readonly AdminFileRouteDescriptor[],
): AdminHostCapabilityResult {
  const unsupported: AdminFileRouteDescriptor[] = [];
  const errors: AdminDiagnostic[] = [];
  for (const descriptor of routes) {
    if (hasDynamicSegments(descriptor.pattern)) {
      unsupported.push(descriptor);
      collectDiagnostics(errors, {
        code: UNSUPPORTED_DYNAMIC_PLUGIN_ROUTE,
        routeId: descriptor.routeId,
        message: `Static Export Host 不支持动态 Plugin Route: ${descriptor.routeId} (${descriptor.pattern})`,
      });
    }
  }
  return {
    unsupported,
    diagnostics: errors,
    canDeploy: unsupported.length === 0,
  };
}

/**
 * Host Navigation Port 契约。
 *
 * Host（admin-web）在 Root Provider 中一次性安装该 Port；Framework 不读取 pathname、
 * 不创建导航栈、不实现 Router。Plugin 禁止直接使用 Next Link/Router、Browser history
 * 或全局 location 完成应用内导航。
 */
export type AdminHostNavigationPort = Readonly<{
  /** 使用真实 Router 导航到 href。 */
  navigate: (href: string) => void;
  /** 使用真实 Router 替换当前历史项。 */
  replace: (href: string) => void;
}>;

/** Route Target resolver：Host 注入，用于校验与构造 href。 */
export type AdminRouteTargetResolver = Readonly<{
  resolve: (target: AdminRouteTarget) => { href: string; diagnostics: AdminDiagnostic[] };
}>;
