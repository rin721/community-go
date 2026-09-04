export const pluginI18nResources = {
  'zh-CN': {
    translation: {
      systemTools: {
        nav: {
          root: '系统工具',
          icons: 'Icon 大全',
          preferences: '偏好设置',
        },
        icons: {
          title: 'Icon 大全',
          description:
            '遍历 Product Surface 受控语义 icon vocabulary，确认每个 iconId 的展示形态。',
        },
        preferences: {
          eyebrow: '系统工具',
          title: '偏好设置',
          description: '这些设置只影响当前设备，不会写入旧系统或后端。',
          saved: '偏好已保存到当前设备',
          name: '界面名称',
          nameHint: '用于 Host Shell 的产品识别，长度为 2 至 40 个字符。',
          nameError: '请输入 2 至 40 个字符。',
          locale: '语言',
          localeHint: '所有用户可见文本与格式规则由 i18n 统一处理。',
          density: '信息密度',
          densityHint: '密度改变空间节奏，不改变业务语义。',
          comfortable: '舒适',
          compact: '紧凑',
          reduceMotion: '减少动效',
          reduceMotionDescription: '降低页面切换和反馈动画，保留必要状态变化。',
          save: '保存偏好',
        },
      },
    },
  },
  en: {
    translation: {
      systemTools: {
        nav: {
          root: 'System Tools',
          icons: 'Icon Gallery',
          preferences: 'Preferences',
        },
        icons: {
          title: 'Icon Gallery',
          description:
            'Iterates the Product Surface controlled semantic icon vocabulary and shows each iconId presentation.',
        },
        preferences: {
          eyebrow: 'System Tools',
          title: 'Preferences',
          description:
            'These settings affect this device only and do not write to legacy systems or a backend.',
          saved: 'Preferences saved on this device',
          name: 'Interface name',
          nameHint: 'Used for Host Shell identity; enter 2 to 40 characters.',
          nameError: 'Enter between 2 and 40 characters.',
          locale: 'Language',
          localeHint: 'i18n owns all user-facing text and formatting behavior.',
          density: 'Information density',
          densityHint: 'Density changes spatial rhythm without changing business semantics.',
          comfortable: 'Comfortable',
          compact: 'Compact',
          reduceMotion: 'Reduce motion',
          reduceMotionDescription:
            'Reduce route and feedback animation while preserving necessary state changes.',
          save: 'Save preferences',
        },
      },
    },
  },
} as const;
