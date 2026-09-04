import type { PluginDefinition } from '@community-go/plugin-framework/plugin';

/**
 * governance —— Governance Control Plane UI Plugin。
 *
 * 只负责可视化治理（Dashboard/Inspector 等 Control Plane UI），**不拥有任何
 * 治理事实**：Design System / Surface Foundation / UI Adapter / State Foundation /
 * Plugin Framework 及其它真实 Authority 仍独立工作。本 Plugin 只经 Development
 * Governance Channel 消费 Resolved Governance Model；删除本 Plugin 只意味着失去
 * 可视化治理入口。
 */
export const pluginDefinition = {
  pluginId: 'governance',
  mount: '/governance',
} as const satisfies PluginDefinition;
