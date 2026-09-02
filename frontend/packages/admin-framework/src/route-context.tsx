/**
 * Admin Framework —— Route Context。
 *
 * Route Context = 当前被选中的 Route（routeId + resolved params）。
 * 由每个 Generated Route Entry 在挂载时发布一次；Framework / Shell 只读，
 * 不承担 history、pathname 解析或 Router 职责。
 */

'use client';

/* Library entry同时导出 Provider 与 Hook，不是应用 Fast Refresh 边界。 */
/* eslint-disable react-refresh/only-export-components */

import { createContext, useContext, type ReactNode } from 'react';

export type AdminRouteContextValue = Readonly<{
  routeId: string;
  params: Readonly<Record<string, string>>;
}>;

export const AdminRouteContext = createContext<AdminRouteContextValue | null>(null);

/** Generated Route Entry 发布当前 Route Context；必须恰好包裹所属 Route 内容。 */
export function AdminRouteContextProvider({
  value,
  children,
}: Readonly<{ value: AdminRouteContextValue; children: ReactNode }>) {
  return <AdminRouteContext.Provider value={value}>{children}</AdminRouteContext.Provider>;
}

/** 读取当前 Route Context；在 Entry 外使用返回 null。 */
export function useAdminRouteContext(): AdminRouteContextValue | null {
  return useContext(AdminRouteContext);
}
