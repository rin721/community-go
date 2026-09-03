/**
 * Admin Surface —— Surface 级界面文案。
 *
 * Plugin 自己的文案留在各自 i18n 模块；此处放 Admin Surface 层面文案：
 * - adminGroups.*：plugins 范围公共 Group Alias（navigation-groups.ts）的 labelKey
 *   翻译（Group Alias 属 Surface 治理的公共 IA，非单 Plugin 私有文案）。
 * 由 Composition pipeline 与 Plugin i18n 一起聚合进 Host 运行时。
 */

export const surfaceShellI18nResources = {
  'zh-CN': {
    translation: {
      adminGroups: {
        system: '系统',
        reference: '参考资源',
        development: '开发',
      },
    },
  },
  en: {
    translation: {
      adminGroups: {
        system: 'System',
        reference: 'Reference',
        development: 'Development',
      },
    },
  },
} as const;
