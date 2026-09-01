'use client';

import { FeedbackProvider } from '@community-go/ui-adapter/feedback-provider';
import { FrontendI18nProvider, useFrontendTranslation } from '@community-go/i18n';
import { useEffect, type ReactNode } from 'react';

import { adminI18n } from '../i18n/i18n';
import { useShellStore } from '../state/use-shell-store';
import { AppLoadingSurface } from './app-loading-surface';
import { GlobalProgressProvider } from './global-progress-provider';
import { MotionPolicyProvider } from './motion-policy';
import { ViewportRevealProvider } from './viewport-reveal';

function AdminRuntimeProviders({ children }: Readonly<{ children: ReactNode }>) {
  const { t } = useFrontendTranslation();
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
    void adminI18n.changeLocale(locale).then(() => {
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

  if (!hasHydrated) {
    return <AppLoadingSurface label="正在加载应用 / Loading application" />;
  }

  return <FeedbackProvider closeLabel={t('common.close')}>{children}</FeedbackProvider>;
}

export function AppProviders({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <FrontendI18nProvider runtime={adminI18n}>
      <MotionPolicyProvider>
        <ViewportRevealProvider>
          <GlobalProgressProvider>
            <AdminRuntimeProviders>{children}</AdminRuntimeProviders>
          </GlobalProgressProvider>
        </ViewportRevealProvider>
      </MotionPolicyProvider>
    </FrontendI18nProvider>
  );
}
