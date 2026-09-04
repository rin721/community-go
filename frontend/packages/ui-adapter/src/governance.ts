/**
 * ui-adapter —— Governance Contribution（Authority-owned）。
 *
 * UI Adapter 自己拥有 UI Component Contract、底层 HeroUI / React Aria 隔离边界、
 * Overlay / Async State 语义与正式 Variant 等能力。具体组件实现与 vendor 样式
 * 事实留在 ui-adapter 源码（evidence 定位，不复制）；本文件只使用
 * `@community-go/schemas` 统一 Contract 描述治理 Schema。
 */

import type { GovernanceContribution } from '@community-go/schemas/governance';

export const governanceContribution = {
  authorityId: 'ui-adapter',
  authorityReference: '@community-go/ui-adapter',
  title: 'UI Adapter Authority',
  description:
    '拥有产品中性 UI Contract：UI Element、Overlay、Accessibility、Keyboard、Focus、Async State 语义组件与唯一 HeroUI / React Aria 边界。',
  domains: [
    {
      domainId: 'component-contract',
      title: 'UI Component Contract',
      description:
        'Action / Card / Panel / Data Display / Form Field / Feedback / Navigation / Overlays 等公开组件子路径契约。',
      nodes: [
        {
          nodeId: 'component-contract.public-subpaths',
          title: 'Public Component Subpaths',
          description:
            'ui-adapter 公共组件子路径（./action、./card、./panel、./overlays、./async-region、./content-swap-transition 等）是唯一 HeroUI/React Aria 消费边界。',
          kind: 'contract',
          valueType: 'package exports 子路径（38 个）',
          source: 'packages/ui-adapter/package.json',
          constraints: [
            {
              id: 'component-contract.public-subpaths.boundary',
              kind: 'semantic',
              description:
                'Adapter 对外 props 必须是稳定产品语义；禁止透传 HeroUI props / DOM 结构 / slot 名 / 内部 class；Feature 与页面禁止直接 import @heroui/*。',
            },
            {
              id: 'component-contract.public-subpaths.isolation',
              kind: 'semantic',
              description:
                'Variant/size/density/state/slot/composition/context 表达差异；禁止针对 HeroUI 内部 DOM 的修正，也禁止最高优先级覆盖声明。',
            },
          ],
          mutability: 'readonly',
          scope: 'universal',
          capabilities: ['inspect', 'read', 'validate', 'diagnose'],
          preview: { mode: 'static', note: '/ui-elements/* Family 页是公开契约可执行 authority。' },
          evidence: [
            'packages/ui-adapter/package.json',
            'apps/web/e2e/overlays.spec.ts',
            'apps/web/e2e/data-display.spec.ts',
          ],
        },
        {
          nodeId: 'component-contract.async-state',
          title: 'Async State Semantics',
          description:
            'AsyncRegion / StateRegion / BusyIndicator / Skeleton / ReadyImage 等异步状态语义组件（loading/ready/refreshing/background/empty/error）。',
          kind: 'contract',
          valueType:
            'ui-adapter exports（./async-region、./state-surface、./busy-indicator、./skeleton、./ready-image）',
          source: 'packages/ui-adapter/src/async-region.tsx',
          constraints: [
            {
              id: 'component-contract.async-state.readiness',
              kind: 'semantic',
              description:
                'Readiness 单一语义（AsyncRegionPhase）；业务不能建立第二套相反的 Loading 规则；Pending 与 Loading 不得混用。',
            },
          ],
          mutability: 'readonly',
          scope: 'universal',
          capabilities: ['inspect', 'read', 'validate', 'diagnose'],
          evidence: [
            'packages/ui-adapter/src/async-region.tsx',
            'packages/ui-adapter/src/state-surface.tsx',
          ],
        },
      ],
    },
    {
      domainId: 'heroui-isolation',
      title: 'HeroUI Isolation Boundary',
      description:
        'ui-adapter 是唯一允许直接导入 @heroui/* 与 react-aria-components 的边界；底层 vendor 事实不对外暴露。',
      nodes: [
        {
          nodeId: 'heroui-isolation.vendor-boundary',
          title: 'Vendor Import & Style Isolation',
          description:
            'HeroUI / React Aria / @heroui/styles 只允许 ui-adapter import；Web 入口只导入聚合后的 Adapter stylesheet。',
          kind: 'boundary',
          valueType: 'dependency policy + import gate',
          source: 'tooling/dependency-policy.json',
          constraints: [
            {
              id: 'heroui-isolation.vendor-boundary.gate',
              kind: 'semantic',
              description:
                'architecture:check 强制 HeroUI 隔离、原生表单控件禁用、Adapter 内部 Element 样式隔离与颜色 Token 归属。',
            },
          ],
          mutability: 'diagnostic-only',
          scope: 'universal',
          capabilities: ['inspect', 'diagnose'],
          association: {
            contract: 'tooling/dependency-policy.json + check-boundaries（架构门禁）',
            note: '隔离事实由依赖策略与 import gate 承载。',
          },
          consumer: 'architecture:check / foundation:check',
          evidence: ['tooling/dependency-policy.json', 'tooling/check-boundaries.mjs'],
        },
      ],
    },
    {
      domainId: 'overlay',
      title: 'Overlay Contract',
      description:
        'Dialog / Drawer / Popover / Tooltip / Dropdown / Menu / DatePicker / Command 等浮层由 HeroUI Overlay/Focus 管理，ui-adapter 统一封装。',
      nodes: [
        {
          nodeId: 'overlay.semantic-surface',
          title: 'Overlay Surface Semantics',
          description:
            'DialogSurface / DrawerSurface / CommandMenu / overlay-trigger 语义（focus lock、Escape、Portal、trigger 视觉状态）。',
          kind: 'contract',
          valueType:
            'ui-adapter exports（./overlays、./overlay-trigger、./menu-button、./command-menu）',
          source: 'packages/ui-adapter/src/overlays.tsx',
          constraints: [
            {
              id: 'overlay.semantic-surface.heroui',
              kind: 'semantic',
              description:
                'Menu/Popover/Tooltip/DatePicker/Command/Dialog/Drawer 等浮层必须留在 HeroUI Overlay/Focus 管理内；禁止原生 select/option 绕过与第三方 DOM 穿透。',
            },
            {
              id: 'overlay.semantic-surface.trigger',
              kind: 'semantic',
              description: 'Overlay Trigger 只负责打开浮层，交互状态不切换语义色（105 治理结论）。',
            },
          ],
          mutability: 'readonly',
          scope: 'universal',
          capabilities: ['inspect', 'read', 'validate', 'diagnose'],
          preview: { mode: 'static', note: '/ui-elements/overlays 打开态 authority 页。' },
          evidence: ['packages/ui-adapter/src/overlays.tsx', 'apps/web/e2e/overlays.spec.ts'],
        },
      ],
    },
  ],
} as const satisfies GovernanceContribution;
