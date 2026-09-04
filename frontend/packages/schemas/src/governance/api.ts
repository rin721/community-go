/**
 * @community-go/schemas —— Governance API（Schema Layer 暴露的统一治理操作）。
 *
 * 基于 Resolved Governance Model 提供可消费的 Governance API：inspect / read /
 * validate / diagnose / preview / diff / devOverride（未来 projectAuthor /
 * submitChange / commitAuthority 出现后扩展，本轮保留词汇不落地）。
 *
 * Schema Layer 只负责统一契约与 API 暴露；每个操作先做 capability × mutability
 * 门禁（Authority 声明的支持子集是唯一权限来源，中央层不得自行扩大权限）。
 * 具体治理逻辑（值校验等）仍属于 Authority：validate/diagnose 在此为结构/语义级
 * 诊断（compose 已完成的 identity/namespace/能力/evidence 一致性），不复制
 * Authority 的私有校验器。
 */

import type { ResolvedGovernanceModel, ResolvedGovernanceNode } from './compose';
import type { GovernanceCapability, GovernanceMutability } from './vocabulary';
import { isGovernanceOperationAllowed } from './consistency';
import type { GovernanceDiagnostic, GovernanceDiagnostics } from './diagnostics';
import { collectGovernanceDiagnostic, finalizeGovernanceDiagnostics } from './diagnostics';
import type { GovernanceDraft, GovernanceDiff } from './draft';
import { createGovernanceChange } from './draft';

/** Governance 环境：devOverride 是否可用（由 Host/Channel 注入，本层不做环境判断）。 */
export type GovernanceEnvironment = Readonly<{
  devOverrideAvailable: boolean;
}>;

/** Node 查询目标（authorityId.domainId.nodeId 全限定）。 */
export type GovernanceNodeTarget = Readonly<{
  authorityId: string;
  domainId: string;
  nodeId: string;
}>;

/** Node 信息视图（只读治理信息，不含 Authority 私有事实）。 */
export type GovernanceNodeView = Readonly<{
  authorityId: string;
  authorityReference: string;
  domainId: string;
  nodeId: string;
  title: string;
  description?: string;
  kind: ResolvedGovernanceNode['kind'];
  valueType?: string;
  source?: string;
  constraints: ResolvedGovernanceNode['constraints'];
  mutability: GovernanceMutability;
  scope: ResolvedGovernanceNode['scope'];
  capabilities: readonly GovernanceCapability[];
  preview?: ResolvedGovernanceNode['preview'];
  association?: ResolvedGovernanceNode['association'];
  consumer?: string;
  evidence: readonly string[];
}>;

/** Preview 结果：目标值视图 + 差异（供 Plugin 展示，不落盘）。 */
export type GovernancePreviewResult = Readonly<{
  target: GovernanceNodeTarget;
  /** 治理草案目标值（若调用方提供 draft）。 */
  proposedValue?: unknown;
  /** draft 相对当前值生成的 diff（当前值由调用方提供）。 */
  diffs: readonly GovernanceDiff[];
  note: string;
}>;

/** 单操作结果：数据 + 诊断（成功路径 hasErrors=false；权限/未知目标不抛错、返回诊断）。 */
export type GovernanceOperationResult<T> = Readonly<{
  value?: T;
  diagnostics: GovernanceDiagnostics;
}>;

/** 在 model 中查找 Node（找不到返回 undefined）。 */
export function findGovernanceNode(
  model: ResolvedGovernanceModel,
  target: GovernanceNodeTarget,
): ResolvedGovernanceNode | undefined {
  const authority = model.authorities.find((item) => item.authorityId === target.authorityId);
  const domain = authority?.domains.find((item) => item.domainId === target.domainId);
  return domain?.nodes.find((item) => item.nodeId === target.nodeId);
}

function toNodeView(
  model: ResolvedGovernanceModel,
  node: ResolvedGovernanceNode,
): GovernanceNodeView {
  const authorityReference =
    model.authorities.find((item) => item.authorityId === node.authorityId)?.authorityReference ??
    '';
  return {
    authorityId: node.authorityId,
    authorityReference,
    domainId: node.domainId,
    nodeId: node.nodeId,
    title: node.title,
    kind: node.kind,
    constraints: node.constraints,
    mutability: node.mutability,
    scope: node.scope,
    capabilities: node.capabilities,
    evidence: node.evidence,
    ...(node.description ? { description: node.description } : {}),
    ...(node.valueType ? { valueType: node.valueType } : {}),
    ...(node.source ? { source: node.source } : {}),
    ...(node.preview ? { preview: node.preview } : {}),
    ...(node.association ? { association: node.association } : {}),
    ...(node.consumer ? { consumer: node.consumer } : {}),
  };
}

/**
 * 构造统一 Governance API（纯函数对象，无副作用；devOverride 可用性由 env 决定）。
 *
 * 权限模型：每个操作检查目标 Node 是否声明对应 capability；未声明返回
 * GOV_UNSUPPORTED_OPERATION warning 诊断（不抛错、不静默执行）；未知 Node 返回
 * GOV_UNKNOWN_NODE。调用方（Channel/Plugin）不得绕过本 API 直接扩大权限。
 */
export function createGovernanceApi(model: ResolvedGovernanceModel, env: GovernanceEnvironment) {
  /** 门禁：Node 存在 + mutability 允许 + capabilities 声明；失败返回 undefined 并收集诊断。 */
  function requireNodeCapability(
    target: GovernanceNodeTarget,
    capability: GovernanceCapability,
    diagnostics: GovernanceDiagnostic[],
  ): ResolvedGovernanceNode | undefined {
    const node = findGovernanceNode(model, target);
    if (!node) {
      collectGovernanceDiagnostic(diagnostics, {
        code: 'GOV_UNKNOWN_NODE',
        severity: 'warning',
        authorityId: target.authorityId,
        domainId: target.domainId,
        nodeId: target.nodeId,
        message: `未知治理节点: ${target.authorityId}.${target.domainId}.${target.nodeId}`,
      });
      return undefined;
    }
    if (!isGovernanceOperationAllowed(node.mutability, capability)) {
      collectGovernanceDiagnostic(diagnostics, {
        code: 'GOV_UNSUPPORTED_OPERATION',
        severity: 'warning',
        authorityId: target.authorityId,
        domainId: target.domainId,
        nodeId: target.nodeId,
        message: `Node ${node.nodeId} 在 mutability=${node.mutability} 下不支持 ${capability}`,
      });
      return undefined;
    }
    if (!node.capabilities.includes(capability)) {
      collectGovernanceDiagnostic(diagnostics, {
        code: 'GOV_UNSUPPORTED_OPERATION',
        severity: 'warning',
        authorityId: target.authorityId,
        domainId: target.domainId,
        nodeId: target.nodeId,
        message: `Node ${node.nodeId} 未声明 capability ${capability}（capabilities: ${node.capabilities.join(', ')}）`,
      });
      return undefined;
    }
    return node;
  }

  function ok<T>(value: T): GovernanceOperationResult<T> {
    return { value, diagnostics: finalizeGovernanceDiagnostics([], []) };
  }

  function denied(diagnostics: GovernanceDiagnostic[]): GovernanceOperationResult<never> {
    return { diagnostics: finalizeGovernanceDiagnostics([], diagnostics) };
  }

  return {
    /** 全模型只读视图（Authority → Domain → Node + 诊断健康度）。 */
    inspect(): Readonly<{ value: ResolvedGovernanceModel; diagnostics: GovernanceDiagnostics }> {
      return { value: model, diagnostics: model.diagnostics };
    },

    /** 读取单个 Node 的治理信息视图。 */
    read(target: GovernanceNodeTarget): GovernanceOperationResult<GovernanceNodeView> {
      const diagnostics: GovernanceDiagnostic[] = [];
      const node = requireNodeCapability(target, 'read', diagnostics);
      if (!node) return denied(diagnostics);
      return ok(toNodeView(model, node));
    },

    /** 结构/语义级校验诊断（compose 已产出的健康度 + 目标 Node 信息；不复制 Authority 值校验器）。 */
    validate(target: GovernanceNodeTarget): GovernanceOperationResult<GovernanceNodeView> {
      const diagnostics: GovernanceDiagnostic[] = [];
      const node = requireNodeCapability(target, 'validate', diagnostics);
      if (!node) return denied(diagnostics);
      return ok(toNodeView(model, node));
    },

    /** 目标 Node 能力/信息诊断视图（diagnose 是只读诊断操作）。 */
    diagnose(target: GovernanceNodeTarget): GovernanceOperationResult<GovernanceNodeView> {
      const diagnostics: GovernanceDiagnostic[] = [];
      const node = requireNodeCapability(target, 'diagnose', diagnostics);
      if (!node) return denied(diagnostics);
      return ok(toNodeView(model, node));
    },

    /**
     * Preview：目标 Node 的治理预览。若调用方提供 draft + 当前值，额外计算
     * proposedValue 与 diff（纯计算，不落盘、不写回）。
     */
    preview(
      target: GovernanceNodeTarget,
      draft?: GovernanceDraft,
      currentValue?: unknown,
    ): GovernanceOperationResult<GovernancePreviewResult> {
      const diagnostics: GovernanceDiagnostic[] = [];
      const node = requireNodeCapability(target, 'preview', diagnostics);
      if (!node) return denied(diagnostics);
      const diffs =
        draft && currentValue !== undefined
          ? createGovernanceChange(draft, currentValue).diffs
          : [];
      return ok({
        target,
        ...(draft ? { proposedValue: draft.targetValue } : {}),
        diffs,
        note:
          node.preview?.note ??
          `Node ${node.nodeId} 治理预览（mode=${node.preview?.mode ?? 'none'}）`,
      });
    },

    /**
     * Diff：由 draft 相对当前值生成结构化差异（纯计算，无副作用）。
     * diff 需要 Node 声明 diff；draft/当前值由调用方提供（Authority 事实由调用方持有）。
     */
    diff(
      target: GovernanceNodeTarget,
      draft: GovernanceDraft,
      currentValue: unknown,
    ): GovernanceOperationResult<readonly GovernanceDiff[]> {
      const diagnostics: GovernanceDiagnostic[] = [];
      const node = requireNodeCapability(target, 'diff', diagnostics);
      if (!node) return denied(diagnostics);
      return ok(createGovernanceChange(draft, currentValue).diffs);
    },

    /**
     * Dev Override：仅当 env.devOverrideAvailable 时允许（Host 注入 dev-only 环境）；
     * 目标 Node 必须声明 dev-override。本层只做门禁与确认，不做持久化
     * （由调用方/Host 决定存储位置，通常为 dev-only 会话存储）。
     */
    devOverride(
      target: GovernanceNodeTarget,
      value: unknown,
    ): GovernanceOperationResult<GovernanceNodeView> {
      const diagnostics: GovernanceDiagnostic[] = [];
      if (!env.devOverrideAvailable) {
        collectGovernanceDiagnostic(diagnostics, {
          code: 'GOV_DEV_OVERRIDE_UNAVAILABLE',
          severity: 'warning',
          authorityId: target.authorityId,
          domainId: target.domainId,
          nodeId: target.nodeId,
          message: 'devOverride 只允许开发治理环境（production 不可用）',
        });
        return denied(diagnostics);
      }
      const node = requireNodeCapability(target, 'dev-override', diagnostics);
      if (!node) return denied(diagnostics);
      // value 是调用方提议的覆盖值；本层只确认能力与门禁，值的合法性由
      // Authority 未来 Authoring 工具校验（本轮不复制值校验器）。
      void value;
      return ok(toNodeView(model, node));
    },
  };
}

export type GovernanceApi = ReturnType<typeof createGovernanceApi>;

/** 便捷：列出全部 Node（用于 UI 遍历）。 */
export function listGovernanceNodes(
  model: ResolvedGovernanceModel,
): readonly ResolvedGovernanceNode[] {
  return model.authorities.flatMap((authority) =>
    authority.domains.flatMap((domain) => domain.nodes),
  );
}
