import type { AdminLocale as AppLocale } from '../i18n/i18n';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

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

export const useShellStore = create<ShellState>()(
  persist(
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
      skipHydration: true,
      partialize: ({ theme, locale, sidebarCollapsed }) => ({ theme, locale, sidebarCollapsed }),
      onRehydrateStorage: () => (state) => state?.setHasHydrated(true),
    },
  ),
);
