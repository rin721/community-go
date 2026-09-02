export const pluginI18nResources = {
  'zh-CN': {
    translation: {
      referenceResources: {
        nav: {
          list: '参考资源',
        },
        list: {
          title: '参考资源',
          description: '通过 File Route 与 Route Target 驱动的确定性参考资源列表。',
          create: '新建资源',
          empty: '暂无参考资源',
          name: '名称',
          kind: '类型',
          status: '状态',
          actions: '操作',
          edit: '编辑',
          detail: '查看',
        },
        create: {
          title: '创建参考资源',
          description: '使用 route() 与 AdminRouteLink 引用应用 Route，不手写 URL。',
          submit: '创建',
          cancel: '取消',
          back: '返回列表',
        },
        detail: {
          title: '参考资源详情',
          description: '详情页从 canonical hierarchy 自动继承列表导航。',
          edit: '编辑此资源',
          back: '返回列表',
        },
        edit: {
          title: '编辑参考资源',
          description: 'edit 的 canonical hierarchy 为 list → detail → edit。',
          submit: '保存',
          cancel: '取消',
          back: '返回详情',
        },
        common: {
          name: '名称',
          kind: '类型',
          statusLabel: '状态',
          sample: '确定性示例',
          guide: '引导指南',
          template: '模板',
          status: {
            active: '进行中',
            draft: '草稿',
          },
        },
      },
    },
  },
  en: {
    translation: {
      referenceResources: {
        nav: {
          list: 'Reference Resources',
        },
        list: {
          title: 'Reference Resources',
          description:
            'Deterministic reference resource list driven by file routes and route targets.',
          create: 'New resource',
          empty: 'No reference resources',
          name: 'Name',
          kind: 'Kind',
          status: 'Status',
          actions: 'Actions',
          edit: 'Edit',
          detail: 'View',
        },
        create: {
          title: 'Create Reference Resource',
          description:
            'Reference application routes with route() and AdminRouteLink, never handwritten URLs.',
          submit: 'Create',
          cancel: 'Cancel',
          back: 'Back to list',
        },
        detail: {
          title: 'Reference Resource Detail',
          description:
            'Detail inherits the list navigation automatically through the canonical hierarchy.',
          edit: 'Edit this resource',
          back: 'Back to list',
        },
        edit: {
          title: 'Edit Reference Resource',
          description: 'The canonical hierarchy of edit is list → detail → edit.',
          submit: 'Save',
          cancel: 'Cancel',
          back: 'Back to detail',
        },
        common: {
          name: 'Name',
          kind: 'Kind',
          statusLabel: 'Status',
          sample: 'Deterministic sample',
          guide: 'Guide',
          template: 'Template',
          status: {
            active: 'Active',
            draft: 'Draft',
          },
        },
      },
    },
  },
} as const;
