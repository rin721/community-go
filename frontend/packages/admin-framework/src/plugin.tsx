/**
 * Admin Framework —— Plugin API。
 *
 * `@community-go/admin-framework/plugin` 是 Plugin 唯一允许导入的 Framework 子路径。
 * Plugin 使用 route() 引用应用 Route，不手写 URL；AdminRouteLink 与 imperative
 * navigation 委托 Root Provider 中的 Host Navigation Port。
 */

'use client';

/* Library entry同时导出 Provider、Hook、类型与 route()，不是应用 Fast Refresh 边界。 */
/* eslint-disable react-refresh/only-export-components */

import { createContext, useContext, type ReactNode } from 'react';

import type { AdminRouteTarget } from './target-types';

export type { AdminRouteTarget } from './target-types';
export { route } from './target';
export type { AdminRouteMeta, AdminPluginDefinition } from './contract';

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

/* ------------------------------------------------------------------ */
/* 稳定 Route Module Contracts（Plugin 不直接暴露 Next Module API）     */
/* ------------------------------------------------------------------ */

export type AdminRouteParams = Readonly<Record<string, string>>;

/** 标准错误表示；不暴露 Next reset。 */
export type AdminRouteError = Readonly<{
  message: string;
  code?: string;
}>;

export type AdminRoutePageProps<Params extends AdminRouteParams = AdminRouteParams> = Readonly<{
  params: Params;
  routeId: string;
}>;

export type AdminRouteLayoutProps<Params extends AdminRouteParams = AdminRouteParams> = Readonly<{
  params: Params;
  routeId: string;
  children: ReactNode;
}>;

export type AdminRouteLoadingProps<Params extends AdminRouteParams = AdminRouteParams> = Readonly<{
  params: Params;
  routeId: string;
}>;

export type AdminRouteErrorProps = Readonly<{
  error: AdminRouteError;
  retry: () => void;
}>;

export type AdminRoutePageModule<Params extends AdminRouteParams = AdminRouteParams> = Readonly<{
  default: (props: AdminRoutePageProps<Params>) => ReactNode;
}>;

export type AdminRouteLayoutModule<Params extends AdminRouteParams = AdminRouteParams> = Readonly<{
  default: (props: AdminRouteLayoutProps<Params>) => ReactNode;
}>;

export type AdminRouteLoadingModule<Params extends AdminRouteParams = AdminRouteParams> = Readonly<{
  default: (props: AdminRouteLoadingProps<Params>) => ReactNode;
}>;

export type AdminRouteErrorModule = Readonly<{
  default: (props: AdminRouteErrorProps) => ReactNode;
}>;
