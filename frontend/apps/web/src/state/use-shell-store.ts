import type { SupportedLocale as AppLocale } from '../i18n/i18n';
import { createPersistStore, createLocalStorage } from '@community-go/state-foundation';

type ThemeMode = 'light' | 'dark';

type ShellState = {
  theme: ThemeMode;
  locale: AppLocale;
  hasHydrated: boolean;
  mobileNavigationOpen: boolean;
  sidebarCollapsed: boolean;
  setHasHydrated: (hydrated: boolean) => void;
  setTheme: (theme: ThemeMode) => void;
  setLocale: (locale: AppLocale) => void;
  setMobileNavigationOpen: (open: boolean) => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
};

type ShellPersisted = Pick<ShellState, 'theme' | 'locale' | 'sidebarCollapsed'>;

/**
 * Shell Store（Host 拥有）—— 经 state-foundation 契约创建。
 *
 * - storage key 保持历史 community-go.shell（namespace 兼容，老 preference 不丢）；
 * - partialize 白名单：只持久化 theme/locale/sidebarCollapsed（显式 durable preference）；
 * - skipHydration + hasHydrated 门控语义与迁移前一致（AppLoadingSurface 依赖）。
 */
export const useShellStore = createPersistStore<ShellState, ShellPersisted>(
  (set) => ({
    theme: 'light',
    locale: 'zh-CN',
    hasHydrated: false,
    mobileNavigationOpen: false,
    sidebarCollapsed: false,
    setHasHydrated: (hasHydrated) => set({ hasHydrated }),
    setTheme: (theme) => set({ theme }),
    setLocale: (locale) => set({ locale }),
    setMobileNavigationOpen: (mobileNavigationOpen) => set({ mobileNavigationOpen }),
    setSidebarCollapsed: (sidebarCollapsed) => set({ sidebarCollapsed }),
  }),
  {
    name: 'community-go.shell',
    // version 0 = 历史默认（迁移前 persist 未设 version，等价 0）；数据无版本演进。
    // 未来破坏性变更升 version 并提供 migrate。
    version: 0,
    skipHydration: true,
    storage: createLocalStorage(),
    partialize: ({ theme, locale, sidebarCollapsed }) => ({ theme, locale, sidebarCollapsed }),
    // 保持迁移前语义：hydration 完成后标记 hasHydrated（供 RuntimeProviders 门控）。
    onRehydrateStorage: () => (state) => {
      state?.setHasHydrated(true);
    },
  },
);
