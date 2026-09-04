/**
 * plugin-framework —— Governance Contribution（Authority-owned）。
 *
 * Plugin Framework 自己拥有 Plugin Contract、Route Target、Registry、Navigation
 * Resolution、Diagnostics、Host Port / Host Capability 等治理能力；具体契约事实
 * 由本包源码与测试承载（evidence 定位，不复制）。本文件只使用
 * `@community-go/schemas` 统一 Contract 描述治理 Schema。
 */

import type { GovernanceContribution } from '@community-go/schemas/governance';

export const governanceContribution = {
  authorityId: 'plugin-framework',
  authorityReference: '@community-go/plugin-framework',
  title: 'Plugin Framework Authority',
  description:
    '拥有 Plugin 契约与纯模型层：Plugin Contract、Route Target、Registry、Navigation Resolution、Diagnostics、Host Port / Host Capability；不实现 Router、不读取 pathname、不维护 history。',
  domains: [
    {
      domainId: 'plugin-contract',
      title: 'Plugin Contract',
      description:
        'pluginId/mount/PluginDefinition 与 File Route Descriptor 契约；不存在第二套 Route Contract。',
      nodes: [
        {
          nodeId: 'plugin-contract.definition',
          title: 'Plugin Definition Contract',
          description:
            'pluginId + mount 静态声明（plugin.ts）；目录名与 pluginId 解耦；Plugin 不是 package、不是公共 API。',
          kind: 'contract',
          valueType: 'plugin-framework exports（PluginDefinition；./plugin）',
          source: 'packages/plugin-framework/src/contract.ts',
          constraints: [
            {
              id: 'plugin-contract.definition.routes',
              kind: 'semantic',
              description:
                'routes/ 是真实 Next App Router 子树（authority=Next 本身）；不引入 route.meta.ts 等第二套 Route Contract。',
            },
          ],
          mutability: 'readonly',
          scope: 'surface',
          capabilities: ['inspect', 'read', 'validate', 'diagnose'],
          association: {
            contract: 'surfaces 插件规范（plugin.ts/plugin.navigation.ts/i18n.ts/routes）',
            note: '真实插件以 surfaces/plugins/* 为载体。',
          },
          evidence: [
            'packages/plugin-framework/src/contract.ts',
            'packages/plugin-framework/src/framework.test.ts',
          ],
        },
      ],
    },
    {
      domainId: 'registry',
      title: 'Registry',
      description: 'routeId/pattern 唯一性校验、routeId→descriptor 索引与冲突诊断。',
      nodes: [
        {
          nodeId: 'registry.identity',
          title: 'Route Identity & Conflict Diagnostics',
          description:
            'createRegistry 对 routeId/pattern 唯一性与 plugin 归属做 deterministic 校验（DUPLICATE_ROUTE_ID/DUPLICATE_PATTERN/UNKNOWN_ROUTE）。',
          kind: 'contract',
          valueType: 'plugin-framework exports（createRegistry/RegistryModel）',
          source: 'packages/plugin-framework/src/registry.ts',
          constraints: [
            {
              id: 'registry.identity.deterministic',
              kind: 'semantic',
              description:
                '校验失败保留 code 与消息，不静默回退默认值；Registry 是纯函数模型，不读取 pathname。',
            },
          ],
          mutability: 'readonly',
          scope: 'surface',
          capabilities: ['inspect', 'read', 'validate', 'diagnose'],
          evidence: [
            'packages/plugin-framework/src/registry.ts',
            'packages/plugin-framework/src/framework.test.ts',
          ],
        },
      ],
    },
    {
      domainId: 'navigation',
      title: 'Navigation Resolution',
      description:
        'Sidebar Group → Parent → Child 模型、navigationId namespace、静态 routeId gate 与 topology 诊断。',
      nodes: [
        {
          nodeId: 'navigation.contribution',
          title: 'Navigation Contribution Contract',
          description:
            'groupId 选择 plugins 公共 Group Alias；navigationId 必须 ${pluginId}. 前缀；Sidebar 可见 Node routeId 必须静态可解析。',
          kind: 'contract',
          valueType: 'plugin-framework exports（./navigation 的 NavigationContribution）',
          source: 'packages/plugin-framework/src/navigation-contract.ts',
          constraints: [
            {
              id: 'navigation.contribution.namespace',
              kind: 'semantic',
              description:
                'navigationId namespace 违规（NAVIGATION_NAMESPACE_VIOLATION）、未知 group/icon 由 codegen gate deterministic fail。',
            },
            {
              id: 'navigation.contribution.static-target',
              kind: 'semantic',
              description:
                '动态 [param] Route 不得直接作为普通 Sidebar target（NAVIGATION_DYNAMIC_TARGET_UNSUPPORTED）。',
            },
          ],
          mutability: 'readonly',
          scope: 'surface',
          capabilities: ['inspect', 'read', 'validate', 'diagnose', 'preview'],
          preview: {
            mode: 'static',
            note: 'resolved href 为静态可解析地址；Shell 消费 resolved model。',
          },
          association: {
            contract: 'surfaces/plugins/navigation-groups.ts（Group Alias 公共 IA）',
            note: 'Group Alias 事实由 Surface 治理。',
          },
          evidence: [
            'packages/plugin-framework/src/navigation-contract.ts',
            'packages/plugin-framework/src/navigation-resolution.ts',
            'packages/plugin-framework/src/framework.test.ts',
          ],
        },
      ],
    },
    {
      domainId: 'host-capability',
      title: 'Host Capability',
      description:
        'Host Deployment Mode（static/static-enumerated/server）与 Route 承载能力判定；Mode 属 Host 配置。',
      nodes: [
        {
          nodeId: 'host-capability.deployment-mode',
          title: 'Host Deployment Mode',
          description:
            'analyzeHostCapability 按 Mode 判定 Route 是否可承载；Framework Contract 合法 ≠ 当前 Host 可部署。',
          kind: 'policy',
          valueType: 'plugin-framework exports（analyzeHostCapability/HostDeploymentMode）',
          source: 'packages/plugin-framework/src/host.ts',
          constraints: [
            {
              id: 'host-capability.deployment-mode.owner',
              kind: 'semantic',
              description:
                'Mode 属 Host（apps/web/.env WEB_DEPLOYMENT_MODE）；Plugin 写法不随 Mode 改变；Next build 是最终 authority。',
            },
          ],
          mutability: 'runtime-policy',
          scope: 'host',
          capabilities: ['inspect', 'read', 'validate', 'diagnose'],
          evidence: ['packages/plugin-framework/src/host.ts', 'apps/web/.env.example'],
        },
        {
          nodeId: 'host-capability.navigation-port',
          title: 'Host Navigation / Locale Port',
          description:
            'Host Port 契约（navigate/replace/renderLink；locale 读写），由 Composition Root 一次性安装。',
          kind: 'contract',
          valueType: 'plugin-framework exports（./plugin 的 Provider/usePlugin*）',
          source: 'packages/plugin-framework/src/plugin.tsx',
          constraints: [
            {
              id: 'host-capability.navigation-port.injection',
              kind: 'semantic',
              description:
                'Host Port 属于 application runtime context，由 Host 一次性注入；未安装即 throw（不静默）。',
            },
          ],
          mutability: 'readonly',
          scope: 'host',
          capabilities: ['inspect', 'read', 'validate', 'diagnose'],
          evidence: [
            'packages/plugin-framework/src/plugin.tsx',
            'apps/web/src/host/navigation-port.tsx',
          ],
        },
      ],
    },
    {
      domainId: 'ownership-boundary',
      title: 'Plugin Ownership Boundary',
      description:
        'Plugin ownership 独立 = 业务 ownership 独立；禁止跨 Plugin/Host/Shell 私有依赖与隐式耦合。',
      nodes: [
        {
          nodeId: 'ownership-boundary.plugin-private',
          title: 'Plugin Private Boundary',
          description:
            'Plugin 私有 store/i18n/routes 只归自身；禁止 import Host/Shell/其它 Plugin 私有实现；跨边界能力经正式 Port。',
          kind: 'boundary',
          valueType: 'surfaces plugin 目录规范 + framework diagnostics',
          source: 'packages/plugin-framework/src/diagnostics.ts',
          constraints: [
            {
              id: 'ownership-boundary.plugin-private.gate',
              kind: 'semantic',
              description:
                'architecture:check 覆盖 Surface private export boundary 与跨 Plugin topology reference；violation deterministic fail。',
            },
          ],
          mutability: 'diagnostic-only',
          scope: 'surface',
          capabilities: ['inspect', 'diagnose'],
          association: {
            contract: 'check-boundaries（架构门禁）+ surfaces/AGENTS',
            note: 'ownership 事实由目录规范与 import gate 承载。',
          },
          consumer: 'architecture:check / codegen gates',
          evidence: [
            'tooling/check-boundaries.mjs',
            'packages/plugin-framework/src/diagnostics.ts',
          ],
        },
      ],
    },
  ],
} as const satisfies GovernanceContribution;
