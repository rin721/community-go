import { describe, expect, it } from 'vitest';

import {
  applyGovernanceChange,
  composeGovernance,
  createGovernanceChange,
  describeGovernanceDiff,
  governanceContributionSchema,
  type GovernanceContribution,
} from './index';

/**
 * R106-001 治理事实快照（仅测试用 fixture，不代表真实 Authority 事实；
 * 真实 Governance Contribution 由各 Authority 包提供并经 Host composition 汇聚）。
 */
function sampleContribution(
  overrides: Partial<GovernanceContribution> = {},
): GovernanceContribution {
  return {
    authorityId: 'fixture-authority',
    authorityReference: '@community-go/fixture-authority',
    title: 'Fixture Authority',
    domains: [
      {
        domainId: 'sample',
        title: 'Sample Domain',
        nodes: [
          {
            nodeId: 'sample.value',
            title: 'Sample Value',
            kind: 'value',
            mutability: 'readonly',
            scope: 'universal',
            capabilities: ['inspect', 'read', 'validate', 'diagnose'],
            constraints: [],
            evidence: ['fixtures/sample.ts'],
          },
        ],
      },
    ],
    ...overrides,
  };
}

describe('governance contribution contract', () => {
  it('解析合法 contribution', () => {
    const result = governanceContributionSchema.safeParse(sampleContribution());
    expect(result.success).toBe(true);
  });

  it('拒绝非法 authorityId（非小写 kebab-case）', () => {
    const result = governanceContributionSchema.safeParse(
      sampleContribution({ authorityId: 'NotValid' }),
    );
    expect(result.success).toBe(false);
  });

  it('拒绝未知字段（strict schema）', () => {
    const result = governanceContributionSchema.safeParse({
      ...sampleContribution(),
      extra: true,
    });
    expect(result.success).toBe(false);
  });
});

describe('composeGovernance', () => {
  it('healthy 输入产出无 error 的 Resolved Governance Model 并保留追溯', () => {
    const model = composeGovernance([sampleContribution()]);
    expect(model.diagnostics.hasErrors).toBe(false);
    expect(model.authorities).toHaveLength(1);
    const node = model.authorities[0]!.domains[0]!.nodes[0]!;
    expect(node.authorityId).toBe('fixture-authority');
    expect(node.domainId).toBe('sample');
    expect(node.nodeId).toBe('sample.value');
  });

  it('capabilities 标准化为去重并按词汇表排序', () => {
    const model = composeGovernance([
      sampleContribution({
        domains: [
          {
            domainId: 'sample',
            title: 'Sample Domain',
            nodes: [
              {
                nodeId: 'sample.value',
                title: 'Sample Value',
                kind: 'value',
                mutability: 'project-configurable',
                scope: 'universal',
                capabilities: ['dev-override', 'inspect', 'dev-override', 'read'],
                constraints: [],
                evidence: ['fixtures/sample.ts'],
              },
            ],
          },
        ],
      }),
    ]);
    const node = model.authorities[0]!.domains[0]!.nodes[0]!;
    expect(node.capabilities).toEqual(['inspect', 'read', 'dev-override']);
  });

  it('重复 authorityId deterministic fail（带完整诊断）', () => {
    const contribution = sampleContribution();
    expect(() => composeGovernance([contribution, contribution])).toThrow(
      /Governance Composition 失败/,
    );
  });

  it('nodeId 违反 namespace deterministic fail', () => {
    expect(() =>
      composeGovernance([
        sampleContribution({
          domains: [
            {
              domainId: 'sample',
              title: 'Sample Domain',
              nodes: [
                {
                  nodeId: 'other.value',
                  title: 'Bad Node',
                  kind: 'value',
                  mutability: 'readonly',
                  scope: 'universal',
                  capabilities: ['inspect'],
                  constraints: [],
                  evidence: ['fixtures/sample.ts'],
                },
              ],
            },
          ],
        }),
      ]),
    ).toThrow(/GOV_NODE_NAMESPACE_VIOLATION/);
  });

  it('mutability×capability 冲突（readonly 声明 dev-override）deterministic fail', () => {
    expect(() =>
      composeGovernance([
        sampleContribution({
          domains: [
            {
              domainId: 'sample',
              title: 'Sample Domain',
              nodes: [
                {
                  nodeId: 'sample.value',
                  title: 'Bad Node',
                  kind: 'value',
                  mutability: 'readonly',
                  scope: 'universal',
                  capabilities: ['inspect', 'dev-override'],
                  constraints: [],
                  evidence: ['fixtures/sample.ts'],
                },
              ],
            },
          ],
        }),
      ]),
    ).toThrow(/GOV_MUTABILITY_CAPABILITY_CONFLICT/);
  });

  it('跨 Authority 重复 domainId deterministic fail', () => {
    expect(() =>
      composeGovernance([
        sampleContribution({ authorityId: 'fixture-a' }),
        sampleContribution({ authorityId: 'fixture-b' }),
      ]),
    ).toThrow(/GOV_DUPLICATE_DOMAIN/);
  });
});

describe('draft / diff / change', () => {
  const draft = {
    draftId: 'draft-1',
    authorityId: 'fixture-authority',
    domainId: 'sample',
    nodeId: 'sample.value',
    targetValue: { accent: '#123456' },
    source: 'inspector' as const,
    createdAt: '2026-11-20T00:00:00.000Z',
  };

  it('createGovernanceChange 对 record 差异生成结构化 diff', () => {
    const change = createGovernanceChange(draft, { accent: '#654321' });
    expect(change.diffs).toEqual([
      {
        draftId: 'draft-1',
        authorityId: 'fixture-authority',
        domainId: 'sample',
        nodeId: 'sample.value',
        kind: 'update',
        path: ['accent'],
        before: '#654321',
        after: '#123456',
      },
    ]);
  });

  it('describeGovernanceDiff 生成可读描述', () => {
    const change = createGovernanceChange(draft, { accent: '#654321' });
    expect(describeGovernanceDiff(change.diffs[0]!)).toContain('"#654321" → "#123456"');
  });

  it('applyGovernanceChange 不可变计算目标值', () => {
    const change = createGovernanceChange(draft, { accent: '#654321' });
    expect(applyGovernanceChange(change, { accent: '#654321' })).toEqual({ accent: '#123456' });
  });

  it('无差异 draft 返回空 diff 与原值', () => {
    const change = createGovernanceChange(draft, draft.targetValue);
    expect(change.diffs).toEqual([]);
  });
});
