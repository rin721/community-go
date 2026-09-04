/**
 * design-system —— Governance Contribution（Authority-owned）。
 *
 * 本文件描述 Design System Authority 的机器可读治理 Schema：Authority identity、
 * Governance Domain / Node、Mutability / Scope、supported capabilities 与
 * evidence 关联。它**不拥有也不复制**具体设计事实：
 * Semantic Color、Radius、Border、Shadow、Typography、Motion 等真实 Token 值
 * 仍由 `src/tokens.css` / `src/motion.css` 自己拥有（evidence 定位，不复制）。
 *
 * 本文件只使用 `@community-go/schemas` 的统一 Contract 描述，不引入第二套
 * Governance 基础设施。
 */

import type { GovernanceContribution } from '@community-go/schemas/governance';

export const governanceContribution = {
  authorityId: 'design-system',
  authorityReference: '@community-go/design-system',
  title: 'Design System Authority',
  description:
    '拥有 Product Visual Language、Design Token、Semantic Color、Radius、Border、Shadow、Spacing、Motion 数值与 Universal Recipe 等设计事实；具体值以 tokens.css / motion.css 为唯一事实载体。',
  domains: [
    {
      domainId: 'visual-language',
      title: 'Product Visual Language',
      description:
        '产品 IP 与整体视觉气质：Accent / Neutral / Surface Contrast / Radius Personality / Shadow Softness / Typography Density / Icon Treatment 等。',
      nodes: [
        {
          nodeId: 'visual-language.semantic-color',
          title: 'Semantic Color Roles',
          description:
            'Accent / Primary / Surface / Text / Border / Success / Warning / Danger / Info / Selected / Focus 与派生强度（-soft / -strong / on-*）语义角色。',
          kind: 'value',
          valueType: 'CSS custom properties（--ds-* / @theme --color-*）',
          source: 'packages/design-system/src/token-source/semantic-colors.ts',
          constraints: [
            {
              id: 'visual-language.semantic-color.owner',
              kind: 'semantic',
              description:
                '颜色事实只能由 Design System Token Source 定义（semantic-colors.ts）；tokens.css 是 Generated Artifact，禁止人工维护。页面与 Feature 使用语义 class，禁止任意 hex/rgb 硬编码。',
            },
            {
              id: 'visual-language.semantic-color.roles',
              kind: 'enum',
              description:
                '语义角色集合（accent/success/warning/danger/info/surface/ink/border/focus 等）为受控词汇，扩展属 Design System 治理变更（改 Token Source 并重新生成）。',
            },
          ],
          mutability: 'fixed',
          scope: 'universal',
          capabilities: ['inspect', 'read', 'validate', 'diagnose'],
          preview: {
            mode: 'css',
            note: '语义 Token 由 Light/Dark 主题 CSS 变量呈现（tokens.css 生成物），无独立预览入口。',
          },
          association: {
            contract: '@community-go/design-system（Token Source → tokens.css）',
            note: 'Token Source 是唯一 Source of Truth；tokens.css 由 token-codegen 生成。',
          },
          consumer: '全部页面与公共组件（经语义 class 消费）',
          evidence: [
            'packages/design-system/src/token-source/semantic-colors.ts',
            'packages/design-system/src/token-source/token-source.schema.ts',
            'tooling/token-codegen/codegen.mjs',
          ],
        },
        {
          nodeId: 'visual-language.radius-border',
          title: 'Radius / Border Personality',
          description:
            '控件 / 面板 / Shell 的语义圆角与 Border 语义（control / panel / shell 与 border / border-strong）。',
          kind: 'value',
          valueType: 'CSS custom properties（--radius-* / --color-border*）',
          source: 'packages/design-system/src/token-source/theme-scale.ts',
          constraints: [
            {
              id: 'visual-language.radius-border.semantic',
              kind: 'semantic',
              description:
                '同一组件类别不因页面不同而圆角漂移；禁止 rounded-[..] arbitrary value；圆角值修改走 Token Source 并重新生成。',
            },
          ],
          mutability: 'fixed',
          scope: 'universal',
          capabilities: ['inspect', 'read', 'validate', 'diagnose'],
          evidence: ['packages/design-system/src/token-source/theme-scale.ts'],
        },
        {
          nodeId: 'visual-language.shadow-elevation',
          title: 'Shadow / Elevation',
          description: '浮层与真实脱离页面平面层级的面板阴影（panel / overlay）。',
          kind: 'value',
          valueType: 'CSS custom properties（--shadow-*）',
          source: 'packages/design-system/src/token-source/theme-scale.ts',
          constraints: [
            {
              id: 'visual-language.shadow-elevation.usage',
              kind: 'semantic',
              description:
                'shadow 只用于真实脱离页面平面的层级；普通页面容器不因嵌套加 shadow，禁止 Card 套 Card 制造层次。',
            },
          ],
          mutability: 'fixed',
          scope: 'universal',
          capabilities: ['inspect', 'read', 'validate', 'diagnose'],
          evidence: ['packages/design-system/src/token-source/theme-scale.ts'],
        },
        {
          nodeId: 'visual-language.typography-scale',
          title: 'Typography Scale Token',
          description:
            '基础字体族与排版语义 Token（--font-sans 等）；排版层级由 Surface Foundation Typography Hierarchy 消费。',
          kind: 'value',
          valueType: 'CSS custom properties（--font-*）',
          source: 'packages/design-system/src/token-source/theme-scale.ts',
          constraints: [
            {
              id: 'visual-language.typography-scale.owner',
              kind: 'semantic',
              description:
                '字体族与基础字号 Token 属 Design System；标题层级组件由 Surface/UI 层拥有，不跨页面自定标题字号。',
            },
          ],
          mutability: 'fixed',
          scope: 'universal',
          capabilities: ['inspect', 'read', 'validate', 'diagnose'],
          evidence: ['packages/design-system/src/token-source/theme-scale.ts'],
        },
        {
          nodeId: 'visual-language.spacing-sizing',
          title: 'Spacing / Sizing / Control Density Token',
          description: '控件高度、图标尺寸、focus ring、z-index 等基础空间与尺寸 Token。',
          kind: 'value',
          valueType: 'CSS custom properties（--spacing-* / --z-index-*）',
          source: 'packages/design-system/src/token-source/theme-scale.ts',
          constraints: [
            {
              id: 'visual-language.spacing-sizing.semantic',
              kind: 'semantic',
              description: '真实多消费者且稳定语义的值才提升为 Token；禁止 Token Explosion。',
            },
          ],
          mutability: 'fixed',
          scope: 'universal',
          capabilities: ['inspect', 'read', 'validate', 'diagnose'],
          evidence: ['packages/design-system/src/token-source/theme-scale.ts'],
        },
      ],
    },
    {
      domainId: 'motion-primitive',
      title: 'Motion Primitive',
      description:
        'Duration / Easing / Distance 基础档位、用途语义档位与 Universal Recipe（content.enter / content.swap / viewport.reveal / feedback / media.ready / progress）。',
      nodes: [
        {
          nodeId: 'motion-primitive.duration-easing-distance',
          title: 'Motion Duration / Easing / Distance',
          description:
            '基础档位（fast/standard/slow）、用途语义（control/feedback/page）、缓动与位移距离 Token。',
          kind: 'value',
          valueType:
            'CSS custom properties（--motion-duration-* / --ease-product / --motion-distance-*）',
          source: 'packages/design-system/src/token-source/motion.ts',
          constraints: [
            {
              id: 'motion-primitive.duration-easing-distance.usage',
              kind: 'semantic',
              description:
                '业务代码使用用途语义 Token（duration-* utility / --motion-*），不直接书写动画时长或缓动曲线；motion 档位修改走 Token Source 并重新生成。',
            },
          ],
          mutability: 'runtime-policy',
          scope: 'universal',
          capabilities: ['inspect', 'read', 'validate', 'diagnose', 'preview', 'dev-override'],
          preview: {
            mode: 'runtime',
            note: 'development Motion Policy（Host）可调 debug scale 与分类开关；production 固定 System。',
          },
          association: {
            contract: 'Host MotionPolicyProvider（motion-policy 所有权在 apps/web）',
            note: '数值权威在 motion.ts Token Source；debug 倍率由 Host Policy 承载。',
          },
          consumer: 'surface-foundation recipe / ui-adapter 语义组件 / Host Top Progress',
          evidence: [
            'packages/design-system/src/token-source/motion.ts',
            'apps/web/src/host/motion-policy.tsx',
          ],
        },
        {
          nodeId: 'motion-primitive.universal-recipe',
          title: 'Universal Motion Recipe',
          description:
            '跨 Product Surface 的基础关键帧 recipe（content-fade-in/content-rise-in/feedback-exit/media-ready/progress-*）。',
          kind: 'policy',
          valueType: 'CSS @keyframes + recipe 登记（motion.css）',
          source: 'packages/design-system/src/motion.css',
          constraints: [
            {
              id: 'motion-primitive.universal-recipe.authority',
              kind: 'semantic',
              description:
                'motion.css 是 Universal recipe 单一登记文件；权威文件之外禁止声明 @keyframes。',
            },
          ],
          mutability: 'fixed',
          scope: 'universal',
          capabilities: ['inspect', 'read', 'validate', 'diagnose'],
          preview: { mode: 'css', note: 'reduced-motion 由 tokens.css 全局 policy 统一处理。' },
          evidence: ['packages/design-system/src/motion.css'],
        },
      ],
    },
  ],
} as const satisfies GovernanceContribution;
