import { describe, expect, it } from 'vitest';

import { composeGovernance, createGovernanceApi, type GovernanceContribution } from './index';

/** 可配置节点（project-configurable，支持 dev-override/preview/diff）。 */
const configurableContribution: GovernanceContribution = {
  authorityId: 'fixture-authority',
  authorityReference: '@community-go/fixture-authority',
  domains: [
    {
      domainId: 'sample',
      title: 'Sample Domain',
      nodes: [
        {
          nodeId: 'sample.radius',
          title: 'Radius',
          kind: 'value',
          mutability: 'project-configurable',
          scope: 'universal',
          capabilities: [
            'inspect',
            'read',
            'validate',
            'diagnose',
            'preview',
            'diff',
            'dev-override',
          ],
          constraints: [],
          evidence: ['fixtures/sample.ts'],
        },
        {
          nodeId: 'sample.boundary',
          title: 'Boundary',
          kind: 'boundary',
          mutability: 'diagnostic-only',
          scope: 'surface',
          capabilities: ['inspect', 'diagnose'],
          constraints: [],
          evidence: ['fixtures/sample.ts'],
        },
        {
          nodeId: 'sample.fixed-value',
          title: 'Fixed Value',
          kind: 'value',
          mutability: 'fixed',
          scope: 'universal',
          capabilities: ['inspect', 'read', 'validate', 'diagnose'],
          constraints: [],
          evidence: ['fixtures/sample.ts'],
        },
      ],
    },
  ],
};

const target = { authorityId: 'fixture-authority', domainId: 'sample', nodeId: 'sample.radius' };
const boundaryTarget = {
  authorityId: 'fixture-authority',
  domainId: 'sample',
  nodeId: 'sample.boundary',
};

describe('governance api', () => {
  const model = composeGovernance([configurableContribution]);
  const api = createGovernanceApi(model, { devOverrideAvailable: true });
  const prodApi = createGovernanceApi(model, { devOverrideAvailable: false });

  it('inspect 返回 Resolved Model 与其诊断健康度', () => {
    const result = api.inspect();
    expect(result.diagnostics.hasErrors).toBe(false);
    expect(result.value.authorities).toHaveLength(1);
  });

  it('read 返回 Node 治理视图（含追溯与 capabilities）', () => {
    const result = api.read(target);
    expect(result.diagnostics.hasErrors).toBe(false);
    expect(result.value?.nodeId).toBe('sample.radius');
    expect(result.value?.authorityId).toBe('fixture-authority');
    expect(result.value?.capabilities).toContain('dev-override');
  });

  it('未知 Node 返回 GOV_UNKNOWN_NODE warning 不抛错', () => {
    const result = api.read({ ...target, nodeId: 'sample.missing' });
    expect(result.diagnostics.errors).toHaveLength(0);
    expect(result.diagnostics.warnings[0]?.code).toBe('GOV_UNKNOWN_NODE');
    expect(result.value).toBeUndefined();
  });

  it('capability 门禁：diagnostic-only 节点不允许 read（只 inspect/diagnose）', () => {
    const result = api.read(boundaryTarget);
    expect(result.diagnostics.warnings[0]?.code).toBe('GOV_UNSUPPORTED_OPERATION');
    expect(result.value).toBeUndefined();
  });

  it('capability 门禁：diagnostic-only 节点允许 diagnose', () => {
    const result = api.diagnose(boundaryTarget);
    expect(result.diagnostics.hasErrors).toBe(false);
    expect(result.value?.nodeId).toBe('sample.boundary');
  });

  it('devOverride 在 dev 环境可用（需 Node 声明 dev-override）', () => {
    const result = api.devOverride(target, { radius: '1rem' });
    expect(result.diagnostics.hasErrors).toBe(false);
  });

  it('devOverride 在 production 环境返回 GOV_DEV_OVERRIDE_UNAVAILABLE', () => {
    const result = prodApi.devOverride(target, { radius: '1rem' });
    expect(result.diagnostics.warnings[0]?.code).toBe('GOV_DEV_OVERRIDE_UNAVAILABLE');
    expect(result.value).toBeUndefined();
  });

  it('devOverride 对未声明 dev-override 的节点返回 GOV_UNSUPPORTED_OPERATION', () => {
    const result = api.devOverride(
      { authorityId: 'fixture-authority', domainId: 'sample', nodeId: 'sample.fixed-value' },
      { value: 1 },
    );
    expect(result.diagnostics.warnings[0]?.code).toBe('GOV_UNSUPPORTED_OPERATION');
  });

  it('preview 生成 target 视图与 diff（纯计算）', () => {
    const draft = {
      draftId: 'draft-preview',
      authorityId: 'fixture-authority',
      domainId: 'sample',
      nodeId: 'sample.radius',
      targetValue: { radius: '1rem' },
      source: 'plugin' as const,
      createdAt: '2026-11-20T00:00:00.000Z',
    };
    const result = api.preview(target, draft, { radius: '0.75rem' });
    expect(result.diagnostics.hasErrors).toBe(false);
    expect(result.value?.diffs).toHaveLength(1);
    expect(result.value?.diffs[0]?.kind).toBe('update');
  });

  it('diff 需要 Node 声明 diff（fixed 节点不支持）', () => {
    const draft = {
      draftId: 'draft-diff',
      authorityId: 'fixture-authority',
      domainId: 'sample',
      nodeId: 'sample.fixed-value',
      targetValue: 2,
      source: 'plugin' as const,
      createdAt: '2026-11-20T00:00:00.000Z',
    };
    const result = api.diff(
      { authorityId: 'fixture-authority', domainId: 'sample', nodeId: 'sample.fixed-value' },
      draft,
      1,
    );
    expect(result.diagnostics.warnings[0]?.code).toBe('GOV_UNSUPPORTED_OPERATION');
  });
});
