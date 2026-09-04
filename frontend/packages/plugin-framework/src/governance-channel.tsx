/**
 * Plugin Framework —— Development Governance Channel（Client 侧）。
 *
 * `@community-go/plugin-framework/governance-channel` 是治理类 Plugin 消费
 * Schema Layer 暴露的 Authority Governance API 的专用通道（沿用 Host Port /
 * Capability 架构：Port 契约 → Provider → hooks，实现由 Host Composition Root
 * 一次性注入，未安装即 throw）。
 *
 * Channel 只服务 Frontend Governance Control Plane：
 * - 不是通用 RPC / Event Bus；
 * - 不允许 Plugin A ↔ Plugin B 隐式通信；
 * - 不允许调用 Host 私有能力；
 * - 每个操作的能力门禁由 Schema Layer（schemas Governance API）执行，
 *   Plugin 不能绕过 Port 直接扩大权限。
 *
 * 数据契约（Authority/Domain/Node/Capability/Diagnostics/Preview/Diff）来自
 * `@community-go/schemas/governance`（统一 Contract 单一来源，不在此复制）。
 */

'use client';

/* Library entry 同时导出 Provider、Hook，不是应用 Fast Refresh 边界。 */
/* eslint-disable react-refresh/only-export-components */

import { createContext, useContext, type ReactNode } from 'react';

import type {
  GovernanceDiagnostics,
  GovernanceDiff,
  GovernanceDraft,
  GovernanceNodeTarget,
  GovernanceNodeView,
  GovernanceOperationResult,
  GovernancePreviewResult,
  ResolvedGovernanceModel,
} from '@community-go/schemas/governance';

/** Channel Port：Schema Layer Governance API 的薄封装（只通信与编排）。 */
export type DevelopmentGovernancePort = Readonly<{
  inspect(): Readonly<{ value: ResolvedGovernanceModel; diagnostics: GovernanceDiagnostics }>;
  read(target: GovernanceNodeTarget): GovernanceOperationResult<GovernanceNodeView>;
  validate(target: GovernanceNodeTarget): GovernanceOperationResult<GovernanceNodeView>;
  diagnose(target: GovernanceNodeTarget): GovernanceOperationResult<GovernanceNodeView>;
  preview(
    target: GovernanceNodeTarget,
    draft?: GovernanceDraft,
    currentValue?: unknown,
  ): GovernanceOperationResult<GovernancePreviewResult>;
  diff(
    target: GovernanceNodeTarget,
    draft: GovernanceDraft,
    currentValue: unknown,
  ): GovernanceOperationResult<readonly GovernanceDiff[]>;
  devOverride(
    target: GovernanceNodeTarget,
    value: unknown,
  ): GovernanceOperationResult<GovernanceNodeView>;
}>;

export const GovernanceChannelContext = createContext<DevelopmentGovernancePort | null>(null);

/** Host 装配 Development Governance Channel；必须在 Root Provider 中只安装一次。 */
export function GovernanceChannelProvider({
  port,
  children,
}: Readonly<{ port: DevelopmentGovernancePort; children: ReactNode }>) {
  return (
    <GovernanceChannelContext.Provider value={port}>{children}</GovernanceChannelContext.Provider>
  );
}

/** 读取 Development Governance Channel（未安装即 throw，保持失败语义）。 */
export function useDevelopmentGovernance(): DevelopmentGovernancePort {
  const port = useContext(GovernanceChannelContext);
  if (!port) {
    throw new Error(
      'GovernanceChannelProvider 未安装：Development Governance Channel 属于 application runtime context，由 Host Composition Root 注入。',
    );
  }
  return port;
}
