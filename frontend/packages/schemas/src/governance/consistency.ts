/**
 * @community-go/schemas —— Governance mutability × capability 一致性纯规则。
 *
 * 不同治理节点只暴露自己真正支持的治理操作；本模块提供纯校验规则，
 * 供 Governance Composition、Channel 能力门禁与单测共用（单一实现，
 * 不允许在调用方复制漂移）。
 */

import {
  GOVERNANCE_FIXED_MUTABILITIES,
  GOVERNANCE_WRITE_CAPABILITIES,
  governanceCapabilityVocabulary,
  type GovernanceCapability,
  type GovernanceMutability,
} from './vocabulary';
import type { GovernanceDiagnostic } from './diagnostics';
import { collectGovernanceDiagnostic } from './diagnostics';

const WRITE_CAPABILITY_SET = new Set<GovernanceCapability>(GOVERNANCE_WRITE_CAPABILITIES);

const CAPABILITY_VOCABULARY_SET = new Set<GovernanceCapability>(governanceCapabilityVocabulary);

/** 各固定只读 Mutability 上允许的 capability 白名单。 */
const FIXED_MUTABILITY_ALLOWED: Readonly<
  Record<GovernanceMutability, readonly GovernanceCapability[]>
> = {
  readonly: ['inspect', 'read', 'validate', 'diagnose', 'preview', 'diff'],
  fixed: ['inspect', 'read', 'validate', 'diagnose'],
  'diagnostic-only': ['inspect', 'read', 'validate', 'diagnose', 'diff'],
  'project-configurable': [
    'inspect',
    'read',
    'validate',
    'diagnose',
    'preview',
    'draft',
    'diff',
    'dev-override',
  ],
  'user-customizable': [
    'inspect',
    'read',
    'validate',
    'diagnose',
    'preview',
    'draft',
    'diff',
    'dev-override',
    'user-override',
  ],
  'runtime-policy': ['inspect', 'read', 'validate', 'diagnose', 'preview', 'diff', 'dev-override'],
};

/** 校验 capability 是否属于词汇表。 */
export function isKnownGovernanceCapability(capability: string): boolean {
  return CAPABILITY_VOCABULARY_SET.has(capability as GovernanceCapability);
}

/**
 * 校验 Node 的 mutability × capabilities 一致性，收集诊断到 target。
 *
 * 规则：
 * - 未知 capability（不属于词汇表）→ GOV_UNKNOWN_CAPABILITY；
 * - 固定只读 Mutability（readonly/fixed/diagnostic-only）禁止写类操作
 *   （dev-override/project-author/user-override）→ GOV_MUTABILITY_CAPABILITY_CONFLICT；
 * - 每个 Mutability 有对应的 capability 白名单，越界声明 → 冲突诊断；
 * - user-override 需要 user-customizable；
 * - dev-override 需要 project-configurable/user-customizable/runtime-policy
 *   （固定只读集合已天然排除，白名单另行约束）。
 */
export function collectMutabilityCapabilityDiagnostics(
  target: GovernanceDiagnostic[],
  input: Readonly<{
    authorityId: string;
    domainId: string;
    nodeId: string;
    mutability: GovernanceMutability;
    capabilities: readonly GovernanceCapability[];
  }>,
): void {
  const { authorityId, domainId, nodeId, mutability, capabilities } = input;

  for (const capability of capabilities) {
    if (!isKnownGovernanceCapability(capability)) {
      collectGovernanceDiagnostic(target, {
        code: 'GOV_UNKNOWN_CAPABILITY',
        severity: 'error',
        authorityId,
        domainId,
        nodeId,
        message: `未知 Governance Capability: ${capability}`,
      });
    }
  }

  const isFixedReadonly = GOVERNANCE_FIXED_MUTABILITIES.includes(mutability);
  const writeCapabilities = capabilities.filter((capability) =>
    WRITE_CAPABILITY_SET.has(capability),
  );
  if (isFixedReadonly && writeCapabilities.length > 0) {
    collectGovernanceDiagnostic(target, {
      code: 'GOV_MUTABILITY_CAPABILITY_CONFLICT',
      severity: 'error',
      authorityId,
      domainId,
      nodeId,
      message: `Mutability=${mutability} 禁止写类操作，但声明了 ${writeCapabilities.join(', ')}`,
    });
  }

  const allowed = FIXED_MUTABILITY_ALLOWED[mutability];
  const notAllowed = capabilities.filter((capability) => !allowed.includes(capability));
  if (notAllowed.length > 0) {
    collectGovernanceDiagnostic(target, {
      code: 'GOV_MUTABILITY_CAPABILITY_CONFLICT',
      severity: 'error',
      authorityId,
      domainId,
      nodeId,
      message: `Mutability=${mutability} 不允许 capability ${notAllowed.join(', ')}（允许: ${allowed.join(', ')}）`,
    });
  }

  if (capabilities.includes('user-override') && mutability !== 'user-customizable') {
    collectGovernanceDiagnostic(target, {
      code: 'GOV_MUTABILITY_CAPABILITY_CONFLICT',
      severity: 'error',
      authorityId,
      domainId,
      nodeId,
      message: `user-override 需要 Mutability=user-customizable，但实际为 ${mutability}`,
    });
  }
}

/** 某 Mutability 是否允许某 capability（Channel 能力门禁与 UI 过滤共用）。 */
export function isGovernanceOperationAllowed(
  mutability: GovernanceMutability,
  capability: GovernanceCapability,
): boolean {
  return FIXED_MUTABILITY_ALLOWED[mutability]?.includes(capability) ?? false;
}

/** 标准化 capabilities：去重、保持词汇表声明顺序。 */
export function normalizeGovernanceCapabilities(
  capabilities: readonly GovernanceCapability[],
): readonly GovernanceCapability[] {
  const seen = new Set<GovernanceCapability>();
  const result: GovernanceCapability[] = [];
  for (const capability of governanceCapabilityVocabulary) {
    if (capabilities.includes(capability) && !seen.has(capability)) {
      seen.add(capability);
      result.push(capability);
    }
  }
  return result;
}
