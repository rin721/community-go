import type { Metadata } from 'next';
import type { ReactNode } from 'react';

import { AppErrorBoundary } from '../host/error-boundary';
import { AppProviders } from '../host/providers';
import { AppShell } from '../shell/app-shell';
import '../styles.css';

// App Router 要求 layout 默认导出组件的同时导出 metadata；该导出由框架消费，不参与 Fast Refresh。
/* eslint-disable react-refresh/only-export-components */
export const metadata: Metadata = {
  title: 'Community Console',
  description: 'Community Go 新一代统一前端基座与 Design System 工作台',
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="zh-CN" data-theme="light">
      <body>
        <AppErrorBoundary>
          <AppProviders>
            <AppShell>{children}</AppShell>
          </AppProviders>
        </AppErrorBoundary>
      </body>
    </html>
  );
}
