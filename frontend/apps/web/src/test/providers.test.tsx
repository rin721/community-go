import { render, screen, waitFor } from '@testing-library/react';
import { renderToString } from 'react-dom/server';
import { useFrontendTranslation } from '@community-go/i18n';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { AppProviders } from '../host/providers';
import { appI18n } from '../i18n/i18n';
import { useShellStore } from '../state/use-shell-store';

function LocaleProbe() {
  const { locale } = useFrontendTranslation();
  return <p>{locale}</p>;
}

describe('AppProviders hydration', () => {
  beforeEach(async () => {
    localStorage.clear();
    useShellStore.setState({
      theme: 'light',
      locale: 'zh-CN',
      hasHydrated: false,
      mobileNavigationOpen: false,
      sidebarCollapsed: false,
    });
    await appI18n.changeLocale('zh-CN');
    document.documentElement.lang = 'zh-CN';
    document.documentElement.dataset.theme = 'light';
    delete document.documentElement.dataset.hydrated;
  });

  afterEach(async () => {
    await appI18n.changeLocale('zh-CN');
  });

  it('首次 hydration 保持服务端默认值，再恢复持久化偏好', async () => {
    const element = (
      <AppProviders>
        <LocaleProbe />
      </AppProviders>
    );
    const container = document.createElement('div');
    container.innerHTML = renderToString(element);
    document.body.append(container);
    expect(container).toHaveTextContent('正在加载应用 / Loading application');
    localStorage.setItem(
      'community-go.shell',
      JSON.stringify({
        state: { theme: 'dark', locale: 'en', sidebarCollapsed: true },
        version: 0,
      }),
    );
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    render(element, { container, hydrate: true });

    await waitFor(() => expect(document.documentElement).toHaveAttribute('data-hydrated', 'true'));
    expect(document.documentElement).toHaveAttribute('lang', 'en');
    expect(document.documentElement).toHaveAttribute('data-theme', 'dark');
    expect(screen.getByText('en')).toBeVisible();
    expect(useShellStore.getState().sidebarCollapsed).toBe(true);
    expect(consoleError).not.toHaveBeenCalled();
    consoleError.mockRestore();
  });
});
