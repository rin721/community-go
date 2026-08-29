export type AppLocale = 'zh-CN' | 'en';

export type RuntimeHost = 'web' | 'desktop';

export type ProductState =
  | 'loading'
  | 'empty'
  | 'error'
  | 'success'
  | 'warning'
  | 'disabled'
  | 'pending'
  | 'offline'
  | 'permission-denied';

export type NavigationItem = Readonly<{
  id: string;
  labelKey: string;
  href: string;
  group: 'workspace' | 'system';
}>;

export type CapabilityStatus = 'ready' | 'in-progress' | 'planned';

export type FoundationCapability = Readonly<{
  id: string;
  nameKey: string;
  descriptionKey: string;
  status: CapabilityStatus;
  progressPercent: number;
}>;
