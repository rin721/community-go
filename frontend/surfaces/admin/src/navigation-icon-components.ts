/**
 * Admin Surface —— Navigation Icon Component Map（唯一 iconId → Lucide 映射）。
 *
 * 纯模块（非 React 组件文件）：供 Shell resolver 与 Icon 呈现组件消费。
 * key 用 vocabulary union 编译期强制完整。
 */

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

import type { AdminNavigationIconId } from './navigation-icon';

/** 唯一 iconId → Icon Component 映射（lucide 单一来源）。 */
export const navigationIconComponents: Readonly<Record<AdminNavigationIconId, LucideIcon>> = {
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

/** 语义 iconId → Icon Component；未命中 → 统一 fallback（Circle）。 */
export function resolveIconComponent(iconId: AdminNavigationIconId): LucideIcon {
  return navigationIconComponents[iconId] ?? Circle;
}
