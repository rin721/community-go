/**
 * @community-go/schemas —— Governance Diagnostics（标准化诊断结构）。
 *
 * 统一 Governance 诊断/Validation Issue 标准结构。每个诊断保留可追溯的
 * authorityId / domainId / nodeId（能反向追溯到真正拥有该能力的 Authority），
 * 供 Channel、Composition 与未来治理工具交换。
 *
 * 本模块只定义结构与纯函数，不产生任何具体治理事实。
 */

/** Governance 诊断 code（固定词汇；具体 message 由产生方构造）。 */
export type GovernanceDiagnosticCode =
  | 'GOV_INVALID_CONTRIBUTION'
  | 'GOV_DUPLICATE_AUTHORITY'
  | 'GOV_DUPLICATE_DOMAIN'
  | 'GOV_DUPLICATE_NODE'
  | 'GOV_NODE_NAMESPACE_VIOLATION'
  | 'GOV_DOMAIN_NAMESPACE_VIOLATION'
  | 'GOV_UNKNOWN_CAPABILITY'
  | 'GOV_MUTABILITY_CAPABILITY_CONFLICT'
  | 'GOV_UNKNOWN_NODE'
  | 'GOV_UNSUPPORTED_OPERATION'
  | 'GOV_DEV_OVERRIDE_UNAVAILABLE'
  | 'GOV_CHANNEL_NOT_INSTALLED';

export type GovernanceDiagnosticSeverity = 'error' | 'warning';

/** 标准化 Governance 诊断。 */
export type GovernanceDiagnostic = Readonly<{
  code: GovernanceDiagnosticCode;
  severity: GovernanceDiagnosticSeverity;
  authorityId?: string;
  domainId?: string;
  nodeId?: string;
  /** 值路径（如 `domains.0.nodes.2.capabilities`）。 */
  path?: readonly PropertyKey[];
  message: string;
}>;

/** Governance 诊断集合：error 阻断、warning 提示。 */
export type GovernanceDiagnostics = Readonly<{
  errors: readonly GovernanceDiagnostic[];
  warnings: readonly GovernanceDiagnostic[];
  hasErrors: boolean;
}>;

/** 累积一条诊断（按 code 分组顺序保留）。 */
export function collectGovernanceDiagnostic(
  target: GovernanceDiagnostic[],
  diagnostic: GovernanceDiagnostic,
): void {
  target.push(diagnostic);
}

/** 将诊断列表收敛为只读结果。 */
export function finalizeGovernanceDiagnostics(
  errors: readonly GovernanceDiagnostic[],
  warnings: readonly GovernanceDiagnostic[] = [],
): GovernanceDiagnostics {
  return { errors, warnings, hasErrors: errors.length > 0 };
}

/** 格式化诊断为多行文本，便于 CLI/测试/UI 展示。 */
export function formatGovernanceDiagnostics(diagnostics: GovernanceDiagnostics): string {
  const lines = [
    ...diagnostics.errors.map(formatGovernanceDiagnostic),
    ...diagnostics.warnings.map((item) => `[warning] ${formatGovernanceDiagnostic(item)}`),
  ];
  return lines.join('\n');
}

function formatGovernanceDiagnostic(diagnostic: GovernanceDiagnostic): string {
  const location = [diagnostic.authorityId, diagnostic.domainId, diagnostic.nodeId]
    .filter(Boolean)
    .join('.');
  return `[${diagnostic.code}]${location ? ` ${location}` : ''}${diagnostic.path ? ` @ ${diagnostic.path.join('.')}` : ''}: ${diagnostic.message}`;
}

/** 空诊断集合（healthy 快捷值）。 */
export const EMPTY_GOVERNANCE_DIAGNOSTICS: GovernanceDiagnostics = {
  errors: [],
  warnings: [],
  hasErrors: false,
};
