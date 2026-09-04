/**
 * state-foundation —— Governance Contribution（Authority-owned）。
 *
 * State Foundation 自己拥有 Store、Persistence、Namespace、Hydration 等状态治理
 * Contract；具体事实（Store 创建约定、Persist Config、Storage Adapter、Namespace
 * 规则）由本包源码与测试承载（evidence 定位，不复制）。本文件只使用
 * `@community-go/schemas` 统一 Contract 描述治理 Schema。
 */

import type { GovernanceContribution } from '@community-go/schemas/governance';

export const governanceContribution = {
  authorityId: 'state-foundation',
  authorityReference: '@community-go/state-foundation',
  title: 'State Foundation Authority',
  description:
    '拥有产品状态机制：Store 创建约定（createAppStore/createPersistStore）、Persistence Contract、Storage Adapter、Namespace 与 Hydration lifecycle；UI 呈现态（StateSurface/AsyncRegion）不属本 Authority。',
  domains: [
    {
      domainId: 'store-contract',
      title: 'Store Contract',
      description: 'Store 创建约定与 scope 语义（zustand 只允许本包 import）。',
      nodes: [
        {
          nodeId: 'store-contract.creation',
          title: 'Store Creation Contract',
          description:
            'createAppStore / createPersistStore 统一创建约定；Store 属于 Owner（filesystem ownership），无 Store Registry/Catalog。',
          kind: 'contract',
          valueType: 'state-foundation exports（createAppStore/createPersistStore）',
          source: 'packages/state-foundation/src/framework.ts',
          constraints: [
            {
              id: 'store-contract.creation.zustand-boundary',
              kind: 'semantic',
              description:
                'zustand（含 middleware/vanilla）只允许 packages/state-foundation import；业务经 @community-go/state-foundation 消费。',
            },
            {
              id: 'store-contract.creation.ownership',
              kind: 'semantic',
              description:
                'Plugin 可拥有私有 store，但禁止 import Host/Shell/其它 Plugin 私有 store；跨 Runtime boundary 能力经正式 Port。',
            },
          ],
          mutability: 'readonly',
          scope: 'universal',
          capabilities: ['inspect', 'read', 'validate', 'diagnose'],
          association: {
            contract: 'tooling/dependency-policy.json（zustand owner）',
            note: 'vendor 边界由依赖策略与 import gate 承载。',
          },
          evidence: [
            'packages/state-foundation/src/framework.ts',
            'packages/state-foundation/src/framework.test.ts',
          ],
        },
      ],
    },
    {
      domainId: 'persistence',
      title: 'Persistence Contract',
      description:
        '持久化是 opt-in：definePersistConfig（name/version/migrate/partialize 白名单/skipHydration/onRehydrateStorage）。',
      nodes: [
        {
          nodeId: 'persistence.config',
          title: 'Persist Config Contract',
          description:
            'definePersistConfig 显式声明持久化配置；只持久化 durable 字段（preference/配置/draft），禁止持久化 transient 状态。',
          kind: 'contract',
          valueType: 'state-foundation exports（definePersistConfig/formatPersistKey）',
          source: 'packages/state-foundation/src/persist/config.ts',
          constraints: [
            {
              id: 'persistence.config.partialize',
              kind: 'semantic',
              description:
                '持久化必须显式 partialize 白名单；禁止持久化 loading/error/transient UI/raw API response/auth secret。',
            },
            {
              id: 'persistence.config.migration',
              kind: 'semantic',
              description:
                'persist key 变更必须保持老用户数据兼容（version/migrate 渐进）；禁止静默换 key。',
            },
          ],
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
          preview: { mode: 'static', note: '由 /preferences 页面与测试证据呈现。' },
          consumer: 'system-tools preferences / Host shell store',
          evidence: [
            'packages/state-foundation/src/persist/config.ts',
            'packages/state-foundation/src/contract/persist.ts',
          ],
        },
      ],
    },
    {
      domainId: 'storage',
      title: 'Storage Adapter',
      description:
        'createLocalStorage/createSessionStorage/createMemoryStorage/createIndexedDBStorage 的 SSR-safe lazy + unavailablePolicy。',
      nodes: [
        {
          nodeId: 'storage.adapter-semantics',
          title: 'Storage Adapter Semantics',
          description:
            '各 Web Storage 的语义选择（durable preference→localStorage、current-tab→sessionStorage、large/async→IndexedDB、测试/SSR→memory）。',
          kind: 'contract',
          valueType: 'state-foundation exports（create*Storage）',
          source: 'packages/state-foundation/src/storage',
          constraints: [
            {
              id: 'storage.adapter-semantics.choice',
              kind: 'semantic',
              description:
                'storage 选择按数据语义（见 frontend/AGENTS §4.6 决策链）；禁止业务自行创建第二套客户端。',
            },
          ],
          mutability: 'readonly',
          scope: 'universal',
          capabilities: ['inspect', 'read', 'validate', 'diagnose'],
          evidence: [
            'packages/state-foundation/src/storage/indexed-db.test.ts',
            'packages/state-foundation/src/storage',
          ],
        },
      ],
    },
    {
      domainId: 'namespace',
      title: 'Namespace',
      description: 'community-go.<scope>.<store> 命名空间规则，防裸 key。',
      nodes: [
        {
          nodeId: 'namespace.key-format',
          title: 'Persist Key Namespace',
          description:
            'createNamespace/createPersistKey/isManagedKey 强制受管 key 格式（community-go.<scope>.<store>）。',
          kind: 'process',
          valueType: 'state-foundation exports（namespace 工具）',
          source: 'packages/state-foundation/src/persist/namespace.ts',
          constraints: [
            {
              id: 'namespace.key-format.managed',
              kind: 'semantic',
              description: '持久化 key 必须经受管 namespace；禁止裸 key 散落。',
            },
          ],
          mutability: 'fixed',
          scope: 'universal',
          capabilities: ['inspect', 'read', 'validate', 'diagnose'],
          evidence: ['packages/state-foundation/src/persist/namespace.ts'],
        },
      ],
    },
    {
      domainId: 'hydration',
      title: 'Hydration Lifecycle',
      description:
        'rehydrateStore 命令式 / useHydratedStore React 门控 / createHydrationLifecycle 状态机。',
      nodes: [
        {
          nodeId: 'hydration.lifecycle',
          title: 'Hydration Lifecycle Contract',
          description:
            'hydration 幂等触发与 React 门控语义；hasHydrated 由 onRehydrateStorage 设置。',
          kind: 'contract',
          valueType:
            'state-foundation exports（rehydrateStore/isStoreHydrated；./react 的 useHydratedStore）',
          source: 'packages/state-foundation/src/hydration/lifecycle.ts',
          constraints: [
            {
              id: 'hydration.lifecycle.gate',
              kind: 'semantic',
              description:
                'SSR/hydration 前 UI 不得读取未水合 store；测试工具（/testing）只允许测试消费。',
            },
          ],
          mutability: 'readonly',
          scope: 'universal',
          capabilities: ['inspect', 'read', 'validate', 'diagnose'],
          evidence: [
            'packages/state-foundation/src/hydration/lifecycle.test.ts',
            'packages/state-foundation/src/hydration/rehydrate.ts',
          ],
        },
      ],
    },
  ],
} as const satisfies GovernanceContribution;
