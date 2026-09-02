'use client';

import type { ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  AdminPluginNavigationProvider,
  type AdminPluginPortLinkProps,
} from '@community-go/admin-framework/plugin';

import { markForwardRouteIntent, pageTransitionTypes } from './route-transition-constants';
import { beginNavigation } from './navigation-progress';

/**
 * Host Navigation Port —— 唯一的 Router 接入点。
 *
 * 由 Composition Root 一次性安装；Plugin 通过 useAdminNavigation/AdminRouteLink
 * 间接导航，绝不直接使用 Next Link/Router 或全局 location。
 * resolveHref 使用真实 Registry（由 AppShell 以 targetResolver 注入）——本模块
 * 只接收已解析的 href 委托 Next router。
 */

export type AdminHostNavigationPortProps = Readonly<{
  /** 把 routeId 解析为 href；抛错保持失败语义。 */
  resolveHref: (
    target: Readonly<{ routeId: string; params: Readonly<Record<string, string>> }>,
  ) => string;
  children: ReactNode;
}>;

export function AdminHostNavigationPortProvider({
  resolveHref,
  children,
}: AdminHostNavigationPortProps) {
  const router = useRouter();

  const renderLink = (props: AdminPluginPortLinkProps) => (
    <Link
      className={props.className}
      href={props.href}
      transitionTypes={[pageTransitionTypes.forward]}
      {...(props.ariaLabel ? { 'aria-label': props.ariaLabel } : {})}
      {...(props.title ? { title: props.title } : {})}
      onClick={() => {
        markForwardRouteIntent();
        beginNavigation('plugin navigation');
        if (props.onNavigate) queueMicrotask(props.onNavigate);
      }}
    >
      {props.children}
    </Link>
  );

  return (
    <AdminPluginNavigationProvider
      port={{
        resolveHref: (target) => resolveHref(target),
        navigate: (href) => {
          markForwardRouteIntent();
          beginNavigation('plugin navigation');
          void router.push(href, { transitionTypes: [pageTransitionTypes.forward] });
        },
        replace: (href) => {
          markForwardRouteIntent();
          beginNavigation('plugin navigation');
          void router.replace(href, { transitionTypes: [pageTransitionTypes.forward] });
        },
        renderLink,
      }}
    >
      {children}
    </AdminPluginNavigationProvider>
  );
}
