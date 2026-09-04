/**
 * @community-go/schemas —— Governance Composition（确定性汇聚纯规则）。
 *
 * Governance Composition 只负责：
 * - 加载正式 Authority 暴露的 Governance Contribution；
 * - Schema 校验（governanceContributionSchema）；
 * - Authority identity 校验（authorityId 唯一、reference 非空）；
 * - Domain / Node namespace 校验（domainId/nodeId 唯一、nodeId 带 `${domainId}.` 前缀）；
 * - Contribution 冲突检测；
 * - Capability 标准化（去重、按词汇表排序、越界/未知即诊断）；
 * - 形成 Resolved Governance Model。
 *
 * 它**不重新实现具体治理规则**，也不反向解释 Authority；具体事实由
 * Authority 自己拥有。失败语义：收集全部诊断，hasErrors 即 throw
 * （带 formatGovernanceDiagnostics 文本），绝不静默 drop。
 */

import type { GovernanceContribution, GovernanceNode } from './contract';
import { governanceContributionSchema } from './contract';
import type { GovernanceDiagnostic, GovernanceDiagnostics } from './diagnostics';
import {
  collectGovernanceDiagnostic,
  finalizeGovernanceDiagnostics,
  formatGovernanceDiagnostics,
} from './diagnostics';
import {
  collectMutabilityCapabilityDiagnostics,
  normalizeGovernanceCapabilities,
} from './consistency';
import { governanceDomainIdPattern, governanceNodeSegmentPattern } from './contract';

/** Resolved Node：标准化后的治理节点（capabilities 已去重排序；保留追溯）。 */
export type ResolvedGovernanceNode = Readonly<{
  authorityId: string;
  domainId: string;
  nodeId: string;
  title: string;
  description?: string;
  kind: GovernanceNode['kind'];
  valueType?: string;
  source?: string;
  constraints: GovernanceNode['constraints'];
  mutability: GovernanceNode['mutability'];
  scope: GovernanceNode['scope'];
  capabilities: readonly ReturnType<typeof normalizeGovernanceCapabilities>[number][];
  preview?: GovernanceNode['preview'];
  association?: GovernanceNode['association'];
  consumer?: string;
  evidence: GovernanceNode['evidence'];
}>;

/** Resolved Domain。 */
export type ResolvedGovernanceDomain = Readonly<{
  authorityId: string;
  domainId: string;
  title: string;
  description?: string;
  nodes: readonly ResolvedGovernanceNode[];
}>;

/** Resolved Authority。 */
export type ResolvedGovernanceAuthority = Readonly<{
  authorityId: string;
  authorityReference: string;
  title?: string;
  description?: string;
  domains: readonly ResolvedGovernanceDomain[];
}>;

/** Resolved Governance Model：当前 Frontend Architecture 的机器可读治理投影（不是新 Authority）。 */
export type ResolvedGovernanceModel = Readonly<{
  authorities: readonly ResolvedGovernanceAuthority[];
  diagnostics: GovernanceDiagnostics;
}>;

/**
 * 确定性汇聚 Governance Contributions → Resolved Governance Model。
 *
 * 输入为纯数据（Authority-owned contribution 模块导出值）；本函数不 import
 * 任何 Authority package（防反向依赖），装配位置（Host composition root）负责
 * 收集真实 contribution。
 *
 * 失败语义：任何 error 级诊断 → throw（含格式化文本）；不会返回部分模型。
 */
export function composeGovernance(
  contributions: readonly GovernanceContribution[],
): ResolvedGovernanceModel {
  const errors: GovernanceDiagnostic[] = [];
  const warnings: GovernanceDiagnostic[] = [];

  const seenAuthorities = new Map<string, string>();
  const seenDomains = new Map<string, string>(); // domainId -> authorityId
  const seenNodes = new Map<string, string>(); // nodeId -> authorityId

  for (const [index, contribution] of contributions.entries()) {
    const basePath = ['contributions', index];

    const parsed = governanceContributionSchema.safeParse(contribution);
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        collectGovernanceDiagnostic(errors, {
          code: 'GOV_INVALID_CONTRIBUTION',
          severity: 'error',
          path: [...basePath, ...issue.path],
          message: `Governance Contribution 不符合统一契约: ${issue.path.join('.') || '(root)'}: ${issue.message}`,
        });
      }
      continue;
    }
    const item = parsed.data;

    const authorityId = item.authorityId;
    if (seenAuthorities.has(authorityId)) {
      collectGovernanceDiagnostic(errors, {
        code: 'GOV_DUPLICATE_AUTHORITY',
        severity: 'error',
        authorityId,
        path: basePath,
        message: `重复的 Authority identity: ${authorityId}（先前声明于 ${seenAuthorities.get(authorityId)}）`,
      });
      continue;
    }
    seenAuthorities.set(authorityId, item.authorityReference);

    for (const domain of item.domains) {
      const domainPath = [...basePath, 'domains'];
      if (!governanceDomainIdPattern.test(domain.domainId)) {
        collectGovernanceDiagnostic(errors, {
          code: 'GOV_DOMAIN_NAMESPACE_VIOLATION',
          severity: 'error',
          authorityId,
          domainId: domain.domainId,
          path: [...domainPath, 'domainId'],
          message: `domainId 必须为小写 kebab-case: ${domain.domainId}`,
        });
      }
      const priorDomain = seenDomains.get(domain.domainId);
      if (priorDomain !== undefined) {
        collectGovernanceDiagnostic(errors, {
          code: 'GOV_DUPLICATE_DOMAIN',
          severity: 'error',
          authorityId,
          domainId: domain.domainId,
          path: domainPath,
          message: `domainId 跨 Authority 冲突: ${domain.domainId}（先前声明于 ${priorDomain}）`,
        });
      } else {
        seenDomains.set(domain.domainId, authorityId);
      }

      for (const node of domain.nodes) {
        const nodePath = [...domainPath, 'nodes'];
        const nodeFullId = node.nodeId;
        const expectedPrefix = `${domain.domainId}.`;
        if (!nodeFullId.startsWith(expectedPrefix)) {
          collectGovernanceDiagnostic(errors, {
            code: 'GOV_NODE_NAMESPACE_VIOLATION',
            severity: 'error',
            authorityId,
            domainId: domain.domainId,
            nodeId: nodeFullId,
            path: [...nodePath, 'nodeId'],
            message: `nodeId 必须带 ${expectedPrefix} 前缀: ${nodeFullId}`,
          });
        } else {
          const segment = nodeFullId.slice(expectedPrefix.length);
          if (!governanceNodeSegmentPattern.test(segment)) {
            collectGovernanceDiagnostic(errors, {
              code: 'GOV_NODE_NAMESPACE_VIOLATION',
              severity: 'error',
              authorityId,
              domainId: domain.domainId,
              nodeId: nodeFullId,
              path: [...nodePath, 'nodeId'],
              message: `nodeId 段必须为小写 kebab-case: ${nodeFullId}`,
            });
          }
        }
        const priorNode = seenNodes.get(nodeFullId);
        if (priorNode !== undefined) {
          collectGovernanceDiagnostic(errors, {
            code: 'GOV_DUPLICATE_NODE',
            severity: 'error',
            authorityId,
            domainId: domain.domainId,
            nodeId: nodeFullId,
            path: [...nodePath, 'nodeId'],
            message: `nodeId 跨 Authority 冲突: ${nodeFullId}（先前声明于 ${priorNode}）`,
          });
        } else {
          seenNodes.set(nodeFullId, authorityId);
        }

        collectMutabilityCapabilityDiagnostics(errors, {
          authorityId,
          domainId: domain.domainId,
          nodeId: nodeFullId,
          mutability: node.mutability,
          capabilities: node.capabilities,
        });
      }
    }
  }

  if (errors.length > 0) {
    const diagnostics = finalizeGovernanceDiagnostics(errors, warnings);
    throw new Error(
      `Governance Composition 失败（Resolved Governance Model 未形成）:\n${formatGovernanceDiagnostics(diagnostics)}`,
    );
  }

  const authorities: ResolvedGovernanceAuthority[] = [];
  for (const contribution of contributions) {
    const parsed = governanceContributionSchema.safeParse(contribution);
    if (!parsed.success) continue; // 已在上面收集 error，不会走到这里
    const item = parsed.data;
    authorities.push({
      authorityId: item.authorityId,
      authorityReference: item.authorityReference,
      ...(item.title ? { title: item.title } : {}),
      ...(item.description ? { description: item.description } : {}),
      domains: item.domains.map((domain) => ({
        authorityId: item.authorityId,
        domainId: domain.domainId,
        title: domain.title,
        ...(domain.description ? { description: domain.description } : {}),
        nodes: domain.nodes.map((node) => {
          const resolvedNode: ResolvedGovernanceNode = {
            authorityId: item.authorityId,
            domainId: domain.domainId,
            nodeId: node.nodeId,
            title: node.title,
            kind: node.kind,
            constraints: node.constraints.map((constraint) => ({
              id: constraint.id,
              kind: constraint.kind,
              description: constraint.description,
              ...(constraint.detail !== undefined ? { detail: constraint.detail } : {}),
            })),
            mutability: node.mutability,
            scope: node.scope,
            capabilities: normalizeGovernanceCapabilities(node.capabilities),
            evidence: node.evidence,
            ...(node.description ? { description: node.description } : {}),
            ...(node.valueType ? { valueType: node.valueType } : {}),
            ...(node.source ? { source: node.source } : {}),
            ...(node.preview
              ? {
                  preview: {
                    mode: node.preview.mode,
                    ...(node.preview.note !== undefined ? { note: node.preview.note } : {}),
                  },
                }
              : {}),
            ...(node.association
              ? {
                  association: {
                    contract: node.association.contract,
                    ...(node.association.note !== undefined ? { note: node.association.note } : {}),
                  },
                }
              : {}),
            ...(node.consumer ? { consumer: node.consumer } : {}),
          };
          return resolvedNode;
        }),
      })),
    });
  }

  return { authorities, diagnostics: finalizeGovernanceDiagnostics(errors, warnings) };
}

/** 全模型节点扁平视图（UI/Channel 便利；保持 authorityId/domainId 追溯）。 */
export function flattenResolvedGovernanceNodes(
  model: ResolvedGovernanceModel,
): readonly ResolvedGovernanceNode[] {
  return model.authorities.flatMap((authority) =>
    authority.domains.flatMap((domain) => domain.nodes),
  );
}
