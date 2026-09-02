// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import {
  AdminPluginNavigationProvider,
  AdminRouteLink,
  route,
  useAdminNavigation,
  type AdminPluginNavigationPort,
} from './plugin';

function createPort(overrides: Partial<AdminPluginNavigationPort> = {}): AdminPluginNavigationPort {
  const navigate = vi.fn();
  const replace = vi.fn();
  return {
    resolveHref: (target) => `/resolved/${target.routeId}`,
    navigate,
    replace,
    renderLink: ({ href, children, className, ariaLabel, title, onNavigate }) => (
      <a
        aria-label={ariaLabel}
        className={className}
        href={href}
        onClick={(event) => {
          event.preventDefault();
          onNavigate?.();
        }}
        title={title}
      >
        {children}
      </a>
    ),
    ...overrides,
  };
}

function NavigationProbe() {
  const { navigate, replace, href } = useAdminNavigation();
  return (
    <>
      <span data-testid="href">{href(route('reference-resources.detail', { id: 'a' }))}</span>
      <button
        onClick={() => navigate(route('reference-resources.detail', { id: 'a' }))}
        type="button"
      >
        navigate
      </button>
      <button
        onClick={() => replace(route('reference-resources.detail', { id: 'a' }))}
        type="button"
      >
        replace
      </button>
    </>
  );
}

describe('Admin Framework plugin API', () => {
  it('route() 创建 symbolic target', () => {
    expect(route('reference-resources.detail', { id: 'x' })).toEqual({
      routeId: 'reference-resources.detail',
      params: { id: 'x' },
    });
  });

  it('AdminRouteLink 委托 Host Navigation Port 渲染真实链接', () => {
    const port = createPort();
    render(
      <AdminPluginNavigationProvider port={port}>
        <AdminRouteLink target={route('reference-resources.detail', { id: 'a' })}>
          detail
        </AdminRouteLink>
      </AdminPluginNavigationProvider>,
    );
    const link = screen.getByRole('link', { name: 'detail' });
    expect(link.getAttribute('href')).toBe('/resolved/reference-resources.detail');
  });

  it('useAdminNavigation 的 navigate/replace 委托 Host Navigation Port', () => {
    const port = createPort();
    render(
      <AdminPluginNavigationProvider port={port}>
        <NavigationProbe />
      </AdminPluginNavigationProvider>,
    );
    expect(screen.getByTestId('href').textContent).toBe('/resolved/reference-resources.detail');

    screen.getByRole('button', { name: 'navigate' }).click();
    expect(port.navigate).toHaveBeenCalledWith('/resolved/reference-resources.detail');
    expect(port.replace).not.toHaveBeenCalled();

    screen.getByRole('button', { name: 'replace' }).click();
    expect(port.replace).toHaveBeenCalledWith('/resolved/reference-resources.detail');
  });

  it('缺少 Provider 时抛出明确错误', () => {
    expect(() =>
      render(
        <AdminRouteLink target={route('reference-resources.detail', { id: 'a' })}>
          detail
        </AdminRouteLink>,
      ),
    ).toThrow(/AdminPluginNavigationProvider 未安装/);
  });
});
