/**
 * @community-go/schemas —— Governance Contribution Contract（结构与解析）。
 *
 * 定义 Authority 自述治理 Schema 的统一结构（Authority → Domain → Node），
 * 以及对应的 zod 校验 Schema。本模块只负责**契约**：
 * - 不持有任何具体治理事实（Token/Pattern/Rule/Policy）；
 * - 不反向解析 Authority 的私有实现；
 * - 具体事实由真正 Authority 在自己的 Governance Contribution 中描述，
 *   以 source/evidence 定位，不复制进本包。
 */

import { z } from 'zod';

import {
  governanceCapabilityVocabulary,
  governanceMutabilityVocabulary,
  governanceScopeVocabulary,
  type GovernanceCapability,
  type GovernanceMutability,
  type GovernanceScope,
} from './vocabulary';

/** 治理约束：可读、可解释、可机器校验。 */
export type GovernanceConstraint = Readonly<{
  id: string;
  kind: 'schema' | 'enum' | 'range' | 'regex' | 'semantic' | 'custom';
  description: string;
  detail?: string;
}>;

/** 治理 Node：Authority 治理描述的最小单元。 */
export type GovernanceNode = Readonly<{
  nodeId: string;
  title: string;
  description?: string;
  kind: 'value' | 'schema' | 'policy' | 'contract' | 'boundary' | 'process';
  /** 语义化值类型描述（如 `CSS custom property`、`component contract`）。 */
  valueType?: string;
  /** 事实载体定位（文件/子路径），不复制事实。 */
  source?: string;
  constraints: readonly GovernanceConstraint[];
  mutability: GovernanceMutability;
  scope: GovernanceScope;
  capabilities: readonly GovernanceCapability[];
  /** Preview 能力描述。 */
  preview?: Readonly<{ mode: 'static' | 'runtime' | 'css' | 'none'; note?: string }>;
  /** 与正式 Authority Contract 的关联。 */
  association?: Readonly<{ contract: string; note?: string }>;
  /** 真实消费方（页面/组件/工具）。 */
  consumer?: string;
  /** 验证证据（测试/文件路径，须存在）。 */
  evidence: readonly string[];
}>;

/** Governance Domain：一个 Authority 内按主题组织的治理域。 */
export type GovernanceDomain = Readonly<{
  domainId: string;
  title: string;
  description?: string;
  nodes: readonly GovernanceNode[];
}>;

/** Governance Contribution：Authority 自述治理 Schema 的统一入口。 */
export type GovernanceContribution = Readonly<{
  authorityId: string;
  /** Authority reference：正式 Contract 定位（package 名/文档）。 */
  authorityReference: string;
  title?: string;
  description?: string;
  domains: readonly GovernanceDomain[];
}>;

/* ------------------------------------------------------------------ */
/* zod 校验 Schema                                                     */
/* ------------------------------------------------------------------ */

const identifierPattern = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/;

const constraintSchema = z.object({
  id: z.string().min(1),
  kind: z.enum(['schema', 'enum', 'range', 'regex', 'semantic', 'custom']),
  description: z.string().min(1),
  detail: z.string().optional(),
});

const nodeSchema = z
  .object({
    nodeId: z.string().min(1),
    title: z.string().min(1),
    description: z.string().optional(),
    kind: z.enum(['value', 'schema', 'policy', 'contract', 'boundary', 'process']),
    valueType: z.string().optional(),
    source: z.string().optional(),
    constraints: z.array(constraintSchema),
    mutability: z.enum(governanceMutabilityVocabulary),
    scope: z.enum(governanceScopeVocabulary),
    capabilities: z.array(z.enum(governanceCapabilityVocabulary)),
    preview: z
      .object({
        mode: z.enum(['static', 'runtime', 'css', 'none']),
        note: z.string().optional(),
      })
      .optional(),
    association: z.object({ contract: z.string().min(1), note: z.string().optional() }).optional(),
    consumer: z.string().optional(),
    evidence: z.array(z.string().min(1)),
  })
  .strict();

const domainSchema = z
  .object({
    domainId: z.string().min(1),
    title: z.string().min(1),
    description: z.string().optional(),
    nodes: z.array(nodeSchema),
  })
  .strict();

/** Governance Contribution 的 zod 校验 Schema（Authority 文件可直接 parse）。 */
export const governanceContributionSchema = z
  .object({
    authorityId: z.string().regex(identifierPattern, 'authorityId 必须为小写 kebab-case 标识符'),
    authorityReference: z.string().min(1),
    title: z.string().optional(),
    description: z.string().optional(),
    domains: z.array(domainSchema),
  })
  .strict();

export type GovernanceContributionInput = z.infer<typeof governanceContributionSchema>;

/** Node 级小写 kebab identifier 校验（nodeId 前缀之外的段）。 */
export const governanceNodeSegmentPattern = identifierPattern;

/** Domain 级小写 kebab identifier 校验。 */
export const governanceDomainIdPattern = identifierPattern;
