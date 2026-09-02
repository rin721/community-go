/**
 * Admin Surface —— Surface 级界面文案（taxonomy 分组标签等）。
 *
 * Plugin 自己的文案留在各自 i18n 模块；此处只放 Admin Surface 层面的分组/分类文案，
 * 由 Composition pipeline 与 Plugin i18n 一起聚合进 Host 运行时。
 */

export const surfaceShellI18nResources = {
  'zh-CN': {
    translation: {
      adminShell: {
        referenceGroup: '参考资源',
      },
    },
  },
  en: {
    translation: {
      adminShell: {
        referenceGroup: 'Reference Resources',
      },
    },
  },
} as const;
