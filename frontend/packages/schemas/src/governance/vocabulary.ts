/**
 * @community-go/schemas —— Governance vocabulary（纯契约词汇）。
 *
 * 本模块只定义跨 Authority 统一的治理词汇（Mutability / Scope / Governance
 * Capability 枚举与集中常量）。它**不持有任何具体治理事实**：
 * Token、Pattern、Rule、Policy 等事实由真正 Authority 自己拥有并在各自的
 * Governance Contribution 中描述。
 */

/** Mutability / Scope：节点治理性质（不是简单的 `configurable: true/false`）。 */
export const governanceMutabilityVocabulary = [
  /** 机器可读取，但不能编辑。 */
  'readonly',
  /** 冻结不可变（只读且不允许任何 draft/变更语义）。 */
  'fixed',
  /** 开发治理环境允许受控调整项目设计。 */
  'project-configurable',
  /** 允许最终用户形成 Runtime Preference Override。 */
  'user-customizable',
  /** 由 Runtime、Accessibility 或环境策略决定。 */
  'runtime-policy',
  /** 只允许检查和诊断。 */
  'diagnostic-only',
] as const;

export type GovernanceMutability = (typeof governanceMutabilityVocabulary)[number];

/** Governance Scope：该节点治理事实所属架构层级（对齐 foundation-policy 分层）。 */
export const governanceScopeVocabulary = ['universal', 'surface', 'host'] as const;

export type GovernanceScope = (typeof governanceScopeVocabulary)[number];

/**
 * Governance Capability：治理操作（每个 Node 显式声明自己支持的子集，
 * 不假设所有治理节点具备相同的编辑能力）。
 *
 * - inspect/read/validate/diagnose/preview/diff：只读与诊断类；
 * - draft：治理草案（无副作用，不落盘）；
 * - dev-override：开发治理环境（仅 NODE_ENV!=='production'）的受控覆盖；
 * - project-author / user-override：真实 Project Authoring / 用户偏好出现后使用
 *   （本轮不落地，仅保留词汇）。
 */
export const governanceCapabilityVocabulary = [
  'inspect',
  'read',
  'validate',
  'diagnose',
  'preview',
  'draft',
  'diff',
  'dev-override',
  'project-author',
  'user-override',
] as const;

export type GovernanceCapability = (typeof governanceCapabilityVocabulary)[number];

/** 编辑/写类操作集合（mutability 一致性规则使用）。 */
export const GOVERNANCE_WRITE_CAPABILITIES: readonly GovernanceCapability[] = [
  'dev-override',
  'project-author',
  'user-override',
] as const;

/** 固定只读 Mutability 集合（禁止写类操作）。 */
export const GOVERNANCE_FIXED_MUTABILITIES: readonly GovernanceMutability[] = [
  'readonly',
  'fixed',
  'diagnostic-only',
] as const;
