/**
 * @community-go/schemas —— Governance（Schema Contract Foundation 治理子路径）。
 *
 * 提供跨 Authority 统一的治理契约：
 * - Authority / Domain / Node 治理模型与 Governance Contribution Contract；
 * - Mutability / Scope 描述模型与 Governance Capability 词汇；
 * - 标准化 Governance Diagnostics；
 * - Draft / Diff / Change 跨 Authority 交换数据 Contract；
 * - 确定性 Governance Composition 纯规则（→ Resolved Governance Model）。
 *
 * 本子路径**不拥有任何具体治理事实**：Design Token、Pattern、Rule、Policy、
 * Validation、Diagnostic 等事实由真正 Authority 自己拥有并在各自 Governance
 * Contribution 中描述；Composition 只组合、不重新解释。
 */

export {
  governanceMutabilityVocabulary,
  governanceScopeVocabulary,
  governanceCapabilityVocabulary,
  GOVERNANCE_WRITE_CAPABILITIES,
  GOVERNANCE_FIXED_MUTABILITIES,
  type GovernanceMutability,
  type GovernanceScope,
  type GovernanceCapability,
} from './vocabulary';

export {
  governanceContributionSchema,
  governanceDomainIdPattern,
  governanceNodeSegmentPattern,
  type GovernanceContribution,
  type GovernanceContributionInput,
  type GovernanceDomain,
  type GovernanceNode,
  type GovernanceConstraint,
} from './contract';

export {
  collectGovernanceDiagnostic,
  finalizeGovernanceDiagnostics,
  formatGovernanceDiagnostics,
  EMPTY_GOVERNANCE_DIAGNOSTICS,
  type GovernanceDiagnostic,
  type GovernanceDiagnosticCode,
  type GovernanceDiagnosticSeverity,
  type GovernanceDiagnostics,
} from './diagnostics';

export {
  isKnownGovernanceCapability,
  isGovernanceOperationAllowed,
  normalizeGovernanceCapabilities,
  collectMutabilityCapabilityDiagnostics,
} from './consistency';

export {
  composeGovernance,
  flattenResolvedGovernanceNodes,
  type ResolvedGovernanceModel,
  type ResolvedGovernanceAuthority,
  type ResolvedGovernanceDomain,
  type ResolvedGovernanceNode,
} from './compose';

export {
  createGovernanceChange,
  describeGovernanceDiff,
  applyGovernanceChange,
  type GovernanceDraft,
  type GovernanceDraftSource,
  type GovernanceDiff,
  type GovernanceChange,
} from './draft';

export {
  createGovernanceApi,
  findGovernanceNode,
  listGovernanceNodes,
  type GovernanceApi,
  type GovernanceEnvironment,
  type GovernanceNodeTarget,
  type GovernanceNodeView,
  type GovernanceOperationResult,
  type GovernancePreviewResult,
} from './api';
