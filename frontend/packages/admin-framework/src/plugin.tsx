/**
 * Admin Framework —— Plugin API（Client 侧）。
 *
 * `@community-go/admin-framework/plugin` 是 Plugin 消费导航/Locale 能力的 Client
 * 子路径。Plugin 页默认按正常 Next 开发方式书写：可用 `next/link`/`useRouter`；
 * `route()`（纯 target）经 `@community-go/admin-framework/target` 在 Server/Client
 * 均可 import。AdminRouteLink / useAdminNavigation / useAdminLocale 是项目增强
 * 能力（symbolic route、跨 Plugin 稳定引用），委托 Host Navigation/Locale Port，
 * 不替代 Next 原生导航。
 */

'use client';

/* Library entry同时导出 Provider、Hook，不是应用 Fast Refresh 边界。 */
/* eslint-disable react-refresh/only-export-components */

import { createContext, useContext, type ReactNode } from 'react';

import type { AdminRouteTarget } from './target-types';

export type { AdminRouteTarget } from './target-types';
export { route } from './target';
export type { AdminPluginDefinition } from './contract';

/** Plugin 层 Navigation Port：Host 在 Composition Root 注入完整实现。 */
export type AdminPluginNavigationPort = Readonly<{
  /** 将 Target 解析为 href；校验失败时抛错（保持失败语义，不静默）。 */
  resolveHref: (target: AdminRouteTarget) => string;
  navigate: (href: string) => void;
  replace: (href: string) => void;
  renderLink: (props: AdminPluginPortLinkProps) => ReactNode;
}>;

/** Port 内部 Link 渲染契约：href 由 Port 从 Target 解析。 */
export type AdminPluginPortLinkProps = Readonly<{
  href: string;
  target: AdminRouteTarget;
  children: ReactNode;
  className?: string;
  ariaLabel?: string;
  title?: string;
  onNavigate?: () => void;
}>;

/** Plugin 使用的 Link props：只接收 target，不手写 href。 */
export type AdminPluginLinkProps = Readonly<{
  target: AdminRouteTarget;
  children: ReactNode;
  className?: string;
  ariaLabel?: string;
  title?: string;
  onNavigate?: () => void;
}>;

export const AdminPluginNavigationContext = createContext<AdminPluginNavigationPort | null>(null);

/** Host 装配 Plugin Navigation Port；必须在 Root Provider 中只安装一次。 */
export function AdminPluginNavigationProvider({
  port,
  children,
}: Readonly<{ port: AdminPluginNavigationPort; children: ReactNode }>) {
  return (
    <AdminPluginNavigationContext.Provider value={port}>
      {children}
    </AdminPluginNavigationContext.Provider>
  );
}

function usePluginNavigationPort(): AdminPluginNavigationPort {
  const port = useContext(AdminPluginNavigationContext);
  if (!port) {
    throw new Error(
      'AdminPluginNavigationProvider 未安装：Plugin Navigation Port 属于 application runtime context。',
    );
  }
  return port;
}

/* ------------------------------------------------------------------ */
/* Admin Locale Port（Host capability 注入；Plugin 经 useAdminLocale 读写 locale） */
/* ------------------------------------------------------------------ */

/** Plugin 层 Locale Port：Host 在 Composition Root 注入实现（读写当前 locale）。 */
export type AdminLocalePort = Readonly<{
  locale: string;
  changeLocale: (locale: string) => void;
}>;

export const AdminLocaleContext = createContext<AdminLocalePort | null>(null);

/** Host 装配 Plugin Locale Port；必须在 Root Provider 中只安装一次。 */
export function AdminLocaleProvider({
  port,
  children,
}: Readonly<{ port: AdminLocalePort; children: ReactNode }>) {
  return <AdminLocaleContext.Provider value={port}>{children}</AdminLocaleContext.Provider>;
}

/** 读取当前 locale；读写委托 Host Locale Port。 */
export function useAdminLocale(): AdminLocalePort {
  const port = useContext(AdminLocaleContext);
  if (!port) {
    throw new Error(
      'AdminLocaleProvider 未安装：Plugin Locale Port 属于 application runtime context。',
    );
  }
  return port;
}

/** imperative navigation：navigate(target) / replace(target) 委托 Host Navigation Port。 */
export function useAdminNavigation() {
  const port = usePluginNavigationPort();
  return {
    navigate: (target: AdminRouteTarget) => port.navigate(port.resolveHref(target)),
    replace: (target: AdminRouteTarget) => port.replace(port.resolveHref(target)),
    href: (target: AdminRouteTarget) => port.resolveHref(target),
  } as const;
}

/** AdminRouteLink：渲染真实导航链接，点击委托 Host Navigation Port。 */
export function AdminRouteLink({
  target,
  children,
  className,
  ariaLabel,
  title,
  onNavigate,
}: Readonly<AdminPluginLinkProps>) {
  const port = usePluginNavigationPort();
  const href = port.resolveHref(target);
  return (
    <>
      {port.renderLink({
        href,
        target,
        children,
        ...(className ? { className } : {}),
        ...(ariaLabel ? { ariaLabel } : {}),
        ...(title ? { title } : {}),
        ...(onNavigate ? { onNavigate } : {}),
      })}
    </>
  );
}
