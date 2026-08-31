import { createFrontendI18n } from '@community-go/i18n';

import { resources } from './resources';

export type AdminLocale = 'zh-CN' | 'en';

export const adminI18n = createFrontendI18n({
  resources,
  defaultLocale: 'zh-CN',
  supportedLocales: ['zh-CN', 'en'],
});
