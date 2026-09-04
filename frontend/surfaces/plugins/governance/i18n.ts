/**
 * governance —— Plugin-private i18n（顶层 namespace `governance.*`）。
 *
 * 只承载本 Plugin（Governance Control Plane UI）自己的文案；治理事实与
 * Authority 文案不在此处。删除本 Plugin 不影响任何真实 Authority。
 */
export const pluginI18nResources = {
  'zh-CN': {
    translation: {
      governanceNav: {
        root: '治理',
      },
      governance: {
        eyebrow: 'Governance Control Plane',
        title: 'Frontend Governance',
        description:
          'Resolved Governance Model 是当前 Frontend Architecture 的机器可读治理投影；本页只负责可视化，不拥有任何治理事实。',
        authorityCount: '正式 Authority',
        nodeCount: '治理节点',
        domainCount: '治理 Domain',
        healthy: '模型健康（无 error 诊断）',
        diagnostics: '诊断',
        noDiagnostics: '无诊断',
        mutability: 'Mutability',
        scope: 'Scope',
        capabilities: 'Capabilities',
        evidence: 'Evidence',
        source: 'Source',
        validateLabel: '结构校验',
        validateResult: '结构已由 Governance Composition 校验通过',
        diagnoseLabel: '诊断',
        nodeTitle: '节点',
        nodesEmpty: '该 Domain 无节点',
      },
    },
  },
  en: {
    translation: {
      governanceNav: {
        root: 'Governance',
      },
      governance: {
        eyebrow: 'Governance Control Plane',
        title: 'Frontend Governance',
        description:
          'The Resolved Governance Model is the machine-readable governance projection of the current Frontend Architecture. This page only visualizes it and owns no governance facts.',
        authorityCount: 'Formal Authorities',
        nodeCount: 'Governance Nodes',
        domainCount: 'Governance Domains',
        healthy: 'Model healthy (no error diagnostics)',
        diagnostics: 'Diagnostics',
        noDiagnostics: 'No diagnostics',
        mutability: 'Mutability',
        scope: 'Scope',
        capabilities: 'Capabilities',
        evidence: 'Evidence',
        source: 'Source',
        validateLabel: 'Structural validation',
        validateResult: 'Structure validated by Governance Composition',
        diagnoseLabel: 'Diagnose',
        nodeTitle: 'Node',
        nodesEmpty: 'No nodes in this domain',
      },
    },
  },
} as const;
