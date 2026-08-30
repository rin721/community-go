import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { FeedbackProvider } from '@community-go/ui-adapter';
import { useEffect, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

import { i18n } from '../i18n/i18n';
import { useShellStore } from '../state/use-shell-store';

export function AppProviders({ children }: { children: ReactNode }) {
  const { t } = useTranslation();
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { staleTime: 30_000, retry: 1, refetchOnWindowFocus: false },
        },
      }),
  );
  const theme = useShellStore((state) => state.theme);
  const locale = useShellStore((state) => state.locale);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  useEffect(() => {
    document.documentElement.lang = locale;
    void i18n.changeLanguage(locale);
  }, [locale]);

  return (
    <QueryClientProvider client={queryClient}>
      <FeedbackProvider closeLabel={t('common.close')}>{children}</FeedbackProvider>
    </QueryClientProvider>
  );
}
