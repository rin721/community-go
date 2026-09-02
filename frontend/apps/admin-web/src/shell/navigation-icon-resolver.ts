'use client';

import type { AdminNavigationIconId } from '@community-go/admin-surface/shell';
import { adminNavigationIconVocabulary } from '@community-go/admin-surface/shell';
import {
  Boxes,
  Circle,
  Component,
  Contact,
  Layers3,
  LayoutDashboard,
  ListChecks,
  LoaderCircle,
  MessageSquareWarning,
  MousePointerClick,
  PanelsTopLeft,
  Settings2,
  Table2,
  TableProperties,
  Waypoints,
  Workflow,
  type LucideIcon,
} from 'lucide-react';

/**
 * Shell Navigation Icon Resolver —— 语义 iconId → 实际 Icon Component。
 *
 * iconId 是 Plugin Navigation Contribution 的可选 semantic presentation metadata；
 * 本 resolver 是 Shell 自己的 presentation policy 实现：把 Admin Surface 治理的
 * 语义 vocabulary 映射到当前实际图标库（Lucide）。key 用 vocabulary union
 * 编译期强制完整：未来扩展 vocabulary 而不同步本表会直接 typecheck 失败。
 *
 * - iconId === undefined → 统一 fallback（Circle）。
 * - 命中 vocabulary → 对应图标组件。
 * - 其它字符串（理论上被 codegen gate / composition assert 前置拦截）→
 *   deterministic throw UNKNOWN_ADMIN_NAVIGATION_ICON，禁止静默 fallback 掩盖配置错误。
 */

const iconByIconId: Readonly<Record<AdminNavigationIconId, LucideIcon>> = {
  dashboard: LayoutDashboard,
  foundations: Boxes,
  catalog: Component,
  action: MousePointerClick,
  feedback: MessageSquareWarning,
  async: LoaderCircle,
  identity: Contact,
  navigation: Waypoints,
  data: Table2,
  surfaces: PanelsTopLeft,
  list: ListChecks,
  overlay: Layers3,
  states: Workflow,
  settings: Settings2,
  resource: TableProperties,
};

export const UNKNOWN_ADMIN_NAVIGATION_ICON = 'UNKNOWN_ADMIN_NAVIGATION_ICON';

/** 语义 iconId → 图标组件；未声明（undefined）→ 统一 fallback。 */
export function resolveNavigationIcon(iconId: string | undefined): LucideIcon {
  if (iconId === undefined) return Circle;
  const vocabulary = new Set<string>(adminNavigationIconVocabulary);
  if (!vocabulary.has(iconId)) {
    // 防御性 deterministic：正常路径由 codegen gate / composition assert 前置拦截。
    throw new Error(
      `navigation.iconId 未命中 Admin Surface icon vocabulary: ${iconId}（${UNKNOWN_ADMIN_NAVIGATION_ICON}）`,
    );
  }
  return iconByIconId[iconId as AdminNavigationIconId] ?? Circle;
}
