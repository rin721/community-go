// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import {
  PluginNavigationProvider,
  RouteLink,
  route,
  usePluginNavigation,
  type PluginNavigationPort,
} from './plugin';

function createPort(overrides: Partial<PluginNavigationPort> = {}): PluginNavigationPort {
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
  const { navigate, replace, href } = usePluginNavigation();
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

describe('Plugin Framework plugin API', () => {
  it('route() 创建 symbolic target', () => {
    expect(route('reference-resources.detail', { id: 'x' })).toEqual({
      routeId: 'reference-resources.detail',
      params: { id: 'x' },
    });
  });

  it('RouteLink 委托 Host Navigation Port 渲染真实链接', () => {
    const port = createPort();
    render(
      <PluginNavigationProvider port={port}>
        <RouteLink target={route('reference-resources.detail', { id: 'a' })}>detail</RouteLink>
      </PluginNavigationProvider>,
    );
    const link = screen.getByRole('link', { name: 'detail' });
    expect(link.getAttribute('href')).toBe('/resolved/reference-resources.detail');
  });

  it('usePluginNavigation 的 navigate/replace 委托 Host Navigation Port', () => {
    const port = createPort();
    render(
      <PluginNavigationProvider port={port}>
        <NavigationProbe />
      </PluginNavigationProvider>,
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
        <RouteLink target={route('reference-resources.detail', { id: 'a' })}>detail</RouteLink>,
      ),
    ).toThrow(/PluginNavigationProvider 未安装/);
  });
});
