'use client';

import type { ReactNode } from 'react';

import { HostGovernanceChannelProvider } from '../../host/governance-channel';

/**
 * Governance 路由组 layout —— Development Governance Channel 的装配边界。
 *
 * Channel 只服务 Governance Control Plane（/governance/* 治理 Plugin 页面）；
 * 因此 Governance Channel Provider 在这里装配，而不是在全局 Root Provider——
 * 避免 Governance Model 数据与 zod 校验进入所有页面的生产 initial bundle
 * （性能预算约束，见 tooling/check-performance-budget.mjs）。
 *
 * 其它页面不装配 Governance Channel：useDevelopmentGovernance 在未安装时 throw
 * （保持失败语义——非治理页面本就不应消费治理通道）。
 */
export default function GovernanceLayout({ children }: Readonly<{ children: ReactNode }>) {
  return <HostGovernanceChannelProvider>{children}</HostGovernanceChannelProvider>;
}
