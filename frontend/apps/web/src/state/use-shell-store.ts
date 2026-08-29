import type { AppLocale } from '@community-go/types';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type ThemeMode = 'light' | 'dark';

type ShellState = {
  theme: ThemeMode;
  locale: AppLocale;
  mobileNavigationOpen: boolean;
  setTheme: (theme: ThemeMode) => void;
  setLocale: (locale: AppLocale) => void;
  setMobileNavigationOpen: (open: boolean) => void;
};

export const useShellStore = create<ShellState>()(
  persist(
    (set) => ({
      theme: 'light',
      locale: 'zh-CN',
      mobileNavigationOpen: false,
      setTheme: (theme) => set({ theme }),
      setLocale: (locale) => set({ locale }),
      setMobileNavigationOpen: (mobileNavigationOpen) => set({ mobileNavigationOpen }),
    }),
    {
      name: 'community-go.shell',
      partialize: ({ theme, locale }) => ({ theme, locale }),
    },
  ),
);
