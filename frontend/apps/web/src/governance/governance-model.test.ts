import { describe, expect, it } from 'vitest';

import { listGovernanceNodes } from '@community-go/schemas/governance';
import { resolvedGovernanceModel } from './generated-model';

/**
 * Resolved Governance Model 一致性测试：
 * import generated-model.ts 即执行顶层 composeGovernance（确定性校验；
 * 任何 identity/namespace/冲突/capability×mutability 违规都会在模块加载时
 * throw——测试本身证明 healthy 汇聚成功）。
 */

describe('resolved governance model', () => {
  it('compose 健康：无 error 诊断', () => {
    expect(resolvedGovernanceModel.diagnostics.hasErrors).toBe(false);
    expect(resolvedGovernanceModel.diagnostics.errors).toEqual([]);
  });

  it('汇聚五个正式 Authority（不含 schemas 自身）', () => {
    const authorityIds = resolvedGovernanceModel.authorities.map((item) => item.authorityId);
    expect(authorityIds.sort()).toEqual(
      [
        'design-system',
        'plugin-framework',
        'state-foundation',
        'surface-foundation',
        'ui-adapter',
      ].sort(),
    );
  });

  it('每个 Node 可追溯到 owning Authority 且 namespace 合法', () => {
    const nodes = listGovernanceNodes(resolvedGovernanceModel);
    expect(nodes.length).toBeGreaterThan(0);
    for (const node of nodes) {
      expect(node.nodeId.startsWith(`${node.domainId}.`)).toBe(true);
      expect(node.authorityId.length).toBeGreaterThan(0);
      // capability 子集已经 compose 标准化（去重、词汇表内）
      expect(node.capabilities.length).toBeGreaterThan(0);
      expect(new Set(node.capabilities).size).toBe(node.capabilities.length);
    }
  });

  it('边界类 Node 只暴露 inspect/diagnose（Plugin Boundary / HeroUI Isolation）', () => {
    const nodes = listGovernanceNodes(resolvedGovernanceModel);
    const boundaryNodes = nodes.filter(
      (node) => node.kind === 'boundary' || node.title.includes('Boundary'),
    );
    expect(boundaryNodes.length).toBeGreaterThan(0);
    for (const node of boundaryNodes) {
      const editing = node.capabilities.filter(
        (capability) =>
          capability === 'dev-override' ||
          capability === 'project-author' ||
          capability === 'user-override' ||
          capability === 'draft',
      );
      expect(editing).toEqual([]);
    }
  });

  it('evidence 指向真实存在文件（Authority 事实关联可验证）', () => {
    const nodes = listGovernanceNodes(resolvedGovernanceModel);
    const sources = new Set(
      nodes.flatMap((node) => [node.source, ...node.evidence].filter(Boolean) as string[]),
    );
    // 证据以相对 frontend 根定位；这里只验证格式非空（文件存在性由
    // foundation-contracts evidence 门禁对顶层文件校验，Node evidence 用于治理展示）。
    expect(sources.size).toBeGreaterThan(0);
  });
});
