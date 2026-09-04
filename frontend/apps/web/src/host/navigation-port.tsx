'use client';

import type { ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  PluginNavigationProvider,
  type PluginPortLinkProps,
} from '@community-go/plugin-framework/plugin';

import { markForwardRouteIntent, pageTransitionTypes } from './route-transition-constants';
import { shouldProceedWithNavigation } from './navigation-lifecycle';

/**
 * Host Navigation Port —— 唯一的 Router 接入点。
 *
 * 由 Composition Root 一次性安装；Plugin 通过 usePluginNavigation/RouteLink
 * 间接导航，绝不直接使用 Next Link/Router 或全局 location。
 * resolveHref 使用真实 Registry（由 AppShell 以 targetResolver 注入）——本模块
 * 只接收已解析的 href 委托 Next router。
 */

export type HostNavigationPortProps = Readonly<{
  /** 把 routeId 解析为 href；抛错保持失败语义。 */
  resolveHref: (
    target: Readonly<{ routeId: string; params: Readonly<Record<string, string>> }>,
  ) => string;
  children: ReactNode;
}>;

export function HostNavigationPortProvider({ resolveHref, children }: HostNavigationPortProps) {
  const router = useRouter();

  const renderLink = (props: PluginPortLinkProps) => (
    <Link
      className={props.className}
      href={props.href}
      transitionTypes={[pageTransitionTypes.forward]}
      {...(props.ariaLabel ? { 'aria-label': props.ariaLabel } : {})}
      {...(props.title ? { title: props.title } : {})}
      onClick={(event) => {
        // no-op 短路：目标与当前 resolved location 等价时不导航、不启动 Progress。
        const proceed = shouldProceedWithNavigation(props.href, 'plugin navigation');
        if (props.onNavigate) queueMicrotask(props.onNavigate);
        if (!proceed) {
          event.preventDefault();
          return;
        }
        markForwardRouteIntent();
      }}
    >
      {props.children}
    </Link>
  );

  return (
    <PluginNavigationProvider
      port={{
        resolveHref: (target) => resolveHref(target),
        navigate: (href) => {
          if (!shouldProceedWithNavigation(href, 'plugin navigation')) return;
          markForwardRouteIntent();
          void router.push(href, { transitionTypes: [pageTransitionTypes.forward] });
        },
        replace: (href) => {
          if (!shouldProceedWithNavigation(href, 'plugin navigation')) return;
          markForwardRouteIntent();
          void router.replace(href, { transitionTypes: [pageTransitionTypes.forward] });
        },
        renderLink,
      }}
    >
      {children}
    </PluginNavigationProvider>
  );
}
