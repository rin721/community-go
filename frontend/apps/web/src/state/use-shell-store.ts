import type { AppLocale } from '@community-go/types';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type ThemeMode = 'light' | 'dark';

type ShellState = {
  theme: ThemeMode;
  locale: AppLocale;
  mobileNavigationOpen: boolean;
  sidebarCollapsed: boolean;
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
      mobileNavigationOpen: false,
      sidebarCollapsed: false,
      setTheme: (theme) => set({ theme }),
      setLocale: (locale) => set({ locale }),
      setMobileNavigationOpen: (mobileNavigationOpen) => set({ mobileNavigationOpen }),
      setSidebarCollapsed: (sidebarCollapsed) => set({ sidebarCollapsed }),
    }),
    {
      name: 'community-go.shell',
      partialize: ({ theme, locale, sidebarCollapsed }) => ({ theme, locale, sidebarCollapsed }),
    },
  ),
);
