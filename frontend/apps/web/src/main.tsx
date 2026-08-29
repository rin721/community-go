import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router';

import { AppErrorBoundary } from './app/error-boundary';
import { AppProviders } from './app/providers';
import { router } from './router';
import './i18n/i18n';
import './styles.css';

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('缺少前端挂载节点 #root');
}

createRoot(rootElement).render(
  <StrictMode>
    <AppErrorBoundary>
      <AppProviders>
        <RouterProvider router={router} />
      </AppProviders>
    </AppErrorBoundary>
  </StrictMode>,
);
