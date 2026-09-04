/**
 * surface-foundation —— Governance Contribution（Authority-owned）。
 *
 * 描述 Product Surface Foundation Authority 的机器可读治理 Schema。
 * Surface Foundation 自己拥有 Surface / Elevation、Spatial Rhythm、Density、
 * Page Pattern、Typography Hierarchy 呈现、Product Screen/State Recipe 等
 * 产品能力；具体事实载体是 `src/styles.css` 与各 pattern/component exports
 * （evidence 定位，不复制）。本文件只使用 `@community-go/schemas` 的统一
 * Contract，不引入第二套治理基础设施。
 */

import type { GovernanceContribution } from '@community-go/schemas/governance';

export const governanceContribution = {
  authorityId: 'surface-foundation',
  authorityReference: '@community-go/surface-foundation',
  title: 'Surface Foundation Authority',
  description:
    '拥有当前 Product Surface 的可复用 Layout、Shell 表现、UX Pattern、Page Archetype 与 Screen/State Motion Recipe；具体视觉事实以 styles.css 与 layout/pattern exports 为载体。',
  domains: [
    {
      domainId: 'surface-space',
      title: 'Surface & Spatial Rhythm',
      description:
        'Surface 层间距、Section Gap、Control Gap、Filter/Settings/Detail 布局与 Density 语义。',
      nodes: [
        {
          nodeId: 'surface-space.spatial-rhythm',
          title: 'Spatial Rhythm Token',
          description:
            'Section Gap / Control Gap / Filter min / Sticky top / Detail min / Settings nav 等 Surface Token。',
          kind: 'value',
          valueType: 'CSS custom properties（--surface-*）',
          source: 'packages/surface-foundation/src/styles.css',
          constraints: [
            {
              id: 'surface-space.spatial-rhythm.owner',
              kind: 'semantic',
              description:
                'Surface Token 只服务当前后台产品语义，不进入 Universal Design Token；页面区段间距经 Page/Section 组合产出。',
            },
          ],
          mutability: 'readonly',
          scope: 'surface',
          capabilities: ['inspect', 'read', 'validate', 'diagnose'],
          preview: {
            mode: 'css',
            note: '由 /page-patterns 与 /page-archetypes authority 页呈现。',
          },
          association: {
            contract: '@community-go/surface-foundation（./layout）',
            note: 'Page/Section/Toolbar 是区段空间组合的唯一入口。',
          },
          consumer: 'Page / Section / SplitView / FilterBar 与业务页面',
          evidence: [
            'packages/surface-foundation/src/styles.css',
            'packages/surface-foundation/src/layout.tsx',
          ],
        },
        {
          nodeId: 'surface-space.density',
          title: 'Control / Table Density',
          description:
            'Comfortable / Compact 产品密度语义（真实用户偏好载体：system-tools preferences density）。',
          kind: 'policy',
          valueType: 'Runtime preference（zustand/state-foundation 存储）',
          source: 'surfaces/plugins/system-tools/schemas.ts',
          constraints: [
            {
              id: 'surface-space.density.vocabulary',
              kind: 'enum',
              description:
                '密度取值受控为 comfortable/compact（schemas.ts 定义），是产品偏好字段而非任意尺寸。',
            },
          ],
          mutability: 'user-customizable',
          scope: 'surface',
          capabilities: [
            'inspect',
            'read',
            'validate',
            'diagnose',
            'preview',
            'diff',
            'user-override',
          ],
          preview: { mode: 'runtime', note: '偏好页 ToggleGroup 提供真实 user override 入口。' },
          association: {
            contract: 'system-tools preferences schema（density 字段）',
            note: 'density 事实由 preferences 表单 schema 承载。',
          },
          consumer: '/system-tools/preferences',
          evidence: [
            'surfaces/plugins/system-tools/schemas.ts',
            'surfaces/plugins/system-tools/routes/preferences/page.tsx',
          ],
        },
      ],
    },
    {
      domainId: 'page-pattern',
      title: 'Page Pattern',
      description:
        'Page / PageHeader / Section / Toolbar / FilterBar / SplitView / StickyActions 等页面结构与 Archetype 组合。',
      nodes: [
        {
          nodeId: 'page-pattern.page-layout',
          title: 'Page / PageHeader / Section Contract',
          description:
            '页面顶层结构统一契约：Page 产出统一 section spacing；区段使用 Header/Section/Panel 组合，禁止手写平行页面骨架。',
          kind: 'contract',
          valueType:
            'surface-foundation layout exports（Page/PageHeader/Section/Toolbar/FilterBar/SplitView/StickyActions）',
          source: 'packages/surface-foundation/src/layout.tsx',
          constraints: [
            {
              id: 'page-pattern.page-layout.usage',
              kind: 'semantic',
              description:
                '正常业务/展示页顶层使用 Page；禁止裸 space-y-* + 自绘 header 的整页结构。',
            },
          ],
          mutability: 'readonly',
          scope: 'surface',
          capabilities: ['inspect', 'read', 'validate', 'diagnose'],
          preview: { mode: 'static', note: '/page-patterns 与 /page-archetypes authority 页。' },
          evidence: [
            'packages/surface-foundation/src/layout.tsx',
            'apps/web/e2e/design-contract.spec.ts',
          ],
        },
        {
          nodeId: 'page-pattern.collection-form-actions',
          title: 'Collection / Form Actions / Detail Settings Pattern',
          description:
            'Collection、Detail Settings、Form Actions、States Operations 等业务场景 Pattern。',
          kind: 'contract',
          valueType:
            'surface-foundation exports（./collection、./detail-settings、./form-actions、./states-operations）',
          source: 'packages/surface-foundation/src/collection.tsx',
          constraints: [
            {
              id: 'page-pattern.collection-form-actions.boundary',
              kind: 'semantic',
              description:
                'Feature 仍拥有字段、Schema、数据、权限、i18n 与状态选择；Foundation 不创建万能 CRUD Page。',
            },
          ],
          mutability: 'readonly',
          scope: 'surface',
          capabilities: ['inspect', 'read', 'validate', 'diagnose'],
          evidence: [
            'packages/surface-foundation/src/collection.tsx',
            'packages/surface-foundation/src/detail-settings.tsx',
            'packages/surface-foundation/src/form-actions.tsx',
            'packages/surface-foundation/src/states-operations.tsx',
          ],
        },
      ],
    },
    {
      domainId: 'screen-recipe',
      title: 'Screen & State Recipe',
      description:
        'Route content.enter、方向进入（forward）、State Region 内容切换等产品级 Motion Recipe 绑定。',
      nodes: [
        {
          nodeId: 'screen-recipe.route-enter',
          title: 'Route Content Enter Choreography',
          description:
            'Page 直接区段的 region 级 fade+rise 编排与 forward 右入方向语义（data-route-enter/data-route-kind）。',
          kind: 'policy',
          valueType:
            'CSS recipe（.surface-route-content[data-route-enter] + surface-enter-forward keyframes）',
          source: 'packages/surface-foundation/src/styles.css',
          constraints: [
            {
              id: 'screen-recipe.route-enter.semantic',
              kind: 'semantic',
              description:
                '方向过渡由 data-route-kind + Motion Token 纯 CSS 驱动；禁止依赖 React ViewTransition 组件（stable react 不导出）。',
            },
          ],
          mutability: 'readonly',
          scope: 'surface',
          capabilities: ['inspect', 'read', 'validate', 'diagnose', 'preview'],
          preview: { mode: 'css', note: 'reduced-motion/分类关闭由 Motion Policy 统一降级。' },
          association: {
            contract:
              'design-system motion-primitive.universal-recipe（content-fade-in/content-rise-in）',
            note: 'recipe 数值来自 Universal Token。',
          },
          consumer: 'Host RouteTransition + 全部 Page 页面',
          evidence: [
            'packages/surface-foundation/src/styles.css',
            'apps/web/src/host/route-transition.tsx',
          ],
        },
        {
          nodeId: 'screen-recipe.state-region',
          title: 'State Region Content Transition',
          description: 'StateRegion ready/refreshing/background/partial/readonly 内容进入编排。',
          kind: 'policy',
          valueType: 'CSS recipe（.surface-state-region-content）',
          source: 'packages/surface-foundation/src/styles.css',
          constraints: [
            {
              id: 'screen-recipe.state-region.boundary',
              kind: 'semantic',
              description:
                'UI 呈现态（StateRegion/AsyncRegion）与 state-foundation Store 机制职责分离。',
            },
          ],
          mutability: 'readonly',
          scope: 'surface',
          capabilities: ['inspect', 'read', 'validate', 'diagnose'],
          evidence: ['packages/surface-foundation/src/styles.css'],
        },
      ],
    },
  ],
} as const satisfies GovernanceContribution;
