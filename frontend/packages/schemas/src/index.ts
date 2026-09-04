import type { z } from 'zod';

// FoundationSchema 只定义 Universal Form 所需的运行时 Schema 契约；
// 具体字段与业务校验必须留在对应 Feature 或验证场景。
export type FoundationSchema<Output> = z.ZodType<Output, Output>;

export type SchemaIssue = Readonly<{
  path: readonly PropertyKey[];
  code: string;
}>;

export function getSchemaIssues(error: z.ZodError): readonly SchemaIssue[] {
  return error.issues.map((issue) => ({ path: issue.path, code: issue.code }));
}

// Governance 治理词汇同时从根入口暴露（与 ./governance 子路径同源）；
// Governance Contribution 完整契约与 Composition 纯规则经
// `@community-go/schemas/governance` 子路径消费。
export {
  governanceMutabilityVocabulary,
  governanceScopeVocabulary,
  governanceCapabilityVocabulary,
  type GovernanceMutability,
  type GovernanceScope,
  type GovernanceCapability,
} from './governance/vocabulary';
