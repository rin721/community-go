'use client';

import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Card, CardContent } from '@community-go/ui-adapter/card';
import { StateSurface } from '@community-go/ui-adapter/state-surface';
import { OctagonAlert } from 'lucide-react';

import { i18n } from '../i18n/i18n';

type ErrorBoundaryState = { hasError: boolean };

export class AppErrorBoundary extends Component<{ children: ReactNode }, ErrorBoundaryState> {
  override state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  override componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('frontend_root_boundary', {
      errorName: error.name,
      componentStack: info.componentStack,
    });
  }

  override render() {
    if (this.state.hasError) {
      return (
        <main className="grid min-h-screen place-items-center bg-canvas p-6 text-ink">
          <Card>
            <CardContent>
              <div className="max-w-lg">
                <p className="mb-3 text-sm font-semibold text-danger">
                  {i18n.t('common.rootErrorEyebrow')}
                </p>
                <StateSurface
                  compact
                  actionLabel={i18n.t('common.reload')}
                  description={i18n.t('common.rootErrorDescription')}
                  icon={<OctagonAlert className="size-5" />}
                  state="error"
                  title={i18n.t('common.rootErrorTitle')}
                  onAction={() => window.location.reload()}
                />
              </div>
            </CardContent>
          </Card>
        </main>
      );
    }
    return this.props.children;
  }
}
