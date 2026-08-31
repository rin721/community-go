'use client';

import { FeedbackProvider } from '@community-go/ui-adapter/feedback-provider';
import { useEffect, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

import '../i18n/i18n';
import { i18n } from '../i18n/i18n';
import { useShellStore } from '../state/use-shell-store';

export function AppProviders({ children }: { children: ReactNode }) {
  const { t } = useTranslation();
  const theme = useShellStore((state) => state.theme);
  const locale = useShellStore((state) => state.locale);
  const hasHydrated = useShellStore((state) => state.hasHydrated);

  useEffect(() => {
    void useShellStore.persist.rehydrate();
  }, []);

  useEffect(() => {
    if (!hasHydrated) return;
    let firstFrame = 0;
    let stableFrame = 0;
    let cancelled = false;
    const html = document.documentElement;

    html.dataset.theme = theme;
    html.lang = locale;
    delete html.dataset.hydrated;
    void i18n.changeLanguage(locale).then(() => {
      if (cancelled) return;
      firstFrame = requestAnimationFrame(() => {
        stableFrame = requestAnimationFrame(() => {
          if (!cancelled) html.dataset.hydrated = 'true';
        });
      });
    });

    return () => {
      cancelled = true;
      cancelAnimationFrame(firstFrame);
      cancelAnimationFrame(stableFrame);
    };
  }, [hasHydrated, locale, theme]);

  return <FeedbackProvider closeLabel={t('common.close')}>{children}</FeedbackProvider>;
}
