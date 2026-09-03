export const pluginI18nResources = {
  'zh-CN': {
    translation: {
      foundationsNav: {
        root: '基座能力',
      },
      foundations: {
        eyebrow: 'Architecture map',
        title: '稳定能力向下沉，运行差异留在 Host',
        description: '依赖只能朝向更稳定的契约。目录不是目的，变化传播范围才是设计对象。',
        directUse: 'HeroUI 直接使用范围',
        directUseDescription: '只有 UI Adapter 可以导入 @heroui/*；页面只消费语义化 UI Contract。',
        layers: {
          hosts: 'Runtime Hosts',
          hostsDescription:
            'Web 路由、App Shell、浏览器集成，以及未来 Desktop Runtime 的窗口与原生能力。',
          application: 'Application / Feature',
          applicationDescription: '页面功能、交互编排、View Model 与业务语义组合。',
          adapters: 'Adapters',
          adaptersDescription: 'UI Library、数据源、浏览器与 Desktop 能力的差异吸收层。',
          stable: 'Core · Schema · Types',
          stableDescription: '纯规则、运行时校验与真正跨模块稳定的类型。',
        },
        rulesTitle: '依赖规则',
        rules: {
          first: 'Core 不导入 React、Host 或 Infrastructure。',
          second: 'Host 专属能力不得下沉到共享 Core。',
          third: '页面不穿透 Adapter 修改 HeroUI 内部 DOM。',
          fourth: '局部差异优先使用 Variant 与 Composition。',
        },
      },
    },
  },
  en: {
    translation: {
      foundationsNav: {
        root: 'Foundations',
      },
      foundations: {
        eyebrow: 'Architecture map',
        title: 'Stable capabilities sink; runtime differences stay in hosts',
        description:
          'Dependencies point toward stable contracts. Folders are incidental; change propagation is the design target.',
        directUse: 'Direct HeroUI usage',
        directUseDescription:
          'Only the UI Adapter may import @heroui/*; screens consume semantic UI contracts.',
        layers: {
          hosts: 'Runtime Hosts',
          hostsDescription:
            'Web routing, App Shell, browser integration, and future Desktop windows and native capabilities.',
          application: 'Application / Feature',
          applicationDescription:
            'Screen behavior, interaction orchestration, view models, and product semantics.',
          adapters: 'Adapters',
          adaptersDescription:
            'Absorb differences in UI libraries, data sources, browsers, and Desktop runtimes.',
          stable: 'Core · Schema · Types',
          stableDescription: 'Pure rules, runtime validation, and truly stable cross-module types.',
        },
        rulesTitle: 'Dependency rules',
        rules: {
          first: 'Core never imports React, hosts, or infrastructure.',
          second: 'Host-specific capabilities never leak into shared Core.',
          third: 'Screens never pierce the Adapter to style HeroUI internals.',
          fourth: 'Local differences use variants and composition first.',
        },
      },
    },
  },
} as const;
